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
import { supabase } from './lib/supabaseClient';

function App() {
  const [view, setView] = useState<'login' | 'register' | 'dashboard' | 'exchange' | 'history' | 'bin_status' | 'statement' | 'active_coupons' | 'ss26_collection'>('login');
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
    </div>
  );
}

export default App;
