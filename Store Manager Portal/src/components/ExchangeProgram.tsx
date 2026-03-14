import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Camera, Phone, Plus, Trash2, User, Key, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ExchangeProgramProps {
  onBack: () => void;
}

const TIER_AMOUNTS = {
  tier500: { value: 500, label: '₹500', items: ['Denims', 'SKD', 'S & B'] },
  tier300: { value: 300, label: '₹300', items: ['Pants', 'Trousers', 'Joggers', 'Chinos', 'Winter Wear – Sweaters+'] },
  tier200: { value: 200, label: '₹200', items: ['Knit top', 'Kurta', 'Dress', 'Shirts', 'Top wear', 'Tracks', 'Sarees', 'Palazzos/Skirts/Culottes'] },
  tier100: { value: 100, label: '₹100', items: ['T-shirts', 'Shorts', 'Leggings', 'Kids garments'] }
};

interface Garment {
  id: string;
  category: string;
  tierValue: number;
  uploadedPhoto: boolean;
  photoUrl?: string;
}

export default function ExchangeProgram({ onBack }: ExchangeProgramProps) {
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [mobile, setMobile] = useState('');
  const [customerData, setCustomerData] = useState<{name: string, balance: number} | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Camera state
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalValue = garments.reduce((sum, g) => sum + g.tierValue, 0);

  // Auto-fetch customer when mobile is 10 digits
  useEffect(() => {
    if (mobile.length === 10) {
      const fetchCustomer = async () => {
        const { data } = await supabase.from('customers').select('name, exchange_balance').eq('mobile', mobile).single();
        if (data) {
          setCustomerData({ name: data.name || 'Valued Customer', balance: data.exchange_balance || 0 });
        } else {
          setCustomerData(null); // Not found
        }
      };
      fetchCustomer();
    } else {
      setCustomerData(null);
    }
  }, [mobile]);

  const addGarment = () => {
    setGarments(prev => [...prev, { id: Math.random().toString(), category: '', tierValue: 0, uploadedPhoto: false }]);
  };

  const removeGarment = (id: string) => {
    setGarments(prev => prev.filter(g => g.id !== id));
  };

  const updateGarment = (id: string, category: string) => {
    let tierValue = 0;
    for (const tier of Object.values(TIER_AMOUNTS)) {
      if (tier.items.includes(category)) {
        tierValue = tier.value;
        break;
      }
    }
    setGarments(prev => prev.map(g => g.id === id ? { ...g, category, tierValue } : g));
  };

  const startCamera = async (id: string) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setActiveCameraId(id);
      setStream(mediaStream);
    } catch (err) {
      console.error("Camera access denied or failed", err);
      alert("Camera access failed. Please ensure permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setActiveCameraId(null);
  };

  useEffect(() => {
    if (activeCameraId && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [activeCameraId, stream]);

  const captureLivePhoto = async () => {
    if (!activeCameraId || !videoRef.current) return;
    const id = activeCameraId;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      stopCamera();
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay GPS & Date
    let locationText = 'Location: Unknown';
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      locationText = `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`;
    } catch (locErr) {
      console.warn('Could not get location', locErr);
    }

    const now = new Date();
    const dateTimeText = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    const fontSize = Math.max(16, canvas.height * 0.03); // Responsive font size
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = fontSize * 0.1;

    const padding = fontSize;
    const x = padding;
    const yDate = canvas.height - padding - fontSize * 1.5;
    const yLoc = canvas.height - padding;

    // Draw text with border for visibility
    ctx.strokeText(dateTimeText, x, yDate);
    ctx.fillText(dateTimeText, x, yDate);

    ctx.strokeText(locationText, x, yLoc);
    ctx.fillText(locationText, x, yLoc);

    const finalPhotoUrl = canvas.toDataURL('image/jpeg', 0.8);
    setGarments(prev => prev.map(g => g.id === id ? { ...g, uploadedPhoto: true, photoUrl: finalPhotoUrl } : g));
    
    stopCamera();
  };

  const handleRequestOtp = async () => {
    if (!customerData) {
      setError('Customer not found. They must register in the Loyalty App first.');
      return;
    }
    if (garments.length === 0 || garments.some(g => !g.category || !g.uploadedPhoto)) return;
    
    setLoading(true);
    setError('');

    try {
      const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
      
      const { error: dbError } = await supabase
        .from('otp_verification')
        .insert({
          mobile,
          otp_code: mockOtp,
          purpose: 'EXCHANGE_VERIFY'
        });

      if (dbError) throw dbError;

      // In production, this pushes to the user's app. We will just transition to OTP screen.
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to trigger verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the PIN provided by the customer.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Find the pending OTP
      const { data, error: fetchError } = await supabase
        .from('otp_verification')
        .select('*')
        .eq('mobile', mobile)
        .eq('otp_code', otp)
        .eq('purpose', 'EXCHANGE_VERIFY')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !data) {
        throw new Error('Invalid or expired PIN.');
      }

      // Mark as verified
      await supabase.from('otp_verification').update({ status: 'VERIFIED' }).eq('id', data.id);

      // Perform the exchange transaction
      // 1. Update customer balance
      const newBalance = customerData!.balance + totalValue;
      const { error: balanceError } = await supabase.from('customers').update({ exchange_balance: newBalance }).eq('mobile', mobile);
      if (balanceError) throw balanceError;

      // 2. Log the exchange
      const { error: logError } = await supabase.from('garment_exchanges').insert({ customer_mobile: mobile, total_value: totalValue });
      if (logError) throw logError;

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to complete transaction.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '24px', textAlign: 'center', backgroundColor: 'var(--success-color)', color: 'white' }} className="animate-fade-in">
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '50%', marginBottom: '24px' }}>
          <CheckCircle size={64} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Exchange Approved</h2>
        <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '8px' }}>{customerData?.name} ({mobile})</p>
        <p style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '32px' }}>They have been credited with an exchange balance of <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '8px' }}>₹{totalValue}</strong></p>
        <button onClick={onBack} className="btn" style={{ backgroundColor: 'white', color: 'var(--success-color)' }}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', backgroundColor: 'var(--bg-color)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => setStep('form')} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ marginLeft: '16px', fontSize: '1.25rem', fontWeight: 600 }}>Customer Verification</h2>
        </div>

        <div className="panel animate-fade-in" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(6, 214, 160, 0.1)', padding: '16px', borderRadius: '50%', color: 'var(--success-color)', display: 'inline-flex', marginBottom: '24px' }}>
            <ShieldCheck size={48} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Ask {customerData?.name} for PIN</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>A 4-digit verification PIN has been flashed on their Loyalty App screen.</p>

          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Key size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter 4-digit PIN" 
                style={{ paddingLeft: '48px', letterSpacing: '4px', fontSize: '1.5rem', textAlign: 'center', fontWeight: 'bold' }}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={4}
              />
            </div>
            {error && <div style={{ color: 'var(--accent-color)', fontSize: '0.9rem' }}>{error}</div>}
            
            <button type="submit" disabled={loading} className="btn btn-primary bg-gradient-accent" style={{ marginTop: '16px' }}>
              {loading ? 'Verifying...' : `Confirm & Credit ₹${totalValue}`}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', backgroundColor: 'var(--bg-color)', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ marginLeft: '16px', fontSize: '1.25rem', fontWeight: 600 }}>The Great Fashion Exchange</h2>
      </div>

      <div className="panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>Customer Details</h3>
        <div style={{ position: 'relative', marginBottom: customerData ? '16px' : '0' }}>
          <Phone size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
          <input 
            type="tel" 
            className="input-field" 
            placeholder="Search Mobile Number" 
            style={{ paddingLeft: '48px', borderColor: customerData ? 'var(--success-color)' : 'var(--border-color-strong)' }}
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            maxLength={10}
          />
        </div>

        {/* Dynamic Customer Data Display */}
        {mobile.length === 10 && !customerData && (
          <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginTop: '12px' }}>Customer not found in Loyalty program.</p>
        )}

        {customerData && (
          <div className="animate-fade-in" style={{ backgroundColor: 'var(--surface-color-light)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--success-color)', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '8px', borderRadius: '50%', color: 'var(--success-color)' }}>
              <User size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{customerData.name}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Balance: ₹{customerData.balance}</p>
            </div>
            <CheckCircle color="var(--success-color)" size={20} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Garments Received</h3>
        <span style={{ backgroundColor: 'var(--surface-color)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary-color)', border: '1px solid var(--border-color-strong)' }}>
          Total: ₹{totalValue}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {garments.map((g, index) => (
          <div key={g.id} className="panel animate-fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--secondary-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Item #{index + 1}</span>
              <button type="button" onClick={() => removeGarment(g.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}>
                <Trash2 size={18} />
              </button>
            </div>
            
            <select 
              className="input-field" 
              value={g.category} 
              onChange={(e) => updateGarment(g.id, e.target.value)}
              style={{ appearance: 'none' }}
            >
              <option value="" disabled>Select Garment Category</option>
              <optgroup label="₹500 Tier">
                {TIER_AMOUNTS.tier500.items.map(i => <option key={i} value={i}>{i}</option>)}
              </optgroup>
              <optgroup label="₹300 Tier">
                {TIER_AMOUNTS.tier300.items.map(i => <option key={i} value={i}>{i}</option>)}
              </optgroup>
              <optgroup label="₹200 Tier">
                {TIER_AMOUNTS.tier200.items.map(i => <option key={i} value={i}>{i}</option>)}
              </optgroup>
              <optgroup label="₹100 Tier">
                {TIER_AMOUNTS.tier100.items.map(i => <option key={i} value={i}>{i}</option>)}
              </optgroup>
            </select>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => startCamera(g.id)}
                className={g.uploadedPhoto ? "btn btn-secondary" : "btn btn-primary"} 
                style={{ flex: 1, padding: '10px', fontSize: '0.9rem', backgroundColor: g.uploadedPhoto ? 'var(--success-color)' : '', color: g.uploadedPhoto ? 'white' : '' }}
              >
                {g.uploadedPhoto ? <><CheckCircle size={18} /> Photo Attached</> : <><Camera size={18} /> Check/Take Photo</>}
              </button>
              
              {g.photoUrl && (
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color-strong)' }}>
                  <img src={g.photoUrl} alt="Garment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {!g.photoUrl && (
                <div style={{ backgroundColor: 'var(--surface-color-light)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, minWidth: '80px', border: '1px solid var(--border-color-strong)' }}>
                  ₹{g.tierValue}
                </div>
              )}
            </div>
          </div>
        ))}

        <button type="button" onClick={addGarment} className="btn " style={{ border: '2px dashed var(--border-color-strong)', backgroundColor: 'transparent', color: 'var(--text-secondary)' }}>
          <Plus size={20} /> Add Another Garment
        </button>

      </div>

      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        {error && <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '8px' }}>{error}</p>}
        <button 
          onClick={handleRequestOtp} 
          disabled={!customerData || garments.length === 0 || garments.some(g => !g.category || !g.uploadedPhoto) || loading} 
          className="btn btn-primary" 
          style={{ height: '56px', fontSize: '1.1rem' }}
        >
          {loading ? 'Processing...' : 'Request Customer Verification'}
        </button>
      </div>

      {/* Full Screen Live Camera Modal */}
      {activeCameraId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'black',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', color: 'white' }}>
            <span style={{ fontWeight: 600 }}>Align Garment</span>
            <button onClick={stopCamera} style={{ background: 'none', border: 'none', color: 'white' }}>
              <X size={28} />
            </button>
          </div>
          
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            {/* Camera Reticle Overlay */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '60%', border: '2px dashed rgba(255,255,255,0.5)', borderRadius: 'var(--radius-lg)' }} />
          </div>

          <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', backgroundColor: '#111' }}>
            <button 
              onClick={captureLivePhoto}
              style={{
                width: '72px', height: '72px',
                borderRadius: '50%',
                backgroundColor: 'white',
                border: '4px solid #ddd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid black' }} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
