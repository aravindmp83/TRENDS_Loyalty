import { useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, Calendar, Heart, Key, Mail, MapPin, Phone, ShoppingBag, Store, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface RegisterProps {
  onRegister: (mobile: string) => void;
  onBack: () => void;
}

export default function Register({ onRegister, onBack }: RegisterProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    dob: '',
    sex: '',
    address: '',
    occupation: '',
    maritalStatus: '',
    spouseDob: '',
    anniversary: '',
    preferredStore: '',
    preferences: [] as string[],
    kidsDob: ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePreference = (pref: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.includes(pref) 
        ? prev.preferences.filter(p => p !== pref) 
        : [...prev.preferences, pref]
    }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSendOtp = async () => {
    if (!formData.mobile || formData.mobile.length < 10) {
      setError('Please enter a valid mobile number in Step 1.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
      
      const { error: dbError } = await supabase
        .from('otp_verification')
        .insert({
          mobile: formData.mobile,
          otp_code: mockOtp,
          purpose: 'LOGIN'
        });

      if (dbError) throw dbError;

      alert(`DEMO MODE: Your OTP is ${mockOtp}`);
      nextStep();
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 3) {
      // Send OTP before final completion
      await handleSendOtp();
      return;
    }
    
    if (step === 4) {
      // Verify OTP and complete registration
      setError('');
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('otp_verification')
          .select('*')
          .eq('mobile', formData.mobile)
          .eq('otp_code', otp)
          .eq('purpose', 'LOGIN')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError || !data) {
          throw new Error('Invalid or expired OTP.');
        }

        await supabase
          .from('otp_verification')
          .update({ status: 'VERIFIED' })
          .eq('id', data.id);

        // Insert new customer into Supabase
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            mobile: formData.mobile,
            name: formData.name,
            dob: formData.dob,
            sex: formData.sex,
            address: formData.address,
            occupation: formData.occupation,
            preferences: formData.preferences,
            kids_dob: formData.kidsDob,
            marital_status: formData.maritalStatus,
            spouse_dob: formData.spouseDob,
            anniversary_date: formData.anniversary,
            exchange_balance: 0
          });

        if (insertError) {
          if (insertError.code === '23505') { // Unique constraint violation
            throw new Error('Mobile number is already registered. Please log in.');
          }
          throw insertError;
        }

        onRegister(formData.mobile);
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto' }}>
      
      {/* Dynamic Background Elements */}
      <div style={{ position: 'fixed', top: '-10%', left: '-20%', width: '300px', height: '300px', background: 'var(--primary-color)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.2, zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-20%', width: '300px', height: '300px', background: 'var(--secondary-color)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.2, zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ zIndex: 1, display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={step === 1 ? onBack : prevStep} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ marginLeft: '16px', fontSize: '1.25rem', fontWeight: 600 }}>Create Account</h2>
      </div>

      <div style={{ zIndex: 1, display: 'flex', gap: '8px', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: '4px', flex: 1, background: i <= step ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', transition: 'var(--transition-normal)' }} />
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {step === 1 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--secondary-color)' }}>Basic Information</h3>
            
            <div style={{ position: 'relative' }}>
              <User size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input type="text" className="input-field" placeholder="Full Name" style={{ paddingLeft: '48px' }} value={formData.name} onChange={e => handleChange('name', e.target.value)} required />
            </div>

            <div style={{ position: 'relative' }}>
              <Phone size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input type="tel" className="input-field" placeholder="Mobile Number" style={{ paddingLeft: '48px' }} value={formData.mobile} onChange={e => handleChange('mobile', e.target.value)} required />
            </div>

            <div style={{ position: 'relative' }}>
              <Mail size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input type="email" className="input-field" placeholder="Email Address" style={{ paddingLeft: '48px' }} value={formData.email} onChange={e => handleChange('email', e.target.value)} />
            </div>

            <div style={{ position: 'relative' }}>
              <Calendar size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input type="date" className="input-field" style={{ paddingLeft: '48px' }} value={formData.dob} onChange={e => handleChange('dob', e.target.value)} required />
              <span style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}>Date of Birth</span>
            </div>

            <select className="input-field" value={formData.sex} onChange={e => handleChange('sex', e.target.value)} required style={{ appearance: 'none' }}>
              <option value="" disabled>Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--secondary-color)' }}>Personal Details</h3>
            
            <div style={{ position: 'relative' }}>
              <MapPin size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input type="text" className="input-field" placeholder="Full Address" style={{ paddingLeft: '48px' }} value={formData.address} onChange={e => handleChange('address', e.target.value)} />
            </div>

            <div style={{ position: 'relative' }}>
              <Briefcase size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input type="text" className="input-field" placeholder="Occupation" style={{ paddingLeft: '48px' }} value={formData.occupation} onChange={e => handleChange('occupation', e.target.value)} />
            </div>

            <select className="input-field" value={formData.maritalStatus} onChange={e => handleChange('maritalStatus', e.target.value)} style={{ appearance: 'none' }}>
              <option value="" disabled>Marital Status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>

            {formData.maritalStatus === 'married' && (
              <div className="animate-fade-in glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--primary-color)' }}>
                <div style={{ position: 'relative' }}>
                  <Heart size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--accent-color)' }} />
                  <input type="date" className="input-field" style={{ paddingLeft: '48px' }} value={formData.spouseDob} onChange={e => handleChange('spouseDob', e.target.value)} />
                  <span style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}>Spouse DOB</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Calendar size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--accent-color)' }} />
                  <input type="date" className="input-field" style={{ paddingLeft: '48px' }} value={formData.anniversary} onChange={e => handleChange('anniversary', e.target.value)} />
                  <span style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}>Anniversary</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px', color: 'var(--secondary-color)' }}>Preferences</h3>

            <div style={{ position: 'relative' }}>
              <Store size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <select className="input-field" value={formData.preferredStore} onChange={e => handleChange('preferredStore', e.target.value)} style={{ appearance: 'none', paddingLeft: '48px' }}>
                <option value="" disabled>Preferred Store Location</option>
                <option value="downtown">Downtown Metro Walk</option>
                <option value="uptown">Uptown City Center</option>
                <option value="suburb">Westside Mall</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Shopping Preferences</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Menswear', 'Womenswear', 'Kids', 'Accessories', 'Footwear'].map(pref => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => togglePreference(pref)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-full)',
                      border: `1px solid ${formData.preferences.includes(pref) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                      background: formData.preferences.includes(pref) ? 'rgba(123, 44, 191, 0.2)' : 'transparent',
                      color: formData.preferences.includes(pref) ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>

            {formData.preferences.includes('Kids') && (
              <div className="animate-fade-in glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--secondary-color)', marginTop: '8px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Since you shop for Kids, add their birthday for special surprise gifts!</p>
                <div style={{ position: 'relative' }}>
                  <Calendar size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--secondary-color)' }} />
                  <input type="date" className="input-field" style={{ paddingLeft: '48px' }} value={formData.kidsDob} onChange={e => handleChange('kidsDob', e.target.value)} />
                  <span style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}>Kids DOB (Optional)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>Verify Mobile</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>Sent to {formData.mobile}</p>
            
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
            {error && <div style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginTop: '8px' }}>{error}</div>}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
          {step < 3 ? (
            <button type="button" onClick={nextStep} className="btn btn-primary">
              Continue <ArrowRight size={20} />
            </button>
          ) : step === 3 ? (
            <button type="submit" disabled={loading} className="btn btn-primary bg-gradient-primary">
              {loading ? 'Sending OTP...' : 'Verify Mobile Number'} <ArrowRight size={20} />
            </button>
          ) : (
            <button type="submit" disabled={loading} className="btn btn-primary bg-gradient-primary">
              {loading ? 'Registering...' : 'Complete Registration'} <ShoppingBag size={20} />
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
