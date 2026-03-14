import { useState } from 'react';
import './index.css';
import ManagerLogin from './components/ManagerLogin';
import ManagerDashboard from './components/ManagerDashboard';
import ExchangeProgram from './components/ExchangeProgram';
import ExchangeBinViewer from './components/ExchangeBinViewer';

function App() {
  const [view, setView] = useState<'login' | 'dashboard' | 'exchange' | 'exchange_bin_viewer'>('login');

  return (
    <div className="app-container">
      {view === 'login' && (
        <ManagerLogin onLogin={() => setView('dashboard')} />
      )}
      
      {view === 'dashboard' && (
        <ManagerDashboard 
          onLogout={() => setView('login')} 
          onSelectProgram={(program) => {
            if (program === 'exchange') setView('exchange');
            if (program === 'exchange_bin_viewer') setView('exchange_bin_viewer');
          }}
        />
      )}
      
      {view === 'exchange' && (
        <ExchangeProgram onBack={() => setView('dashboard')} />
      )}

      {view === 'exchange_bin_viewer' && (
        <ExchangeBinViewer onBack={() => setView('dashboard')} />
      )}
    </div>
  );
}

export default App;

