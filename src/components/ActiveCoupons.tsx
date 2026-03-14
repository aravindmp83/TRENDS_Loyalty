import { useState } from 'react';
import { ArrowLeft, Ticket, Clock, AlertCircle, CheckCircle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ActiveCouponsProps {
  coupons: any[];
  onBack: () => void;
  onShowStatement: () => void;
}

// Parse expiry string like "Expires in 30 days" or an ISO date string
function parseDaysLeft(expiry: string | undefined, createdAt: string): number {
  if (!expiry) return 0;
  // If expiry looks like "Expires in N days"
  const match = expiry.match(/(\d+)\s*day/i);
  if (match) {
    const days = parseInt(match[1], 10);
    const created = new Date(createdAt).getTime();
    const expiryDateMs = created + (days * 86400000);
    const now = Date.now();
    return Math.max(0, Math.ceil((expiryDateMs - now) / 86400000));
  }
  // Try as ISO date
  const d = new Date(expiry);
  if (!isNaN(d.getTime())) {
    return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
  }
  return 30; // fallback
}

function getDaysLeftUrgency(days: number) {
  if (days <= 1) return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', urgent: true };
  if (days <= 5) return { color: '#f97316', bg: 'rgba(249,115,22,0.12)', urgent: false };
  if (days <= 10) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', urgent: false };
  return { color: 'var(--text-muted)', bg: 'transparent', urgent: false };
}

export default function ActiveCoupons({ coupons: initialCoupons, onBack, onShowStatement }: ActiveCouponsProps) {
  const [redeemingCouponId, setRedeemingCouponId] = useState<string | null>(null);
  const [empIdInput, setEmpIdInput] = useState('');
  const [invoiceInput, setInvoiceInput] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [localCoupons, setLocalCoupons] = useState(initialCoupons);

  const activeCoupons = localCoupons.filter(c => c.status === 'ACTIVE');

  const handleRedeemConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedId = empIdInput.trim().toUpperCase();
    const formattedInvoice = invoiceInput.trim();
    
    if (!formattedId.startsWith('P50') || formattedId.length < 5) {
      setRedeemError('Invalid Cashier Employee ID. Must start with P50...');
      return;
    }
    if (!formattedInvoice) {
      setRedeemError('Please enter the Invoice Number.');
      return;
    }
    setRedeemError('');

    const { error } = await supabase
      .from('coupons')
      .update({ 
        status: 'REDEEMED', 
        redeemed_by_employee_id: formattedId,
        invoice_number: formattedInvoice,
        redeemed_at: new Date().toISOString()
      })
      .eq('id', redeemingCouponId);

    if (!error) {
      // Update local state to reflect redemption immediately
      setLocalCoupons(prev => prev.filter(c => c.id !== redeemingCouponId));
      setRedeemingCouponId(null);
      setEmpIdInput('');
      setInvoiceInput('');
    } else {
      setRedeemError(error.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-color)', position: 'relative' }}>
      
      {/* Handover Redemption Modal Overlay */}
      {redeemingCouponId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(12, 13, 20, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }} className="animate-fade-in">
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '24px', color: 'var(--accent-color)' }}>
            <LogOut size={48} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '12px' }}>Cashier Handover</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>Please handover your phone to the store cashier to authorize this redemption.</p>
          
          <form onSubmit={handleRedeemConfirm} className="panel" style={{ width: '100%', maxWidth: '400px', padding: '24px', background: 'var(--surface-color)', border: '1px solid var(--accent-color)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Staff Authorization</h3>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Employee ID (e.g. P5012)" 
              value={empIdInput}
              onChange={(e) => { setEmpIdInput(e.target.value); setRedeemError(''); }}
              style={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.2rem', marginBottom: '12px' }}
            />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Invoice Number" 
              value={invoiceInput}
              onChange={(e) => { setInvoiceInput(e.target.value); setRedeemError(''); }}
              style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '8px' }}
            />
            {redeemError && <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginBottom: '16px' }}>{redeemError}</p>}
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent-color)', marginTop: redeemError ? '0' : '8px' }}>
              Confirm Redemption
            </button>
          </form>

          <button onClick={() => { setRedeemingCouponId(null); setEmpIdInput(''); setRedeemError(''); }} style={{ marginTop: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Cancel Request
          </button>
        </div>
      )}
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', backdropFilter: 'blur(12px)', padding: '20px 24px 14px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Active Coupons</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeCoupons.length} coupon{activeCoupons.length !== 1 ? 's' : ''} available</p>
          </div>
        </div>
        {/* Statement link */}
        <button
          onClick={onShowStatement}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(123,44,191,0.1)', border: '1px solid rgba(123,44,191,0.3)', borderRadius: 'var(--radius-full)', padding: '8px 14px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
        >
          <CheckCircle size={14} color="var(--primary-color)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--primary-color)', fontWeight: 600 }}>
            To view your coupons history click here
          </span>
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {activeCoupons.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(123,44,191,0.1)', padding: '24px', borderRadius: '50%', color: 'var(--primary-color)' }}>
              <Ticket size={48} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Active Coupons</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '260px', lineHeight: 1.6 }}>
              Convert your exchange balance into vouchers to see them here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeCoupons.map((coupon, idx) => {
              const daysLeft = parseDaysLeft(coupon.expiry, coupon.created_at);
              const urgency = getDaysLeftUrgency(daysLeft);
              const addedDate = new Date(coupon.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div
                  key={coupon.id}
                  className="glass-panel animate-fade-in"
                  style={{ padding: '0', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', animationDelay: `${Math.min(idx, 5) * 0.08}s`, border: '1px solid var(--border-color)', overflow: 'hidden' }}
                >
                  <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{ background: 'rgba(123, 44, 191, 0.2)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'var(--primary-color)', flexShrink: 0 }}>
                      <Ticket size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>THE GREAT FASHION EXCHANGE</p>
                      <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>{coupon.title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{coupon.description}</p>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div style={{ background: 'white', padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', height: '36px', display: 'flex', gap: '2px', alignItems: 'stretch' }}>
                      {[...Array(60)].map((_, i) => (
                        <div key={i} style={{ flex: 1, backgroundColor: 'black', opacity: [0.15, 0.3].includes(i % 10) ? 0 : 1 }} />
                      ))}
                    </div>
                    <p style={{ marginTop: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'black', letterSpacing: '4px' }}>{coupon.code}</p>
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '12px 20px', background: 'var(--surface-color)', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-color)' }}>
                    {/* Date added */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📅 Added: {addedDate}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Min Purchase: ₹{coupon.min_purchase}</span>
                    </div>

                    {/* Days left urgency */}
                    <div style={{ background: urgency.bg, borderRadius: 'var(--radius-sm)', padding: urgency.urgent ? '8px 12px' : '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {urgency.urgent ? (
                        <>
                          <AlertCircle size={16} color={urgency.color} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: urgency.color }}>
                            You have only 1 day left to redeem. Do not miss the opportunity!
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock size={14} color={urgency.color} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: urgency.color }}>
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left to redeem
                          </span>
                        </>
                      )}
                    </div>

                    {/* REDEEM BUTTON */}
                    <button 
                      onClick={() => setRedeemingCouponId(coupon.id)}
                      className="btn btn-primary" 
                      style={{ width: '100%', marginTop: '4px', background: 'var(--primary-color)', height: '44px', fontWeight: 700 }}
                    >
                      Redeem Coupon
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
