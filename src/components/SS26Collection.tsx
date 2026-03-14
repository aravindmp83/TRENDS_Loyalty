import { ArrowLeft, Sparkles, Wind, Sun } from 'lucide-react';

interface SS26CollectionProps {
  onBack: () => void;
}

export default function SS26Collection({ onBack }: SS26CollectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0a0a0a', color: 'white', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '2px' }}>SPRING/SUMMER 2026</h2>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px' }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '50%', marginBottom: '24px' }}>
            <Sparkles size={48} color="#00f2ff" />
          </div>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '16px', background: 'linear-gradient(45deg, #00f2ff, #0061ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AVANT-GARDE FUTURE
          </h3>
          <p style={{ color: '#888', maxWidth: '300px', margin: '0 auto', lineHeight: 1.6, fontSize: '1rem' }}>
            Sustainable tech-fabrics meet iridescent textures in our most ambitious collection yet.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Wind size={20} color="#00f2ff" />
              <h4 style={{ fontWeight: 600 }}>Ethereal Comfort</h4>
            </div>
            <p style={{ color: '#777', fontSize: '0.9rem' }}>Lightweight, breathable materials designed for the evolving climate.</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Sun size={20} color="#ffcc00" />
              <h4 style={{ fontWeight: 600 }}>Neon Dawn Palette</h4>
            </div>
            <p style={{ color: '#777', fontSize: '0.9rem' }}>Colors inspired by the soft dawn light and urban bioluminescence.</p>
          </div>
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', padding: '40px 20px', background: 'linear-gradient(rgba(0,0,0,0), rgba(0,242,255,0.05))', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: '0.85rem', color: '#555', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Launching Worldwide</p>
          <h4 style={{ fontSize: '1.5rem', fontWeight: 700 }}>FEBRUARY 2026</h4>
          <button className="btn btn-primary" style={{ marginTop: '24px', background: 'linear-gradient(45deg, #00f2ff, #0061ff)', border: 'none' }}>
            Notify Me
          </button>
        </div>
      </div>
    </div>
  );
}
