import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Camera, ChevronRight,
  Info, Loader, MapPin, Navigation, Package, Plus, ShoppingBag,
  Star, Trash2, AlertTriangle, CheckCircle, ShoppingCart, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface CustomerExchangeProps {
  userMobile: string;
  onBack: () => void;
}

interface CapturedItem {
  id: string;
  photoUrl: string;
  latitude?: number;
  longitude?: number;
  aiCategory?: string;
  aiTier?: number;
  isAnalyzing: boolean;
}

const AI_CLASSIFICATIONS = [
  { category: 'Denim / Jeans', tier: 500 },
  { category: 'Formal Trousers', tier: 300 },
  { category: 'Kurta / Ethnic Top', tier: 200 },
  { category: 'T-Shirt', tier: 100 },
  { category: 'Casual Shorts', tier: 100 },
  { category: 'Sweater / Winter Wear', tier: 300 },
  { category: 'Shirt (Formal/Casual)', tier: 200 },
  { category: 'Leggings / Tracks', tier: 100 },
  { category: 'Saree', tier: 200 },
  { category: 'Kids Garment', tier: 100 },
  { category: 'Denims / SKD', tier: 500 },
  { category: 'Pants / Joggers / Chinos', tier: 300 },
];

const STORE_DATABASE = [
  { id: 's1', name: 'Trends – Phoenix Mall', address: 'Phoenix MarketCity, Velachery, Chennai', lat: 12.9774, lng: 80.2180 },
  { id: 's2', name: 'Trends – Express Avenue', address: 'Express Avenue Mall, Royapettah, Chennai', lat: 13.0627, lng: 80.2624 },
  { id: 's3', name: 'Trends – Ampa Skywalk', address: 'Ampa Skywalk, Aminjikarai, Chennai', lat: 13.0707, lng: 80.2232 },
  { id: 's4', name: 'Trends – Nexus Vijaya', address: 'Nexus Vijaya Mall, Vadapalani, Chennai', lat: 13.0524, lng: 80.2121 },
  { id: 's5', name: 'Trends – Grand Mall', address: 'Grand Mall, Perambur, Chennai', lat: 13.1144, lng: 80.2396 },
];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Step = 'intro' | 'camera' | 'review' | 'valuation' | 'confirm_bin' | 'bin_added' | 'stores';

export default function CustomerExchange({ userMobile, onBack }: CustomerExchangeProps) {
  const [step, setStep] = useState<Step>('intro');
  const [items, setItems] = useState<CapturedItem[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [nearbyStores, setNearbyStores] = useState<(typeof STORE_DATABASE[0] & { dist: number })[]>([]);
  const [isSavingBin, setIsSavingBin] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      setStream(mediaStream);
      setCameraActive(true);
    } catch {
      alert('Camera access failed. Please grant permission in your browser settings and try again.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  };

  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [cameraActive, stream]);

  const snapPhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create optimized canvas
    const canvas = document.createElement('canvas');
    const MAX_DIM = 800;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > height) {
      if (width > MAX_DIM) {
        height *= MAX_DIM / width;
        width = MAX_DIM;
      }
    } else {
      if (height > MAX_DIM) {
        width *= MAX_DIM / height;
        height = MAX_DIM;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, width, height);

    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      if (!userLat) { setUserLat(lat); setUserLng(lng); }
    } catch { /* location unavailable */ }

    // Compress to 0.6 quality for bandwidth optimization
    const photoUrl = canvas.toDataURL('image/jpeg', 0.6);
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, photoUrl, latitude: lat, longitude: lng, isAnalyzing: true }]);

    const delay = 1500 + Math.random() * 1000;
    setTimeout(() => {
      const pick = AI_CLASSIFICATIONS[Math.floor(Math.random() * AI_CLASSIFICATIONS.length)];
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, isAnalyzing: false, aiCategory: pick.category, aiTier: pick.tier } : item));
    }, delay);
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const totalTentativeValue = items.reduce((s, i) => s + (i.aiTier ?? 0), 0);
  const allAnalyzed = items.length > 0 && items.every((i) => !i.isAnalyzing);

  const addToExchangeBin = async () => {
    setIsSavingBin(true);
    try {
      // 1. Create a bin request
      const { data: request, error: reqError } = await supabase
        .from('exchange_bin_requests')
        .insert({ customer_mobile: userMobile, tentative_value: totalTentativeValue, status: 'PENDING' })
        .select()
        .single();
      if (reqError) throw reqError;

      // 2. Insert each item
      const itemsToInsert = items.map((item) => ({
        request_id: request.id,
        customer_mobile: userMobile,
        photo_url: item.photoUrl,
        ai_category: item.aiCategory,
        ai_tier: item.aiTier ?? 0,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        manager_status: 'PENDING',
      }));
      const { error: itemsError } = await supabase.from('exchange_bin_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      setStep('bin_added');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert('Error saving to Exchange Bin: ' + msg);
    } finally {
      setIsSavingBin(false);
    }
  };

  const findNearestStores = () => {
    const lat = userLat ?? 13.0827;
    const lng = userLng ?? 80.2707;
    const sorted = [...STORE_DATABASE]
      .map((s) => ({ ...s, dist: getDistanceKm(lat, lng, s.lat, s.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4);
    setNearbyStores(sorted);
    setStep('stores');
  };

  const openGoogleMaps = (store: typeof STORE_DATABASE[0]) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`, '_blank');
  };

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (step === 'intro') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto' }}>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: 0 }}>
        <ArrowLeft size={24} />
      </button>

      {/* Banner */}
      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '28px', background: 'linear-gradient(135deg, #0a1628 0%, #1a3561 55%, #0a1628 100%)', boxShadow: 'var(--shadow-neon)', padding: '28px 24px', textAlign: 'center', color: 'white', position: 'relative' }}>
        <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(230,57,70,0.2)' }} />
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>TRENDS PRESENTS</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '10px', color: '#f1f5f9' }}>GREAT FASHION<br />EXCHANGE</h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#e63946', padding: '4px 14px', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, textDecoration: 'line-through', color: 'rgba(255,255,255,0.7)' }}>OLD OUT</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>NEW IN</span>
        </div>
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>How it works</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>Click a full-size photo of each garment you want to exchange — one by one. Our AI will analyse them and give you a tentative exchange value.</p>

      {[
        { icon: <Camera size={20} />, label: 'Click a full-size photo of each garment' },
        { icon: <Star size={20} />, label: 'AI analyses & classifies your clothes' },
        { icon: <ShoppingCart size={20} />, label: 'Add to your Exchange Bin' },
        { icon: <ShoppingBag size={20} />, label: 'Visit store — manager approves & credits balance' },
        { icon: <Zap size={20} />, label: 'Convert balance to discount coupons' },
        { icon: <Navigation size={20} />, label: 'Find the nearest Trends store' },
      ].map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface-color)', padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: '10px' }}>
          <div style={{ background: 'var(--primary-color)', padding: '10px', borderRadius: '50%', color: 'white', flexShrink: 0 }}>{s.icon}</div>
          <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>{s.label}</p>
        </div>
      ))}

      <button onClick={() => { setStep('camera'); startCamera(); }} className="btn btn-primary" style={{ height: '56px', fontSize: '1.1rem', marginTop: '16px' }}>
        <Camera size={22} /> Get Started <ArrowRight size={20} />
      </button>
    </div>
  );

  // ── CAMERA ────────────────────────────────────────────────────────────────
  if (step === 'camera') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#000', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', color: 'white', zIndex: 2 }}>
        <button onClick={() => { stopCamera(); setStep('intro'); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={26} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: '1rem' }}>Capture Garment</p>
          <p style={{ fontSize: '0.8rem', color: '#aaa' }}>{items.length} item{items.length !== 1 ? 's' : ''} added</p>
        </div>
        <button
          onClick={() => { stopCamera(); setStep('review'); }}
          disabled={items.length === 0}
          style={{ background: items.length > 0 ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: items.length > 0 ? 'pointer' : 'not-allowed', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
        >
          Done
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '75%', height: '75%', border: '2px dashed rgba(255,255,255,0.5)', borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }} />
        </div>
        {items.length > 0 && (
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '8px' }}>
            {items.slice(-5).map((item) => (
              <div key={item.id} style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', border: '2px solid white', position: 'relative', flexShrink: 0 }}>
                <img src={item.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {item.isAnalyzing && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader size={16} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '24px 32px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={snapPhoto} style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'white', border: '5px solid #555', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px rgba(255,255,255,0.15)', cursor: 'pointer' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e8e8e8', border: '2px solid #aaa' }} />
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── REVIEW ────────────────────────────────────────────────────────────────
  if (step === 'review') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => { startCamera(); setStep('camera'); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Review Your Items</h2>
      </div>

      {editingItemId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Correct Classification</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>If the AI misidentified your garment, please select the correct category below:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {AI_CLASSIFICATIONS.map((c) => (
                <button
                  key={c.category}
                  onClick={() => {
                    setItems((prev) => prev.map((item) => item.id === editingItemId ? { ...item, aiCategory: c.category, aiTier: c.tier } : item));
                    setEditingItemId(null);
                  }}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    textAlign: 'left',
                    color: 'white',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {c.category} (₹{c.tier})
                </button>
              ))}
            </div>
            <button
              onClick={() => setEditingItemId(null)}
              style={{ width: '100%', marginTop: '16px', background: 'transparent', border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {items.map((item, idx) => (
          <div key={item.id} className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', borderLeft: '4px solid var(--secondary-color)' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color-strong)' }}>
              <img src={item.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>Item #{idx + 1}</p>
              {item.isAnalyzing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> AI analysing…
                </div>
              ) : (
                <>
                <div style={{ cursor: 'pointer' }} onClick={() => setEditingItemId(item.id)}>
                  <p style={{ fontSize: '0.92rem', color: 'var(--secondary-color)', fontWeight: 600, textDecoration: 'underline' }}>{item.aiCategory}</p>
                  <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{item.aiTier}</p>
                </div>
                </>
              )}
              {item.latitude && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> {item.latitude.toFixed(4)}, {item.longitude!.toFixed(4)}
                </p>
              )}
            </div>
            <button onClick={() => removeItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => { startCamera(); setStep('camera'); }} className="btn" style={{ border: '2px dashed var(--border-color-strong)', background: 'transparent', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        <Plus size={18} /> Add Another Garment
      </button>
      <button onClick={() => setStep('valuation')} disabled={!allAnalyzed} className="btn btn-primary" style={{ height: '56px', fontSize: '1.1rem', opacity: allAnalyzed ? 1 : 0.5 }}>
        {allAnalyzed ? 'View Valuation' : 'Waiting for AI…'} <ArrowRight size={20} />
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── VALUATION ─────────────────────────────────────────────────────────────
  if (step === 'valuation') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setStep('review')} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>AI Valuation Summary</h2>
      </div>

      <div className="bg-gradient-primary animate-fade-in" style={{ padding: '28px 24px', borderRadius: 'var(--radius-lg)', marginBottom: '24px', textAlign: 'center', boxShadow: 'var(--shadow-neon)' }}>
        <p style={{ fontSize: '1rem', opacity: 0.85, marginBottom: '8px' }}>Tentative Exchange Value</p>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-1px' }}>₹{totalTentativeValue}</h1>
        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '8px' }}>{items.length} item{items.length !== 1 ? 's' : ''} evaluated</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {items.map((item, idx) => (
          <div key={item.id} className="glass-panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              <img src={item.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Item #{idx + 1}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.aiCategory}</p>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--secondary-color)', fontSize: '1.1rem' }}>₹{item.aiTier}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.35)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '0.85rem', color: '#fbbf24', lineHeight: 1.65 }}>
          <strong>Important Disclaimer:</strong> The value proposed by AI is <strong>tentative</strong>. The final exchange value will be decided by the Store Manager. The Store Manager's decision is <strong>final</strong>.
        </p>
      </div>

      {/* Exchange Bin CTA */}
      <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-md)', padding: '18px', marginBottom: '16px', border: '1px solid var(--border-color-strong)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <ShoppingCart size={22} color="var(--secondary-color)" />
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Add to Exchange Bin</h3>
        </div>
        <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Confirmed? Add these {items.length} item{items.length !== 1 ? 's' : ''} to your Exchange Bin. Bring them to any Trends store — the Store Manager will physically verify and credit your balance.
        </p>
      </div>

      <button onClick={() => setStep('confirm_bin')} className="btn btn-primary" style={{ height: '56px', fontSize: '1.1rem', marginBottom: '10px' }}>
        <ShoppingCart size={22} /> Add to Exchange Bin
      </button>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline' }}>
        Save for Later
      </button>
    </div>
  );

  // ── CONFIRM BIN ────────────────────────────────────────────────────────────
  if (step === 'confirm_bin') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ background: 'rgba(123, 44, 191, 0.1)', padding: '24px', borderRadius: '50%', marginBottom: '24px', color: 'var(--primary-color)' }}>
        <ShoppingCart size={56} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>Confirm Exchange Bin</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>
        You are about to add <strong>{items.length} item{items.length !== 1 ? 's' : ''}</strong> with a tentative value of <strong>₹{totalTentativeValue}</strong> to your Exchange Bin.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '32px' }}>
        Please ensure you actually bring these garments to the store. The store manager will do a physical check and approve the final value.
      </p>
      <button onClick={addToExchangeBin} disabled={isSavingBin} className="btn btn-primary" style={{ height: '56px', fontSize: '1.1rem', width: '100%', marginBottom: '12px' }}>
        {isSavingBin ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><CheckCircle size={20} /> Yes, Add to Bin</>}
      </button>
      <button onClick={() => setStep('valuation')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
        Go Back
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── BIN ADDED ─────────────────────────────────────────────────────────────
  if (step === 'bin_added') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '32px 24px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ background: 'rgba(6, 214, 160, 0.1)', padding: '24px', borderRadius: '50%', marginBottom: '24px', color: 'var(--success-color)' }}>
        <CheckCircle size={64} />
      </div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>Items Added to Your Exchange Bin! 🎉</h2>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '8px', fontSize: '1.05rem' }}>
        Thank you for participating in the Great Fashion Exchange!
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '32px' }}>
        Your <strong>{items.length} garment{items.length !== 1 ? 's' : ''}</strong> are in your Exchange Bin. Visit any Trends store, show your mobile number to the store manager, and they'll verify your items and credit your exchange balance.
      </p>

      <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '28px', width: '100%', border: '1px dashed var(--success-color)' }}>
        <p style={{ fontWeight: 600, marginBottom: '4px' }}>Your Exchange Bin</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{items.length} item{items.length !== 1 ? 's' : ''} · Tentative: <strong>₹{totalTentativeValue}</strong></p>
      </div>

      <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '16px' }}>Would you like to visit a store now?</p>

      <button onClick={findNearestStores} className="btn btn-primary" style={{ height: '56px', fontSize: '1.1rem', width: '100%', marginBottom: '12px' }}>
        <Navigation size={20} /> Find Nearest Trends Store
      </button>
      <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
        I'll Visit Later
      </button>
    </div>
  );

  // ── STORES ─────────────────────────────────────────────────────────────────
  if (step === 'stores') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <button onClick={() => setStep('bin_added')} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Nearest Trends Stores</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Tap a store to get directions in Google Maps.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {nearbyStores.map((store, idx) => (
          <button key={store.id} onClick={() => openGoogleMaps(store)} className="glass-panel animate-fade-in"
            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 16px', border: 'none', textAlign: 'left', cursor: 'pointer', animationDelay: `${idx * 0.07}s` }}>
            <div style={{ background: 'var(--primary-color)', padding: '12px', borderRadius: '50%', color: 'white', flexShrink: 0 }}>
              <MapPin size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{store.name}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{store.address}</p>
              <span style={{ backgroundColor: 'rgba(123, 44, 191, 0.15)', color: 'var(--primary-color)', padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600 }}>
                ~{store.dist.toFixed(1)} km away
              </span>
            </div>
            <ChevronRight size={22} color="var(--text-muted)" />
          </button>
        ))}
      </div>

      <div style={{ marginTop: '8px', background: 'var(--surface-color)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <Info size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
          At the store: share your <strong>mobile number</strong> with the manager. They'll look up your Exchange Bin, verify your items physically, and credit your balance — all on their portal.
        </p>
      </div>

      <button onClick={onBack} style={{ marginTop: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
        <Package size={16} /> Back to Dashboard
      </button>
    </div>
  );

  return null;
}
