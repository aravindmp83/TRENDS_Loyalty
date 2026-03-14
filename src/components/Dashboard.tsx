import { useState, useEffect } from 'react';
import { Bell, Gift, LogOut, Tag, Ticket, Zap, ArrowRight, ShieldCheck, CheckCircle, XCircle, ShoppingCart, Archive, FileText } from 'lucide-react';
import CouponGenerator from './CouponGenerator';
import { supabase } from '../lib/supabaseClient';

interface DashboardProps {
  userMobile: string;
  onLogout: () => void;
  onShowExchange: () => void;
  onShowBinStatus: () => void;
  onShowStatement: () => void;
  onShowActiveCoupons: () => void;
  onNavigateSS26: () => void;
}

const STORE_OFFERS = [
  { id: 1, title: 'Super Weekend Sale', description: 'Up to 70% off across all categories in-store.', icon: <Zap size={24} className="text-secondary" /> },
  { id: 2, title: 'Members Preview', description: 'Early access to the new Fall Collection.', icon: <Gift size={24} className="text-primary" /> },
];

export default function Dashboard({ userMobile, onLogout, onShowExchange, onShowBinStatus, onShowStatement, onShowActiveCoupons, onNavigateSS26 }: DashboardProps) {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [exchangeBalance, setExchangeBalance] = useState(0);
  const [userName, setUserName] = useState('Valued Customer');
  const [showGenerator, setShowGenerator] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const banners = [
    {
      id: 0,
      title: "Great Fashion Exchange",
      subtitle: "Trends Presents",
      image: "", // We'll handle this with a gradient
      action: onShowExchange,
      buttonText: "Join Exchange",
      isExchange: true
    },
    {
      id: 1,
      title: "Festive Splendor",
      subtitle: "Luxury Ethnic Wear",
      image: "/festive-banner.png",
      action: () => {},
      buttonText: "Shop Collection"
    },
    {
      id: 2,
      title: "SS26 Avant-Garde",
      subtitle: "The Future of Fashion",
      image: "/ss26-banner.png",
      action: onNavigateSS26,
      buttonText: "Explore SS26"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [banners.length]);
  const [binReviewedItems, setBinReviewedItems] = useState<{ category: string; status: string; finalValue: number }[]>([]);

  useEffect(() => {
    if (!userMobile) return;

    // Fetch initial profile
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('mobile', userMobile)
        .single();
      
      if (data) {
        setUserName(data.name || 'Valued Customer');
        setExchangeBalance(data.exchange_balance || 0);
      }
    };

    // Fetch initial coupons
    const fetchCoupons = async () => {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('customer_mobile', userMobile)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });
      
      if (data) setCoupons(data);
    };

    // Fetch persistent verification code or create one
    const fetchVerificationCode = async () => {
      const { data: existing } = await supabase
        .from('otp_verification')
        .select('otp_code')
        .eq('mobile', userMobile)
        .eq('status', 'PENDING')
        .eq('purpose', 'EXCHANGE_VERIFY')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (existing) {
        setVerificationCode(existing.otp_code);
      } else {
        const newCode = '1234'; 
        await supabase.from('otp_verification').insert({ 
          mobile: userMobile, 
          otp_code: newCode, 
          purpose: 'EXCHANGE_VERIFY' 
        });
        setVerificationCode(newCode);
      }
    };

    fetchProfile();
    fetchCoupons();
    fetchVerificationCode();

    // Subscribe to balance changes
    const customerSub = supabase
      .channel('customer-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customers', filter: `mobile=eq.${userMobile}` }, (_payload) => {
        setExchangeBalance(_payload.new.exchange_balance ?? 0);
        setUserName(_payload.new.name || 'Valued Customer');
        fetchProfile();
      })
      .subscribe();

    // Subscribe to new coupons
    const couponsSub = supabase
      .channel('coupons-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons', filter: `customer_mobile=eq.${userMobile}` }, (_payload) => {
        fetchCoupons();
      })
      .subscribe();

    // Subscribe to Verification Code requests from Store Manager
    const verificationSub = supabase
      .channel(`verification-updates-${userMobile}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'otp_verification', 
        filter: `mobile=eq.${userMobile}` 
      }, (payload) => {
        if (payload.new.purpose === 'EXCHANGE_VERIFY' && payload.new.status === 'PENDING') {
          setVerificationCode(payload.new.otp_code);
          setShowVerificationModal(true);
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'otp_verification', 
        filter: `mobile=eq.${userMobile}` 
      }, (payload) => {
        if (payload.new.purpose === 'EXCHANGE_VERIFY' && payload.new.status === 'VERIFIED') {
          setShowVerificationModal(false);
        }
      })
      .subscribe();

    // Subscribe to exchange bin item decisions
    const binSub = supabase
      .channel(`bin-updates-${userMobile}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exchange_bin_items', filter: `customer_mobile=eq.${userMobile}` }, (payload) => {
        if (payload.new.manager_status !== 'PENDING') {
          setBinReviewedItems((prev) => [
            ...prev,
            { category: payload.new.ai_category, status: payload.new.manager_status, finalValue: payload.new.final_value }
          ]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(customerSub);
      supabase.removeChannel(couponsSub);
      supabase.removeChannel(verificationSub);
      supabase.removeChannel(binSub);
    };
  }, [userMobile]);

  const handleGenerate = async (cost: number, newCoupons: any[]) => {
    // 1. Update DB balance
    const { error: balanceError } = await supabase
      .from('customers')
      .update({ exchange_balance: exchangeBalance - cost })
      .eq('mobile', userMobile);
    
    if (balanceError) {
      console.error(balanceError);
      return;
    }

    // 2. Insert new coupons
    const couponsToInsert = newCoupons.map(c => ({
      customer_mobile: userMobile,
      title: c.title,
      description: c.description,
      code: c.code,
      value: c.value,
      min_purchase: c.minPurchase,
      expiry: c.expiry,
      status: 'ACTIVE'
    }));

    await supabase.from('coupons').insert(couponsToInsert);
  };

  if (showGenerator) {
    return (
      <CouponGenerator 
        availableBalance={exchangeBalance} 
        onBack={() => setShowGenerator(false)} 
        onGenerate={handleGenerate} 
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto', position: 'relative' }}>
      
      {/* Verification Code Modal (Triggered by Manager) */}
      {showVerificationModal && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(12, 13, 20, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }} className="animate-fade-in">
          <div style={{ background: 'rgba(6, 214, 160, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '24px', color: 'var(--success-color)' }}>
            <ShieldCheck size={48} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>Verification Required</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>A store manager needs your verification code to process an exchange. Please share this PIN with them.</p>
          
          <div style={{ background: 'var(--surface-color)', padding: '24px', borderRadius: 'var(--radius-md)', border: '2px dashed var(--success-color)', width: '100%' }}>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '8px', margin: 0 }}>{verificationCode}</h1>
          </div>
          <p style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Waiting for manager to confirm...</p>
          <button onClick={() => setShowVerificationModal(false)} style={{ marginTop: '32px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>Minimize</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Welcome back,</p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{userName}</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass-panel" style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <Bell size={20} />
          </button>
          <button className="glass-panel" onClick={onLogout} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', cursor: 'pointer' }}>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Featured Banner Carousel (Everything unified here) */}
      <div 
        style={{ position: 'relative', marginBottom: '24px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '240px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
        onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
        onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
        onTouchEnd={() => {
          if (!touchStart || !touchEnd) return;
          const distance = touchStart - touchEnd;
          const isLeftSwipe = distance > 50;
          const isRightSwipe = distance < -50;
          if (isLeftSwipe) {
            setCurrentBanner((prev) => (prev + 1) % banners.length);
          } else if (isRightSwipe) {
            setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
          }
          setTouchStart(null);
          setTouchEnd(null);
        }}
      >
        {banners.map((banner, idx) => (
          <div
            key={banner.id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: banner.isExchange 
                ? 'linear-gradient(135deg, #0a1628 0%, #1a3561 55%, #0a1628 100%)'
                : `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.8)), url(${banner.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: idx === currentBanner ? 1 : 0,
              transition: 'opacity 0.8s ease-in-out',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '24px',
              pointerEvents: idx === currentBanner ? 'auto' : 'none'
            }}
          >
            {banner.isExchange && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(230,57,70,0.15)' }} />
                <div style={{ position: 'absolute', right: '20px', bottom: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
              </div>
            )}
            
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: banner.isExchange ? '#94a3b8' : 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px', position: 'relative' }}>{banner.subtitle}</h4>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginBottom: '12px', lineHeight: 1.1, position: 'relative' }}>
              {banner.id === 0 ? <>GREAT FASHION<br />EXCHANGE</> : banner.title}
            </h3>
            
            {banner.isExchange && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', position: 'relative' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e63946', padding: '2px 8px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textDecoration: 'line-through', color: 'rgba(255,255,255,0.7)' }}>OLD OUT</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'white' }}>NEW IN</span>
                </div>
              </div>
            )}

            <button 
              onClick={banner.action}
              className="btn btn-primary" 
              style={{ 
                width: 'fit-content', 
                padding: '10px 24px', 
                background: banner.id === 0 ? 'var(--primary-color)' : (banner.id === 1 ? 'var(--primary-color)' : 'linear-gradient(45deg, #00f2ff, #0061ff)'), 
                border: 'none',
                position: 'relative'
              }}
            >
              {banner.buttonText}
            </button>
          </div>
        ))}
        {/* Carousel Dots */}
        <div style={{ position: 'absolute', bottom: '16px', right: '24px', display: 'flex', gap: '8px' }}>
          {banners.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentBanner(idx)}
              style={{
                width: idx === currentBanner ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: idx === currentBanner ? 'white' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Quick Links: Exchange Bin Status + Statement */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={onShowBinStatus}
          className="glass-panel"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--secondary-color)' }}
        >
          <Archive size={18} color="var(--secondary-color)" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>Exchange Bin</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>View items & status</p>
          </div>
        </button>
        <button
          onClick={onShowStatement}
          className="glass-panel"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-color)' }}
        >
          <FileText size={18} color="var(--primary-color)" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>Statement</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Coupon history</p>
          </div>
        </button>
      </div>

      {/* Exchange Bin Manager Decision Notification */}
      {binReviewedItems.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '16px', marginBottom: '16px', borderLeft: '4px solid var(--secondary-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <ShoppingCart size={20} color="var(--secondary-color)" />
            <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Exchange Bin Update</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Your garments have been reviewed by the store manager:</p>
          {binReviewedItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '8px 12px', background: item.status === 'APPROVED' ? 'rgba(6,214,160,0.1)' : 'rgba(255,0,110,0.08)', borderRadius: 'var(--radius-sm)' }}>
              {item.status === 'APPROVED' ? <CheckCircle size={16} color="var(--success-color)" /> : <XCircle size={16} color="var(--accent-color)" />}
              <p style={{ flex: 1, fontSize: '0.88rem' }}>{item.category}</p>
              <span style={{ fontWeight: 700, color: item.status === 'APPROVED' ? 'var(--success-color)' : 'var(--accent-color)', fontSize: '0.9rem' }}>
                {item.status === 'APPROVED' ? `+₹${item.finalValue}` : 'Rejected'}
              </span>
            </div>
          ))}
          <button onClick={() => setBinReviewedItems([])} style={{ marginTop: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Dismiss</button>
        </div>
      )}

      {/* Verification Code Display */}
      <div className="glass-panel animate-fade-in" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: '16px', borderLeft: '4px solid var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>My Verification Code</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Share with manager for store actions</p>
        </div>
        <div style={{ background: 'rgba(6, 214, 160, 0.1)', color: 'var(--success-color)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--success-color)' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '2px' }}>{verificationCode || '....'}</span>
        </div>
      </div>

      {/* The Great Fashion Exchange Wallet */}
      <div className="glass-panel animate-fade-in" style={{ padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '32px', borderLeft: '4px solid var(--accent-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Exchange Balance</h4>
            <h3 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '4px' }}>₹{exchangeBalance}</h3>
          </div>
          <div style={{ background: 'rgba(255, 0, 110, 0.1)', padding: '12px', borderRadius: '50%' }}>
            <Gift size={24} color="var(--accent-color)" />
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Balance generated from your old garments!</p>
        <button 
          onClick={() => setShowGenerator(true)}
          className="btn btn-secondary" 
          disabled={exchangeBalance < 100}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface-color)', borderColor: exchangeBalance < 100 ? 'var(--border-color-strong)' : 'var(--accent-color)', opacity: exchangeBalance < 100 ? 0.5 : 1 }}
        >
          <span style={{ color: exchangeBalance < 100 ? 'var(--text-muted)' : 'var(--accent-color)', fontWeight: 600 }}>Convert to Vouchers</span>
          <ArrowRight size={18} color={exchangeBalance < 100 ? 'var(--text-muted)' : 'var(--accent-color)'} />
        </button>
      </div>

      {/* Active Coupons Summary Card */}
      <div
        onClick={onShowActiveCoupons}
        className="glass-panel animate-fade-in"
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          borderLeft: '4px solid var(--primary-color)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div style={{ background: 'rgba(123,44,191,0.15)', padding: '12px', borderRadius: '50%', color: 'var(--primary-color)', flexShrink: 0 }}>
          <Ticket size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Your Active Coupons</h4>
          {coupons.length > 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {coupons.length} coupon{coupons.length !== 1 ? 's' : ''} · Total value ₹{coupons.reduce((s: number, c: any) => s + (c.value || 0), 0)}
            </p>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>No active coupons yet. Convert your balance!</p>
          )}
        </div>
        <ArrowRight size={20} color="var(--primary-color)" />
      </div>

      {/* Store Offers (always shown) */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={20} color="var(--primary-color)" /> Current offers at store
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px' }}>
          {STORE_OFFERS.map(offer => (
            <div key={offer.id} className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{offer.icon}</div>
              <div>
                <h5 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>{offer.title}</h5>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{offer.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
