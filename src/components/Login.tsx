import { useState } from 'react';
import { ArrowRight, Key, Phone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onLogin: (mobile: string) => void;
  onNavigateRegister: () => void;
}

export default function Login({ onLogin, onNavigateRegister }: LoginProps) {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Generate a mock OTP (In production, trigger SMS API here)
      const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
      
      const { error: dbError } = await supabase
        .from('otp_verification')
        .insert({
          mobile,
          otp_code: mockOtp,
          purpose: 'LOGIN'
        });

      if (dbError) throw dbError;

      // Show OTP in an alert for testing purposes since we don't have an SMS gateway
      alert(`DEMO MODE: Your OTP is ${mockOtp}`);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Find the pending OTP
      const { data, error: fetchError } = await supabase
        .from('otp_verification')
        .select('*')
        .eq('mobile', mobile)
        .eq('otp_code', otp)
        .eq('purpose', 'LOGIN')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !data) {
        throw new Error('Invalid or expired OTP.');
      }

      // Mark as verified
      await supabase
        .from('otp_verification')
        .update({ status: 'VERIFIED' })
        .eq('id', data.id);

      // Check if user exists in customers table
      const { data: customer } = await supabase
        .from('customers')
        .select('mobile')
        .eq('mobile', mobile)
        .single();

      if (!customer) {
        // If not, redirect to register
        onNavigateRegister();
      } else {
        onLogin(mobile);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
      
      <div style={{ position: 'absolute', top: '-10%', left: '-20%', width: '300px', height: '300px', background: 'var(--primary-color)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3, zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-20%', width: '300px', height: '300px', background: 'var(--secondary-color)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3, zIndex: 0 }} />

      <div style={{ zIndex: 1, marginTop: '15vh', marginBottom: '40px', textAlign: 'center' }} className="animate-fade-in">
        <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '8px', letterSpacing: '-1px' }}>
          <span className="text-gradient">Trends</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Your digital loyalty wallet</p>
      </div>

      <div className="glass-panel animate-fade-in" style={{ padding: '32px 24px', borderRadius: 'var(--radius-lg)', zIndex: 1 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px' }}>
          {step === 'mobile' ? 'Welcome back' : 'Enter OTP'}
        </h2>
        
        {step === 'mobile' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Phone size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input 
                type="tel" 
                className="input-field" 
                placeholder="Mobile Number" 
                style={{ paddingLeft: '48px' }}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
            {error && <div style={{ color: 'var(--accent-color)', fontSize: '0.9rem' }}>{error}</div>}
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '8px' }}>
              {loading ? 'Sending...' : 'Get OTP'}
              <ArrowRight size={20} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '-12px' }}>Sent to {mobile}</p>
            <div style={{ position: 'relative' }}>
              <Key size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="4-digit OTP" 
                style={{ paddingLeft: '48px', letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center' }}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={4}
              />
            </div>
            {error && <div style={{ color: 'var(--accent-color)', fontSize: '0.9rem' }}>{error}</div>}
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '8px' }}>
              {loading ? 'Verifying...' : 'Verify & Login'}
              <ArrowRight size={20} />
            </button>
            <button 
              type="button" 
              onClick={() => { setStep('mobile'); setOtp(''); setError(''); }} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', marginTop: '12px' }}
            >
              Change Mobile Number
            </button>
          </form>
        )}
      </div>
      
      <div style={{ zIndex: 1, marginTop: 'auto', textAlign: 'center', paddingTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Don't have an account? <span onClick={onNavigateRegister} style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}>Register now</span>
      </div>

    </div>
  );
}
