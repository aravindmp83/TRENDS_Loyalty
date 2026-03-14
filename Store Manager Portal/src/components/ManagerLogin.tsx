import { useState } from 'react';
import { Briefcase, Lock, User } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export default function ManagerLogin({ onLogin }: LoginProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !password) {
      setError('Please enter your Employee ID and Password.');
      return;
    }
    setError('');
    // Mock Auth
    onLogin();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', backgroundColor: 'var(--surface-color-light)' }}>
      
      <div className="animate-fade-in" style={{ marginTop: '10vh', marginBottom: '40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', background: 'white', padding: '16px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', marginBottom: '16px' }}>
          <Briefcase size={32} color="var(--primary-color)" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          TRENDS<span style={{ color: 'var(--secondary-color)' }}>Staff</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '4px' }}>Store Manager Portal</p>
      </div>

      <div className="panel animate-fade-in" style={{ padding: '32px 24px', animationDelay: '0.1s' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>Authentication Required</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <User size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Employee ID" 
              style={{ paddingLeft: '48px' }}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              className="input-field" 
              placeholder="Password" 
              style={{ paddingLeft: '48px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginTop: '-4px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
            Access Portal
          </button>
        </form>
      </div>

      <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Restricted Access. Authorized personnel only.
      </div>
    </div>
  );
}
