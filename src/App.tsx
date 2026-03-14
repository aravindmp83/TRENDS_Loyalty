import { useState, useEffect } from 'react';
import './index.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import CustomerExchange from './components/CustomerExchange';
import ExpiredCoupons from './components/ExpiredCoupons';
import ExchangeBinStatus from './components/ExchangeBinStatus';
import CouponStatement from './components/CouponStatement';
import ActiveCoupons from './components/ActiveCoupons';
import SS26Collection from './components/SS26Collection';
import ExchangeGallery from './components/ExchangeGallery';
import { supabase } from './lib/supabaseClient';
import { Home, Image as ImageIcon, Ticket, User as UserIcon } from 'lucide-react';

function App() {
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'exchange' | 'history' | 'bin_status' | 'statement' | 'active_coupons' | 'ss26_collection' | 'gallery'>('login');
  const [userMobile, setUserMobile] = useState<string>('');
  const [allCoupons, setAllCoupons] = useState<any[]>([]);

  // Globally track coupons for history and active views
  useEffect(() => {
    if (!userMobile) return;
    
    const fetchAllCoupons = async () => {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('customer_mobile', userMobile)
        .order('created_at', { ascending: false });
      if (data) setAllCoupons(data);
    };

    fetchAllCoupons();

    const sub = supabase
      .channel('coupons-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons', filter: `customer_mobile=eq.${userMobile}` }, () => {
        fetchAllCoupons();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [userMobile]);

  const handleLogin = (mobile: string) => {
    setUserMobile(mobile);
    setView('dashboard');
  };

  const handleRegister = (mobile: string) => {
    setUserMobile(mobile);
    setView('dashboard');
  };

  const handleLogout = () => {
    setUserMobile('');
    setView('login');
  };

  return (
    <div className="app-container">
      {view === 'dashboard' && (
        <Dashboard
          userMobile={userMobile}
          onLogout={handleLogout}
          onShowExchange={() => setView('exchange')}
          onShowBinStatus={() => setView('bin_status')}
          onShowStatement={() => setView('statement')}
          onShowActiveCoupons={() => setView('active_coupons')}
          onNavigateSS26={() => setView('ss26_collection')}
        />
      )}

      {view === 'exchange' && (
        <CustomerExchange
          userMobile={userMobile}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'history' && (
        <ExpiredCoupons
          coupons={allCoupons}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'bin_status' && (
        <ExchangeBinStatus
          userMobile={userMobile}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'statement' && (
        <CouponStatement
          userMobile={userMobile}
          onBack={() => setView('dashboard')}
          onRedeem={() => setView('active_coupons')}
        />
      )}

      {view === 'active_coupons' && (
        <ActiveCoupons
          coupons={allCoupons}
          onBack={() => setView('dashboard')}
          onShowStatement={() => setView('statement')}
        />
      )}

      {view === 'gallery' && (
        <ExchangeGallery
          userMobile={userMobile}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'ss26_collection' && (
        <SS26Collection
          onBack={() => setView('dashboard')}
        />
      )}
      
      {view === 'login' && (
        <Login 
          onLogin={handleLogin} 
          onNavigateRegister={() => setView('register')} 
        />
      )}
      
      {view === 'register' && (
        <Register 
          onRegister={handleRegister} 
          onBack={() => setView('login')} 
        />
      )}

      {/* Bottom Navigation Bar */}
      {userMobile && !['login', 'register', 'exchange'].includes(view) && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(12, 13, 20, 0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-around', padding: '12px 0 24px', zIndex: 100 }}>
          <button 
            onClick={() => setView('dashboard')}
            style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: view === 'dashboard' ? 'var(--primary-color)' : 'var(--text-muted)' }}
          >
            <Home size={22} color={view === 'dashboard' ? 'var(--primary-color)' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.65rem', fontWeight: view === 'dashboard' ? 700 : 500 }}>Home</span>
          </button>
          <button 
            onClick={() => setView('gallery')}
            style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: view === 'gallery' ? 'var(--primary-color)' : 'var(--text-muted)' }}
          >
            <ImageIcon size={22} color={view === 'gallery' ? 'var(--primary-color)' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.65rem', fontWeight: view === 'gallery' ? 700 : 500 }}>Gallery</span>
          </button>
          <button 
            onClick={() => setView('active_coupons')}
            style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: view === 'active_coupons' ? 'var(--primary-color)' : 'var(--text-muted)' }}
          >
            <Ticket size={22} color={view === 'active_coupons' ? 'var(--primary-color)' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.65rem', fontWeight: view === 'active_coupons' ? 700 : 500 }}>Coupons</span>
          </button>
          <button 
            onClick={() => setView('statement')}
            style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: view === 'statement' ? 'var(--primary-color)' : 'var(--text-muted)' }}
          >
            <UserIcon size={22} color={view === 'statement' ? 'var(--primary-color)' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.65rem', fontWeight: view === 'statement' ? 700 : 500 }}>Profile</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
