import { ArrowRight, Ticket, ShoppingCart } from 'lucide-react';

interface ManagerDashboardProps {
  onLogout: () => void;
  onSelectProgram: (program: string) => void;
}

export default function ManagerDashboard({ onLogout, onSelectProgram }: ManagerDashboardProps) {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', backgroundColor: 'var(--bg-color)', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2px' }}>Emp ID: #9941</p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Staff Dashboard</h2>
        </div>
        <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
          Logout
        </button>
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>Active Store Programs</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
        
        {/* Walk-in Exchange Process */}
        <div 
          onClick={() => onSelectProgram('exchange')}
          className="panel" 
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'transform 0.2s', border: '1px solid var(--secondary-color)' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
        >
          <div style={{ padding: '20px', backgroundColor: 'var(--primary-color)', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ backgroundColor: 'var(--success-color)', color: 'white', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px', display: 'inline-block' }}>LIVE NOW</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>The Great Fashion Exchange</h4>
              <p style={{ opacity: 0.9, fontSize: '0.9rem' }}>Record customer old garments for voucher credit.</p>
            </div>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-color)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--secondary-color)', fontWeight: 600 }}>Start Walk-in Process</span>
            <ArrowRight size={20} color="var(--secondary-color)" />
          </div>
        </div>

        {/* Exchange Bin Viewer */}
        <div 
          onClick={() => onSelectProgram('exchange_bin_viewer')}
          className="panel" 
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'transform 0.2s', border: '1px solid var(--secondary-color)' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
        >
          <div style={{ padding: '20px', backgroundColor: '#1e3a5f', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ backgroundColor: 'var(--secondary-color)', color: 'white', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px', display: 'inline-block' }}>REVIEW REQUESTS</span>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>Exchange Bin Viewer</h4>
              <p style={{ opacity: 0.9, fontSize: '0.9rem' }}>View & approve/reject customer exchange bin items.</p>
            </div>
            <ShoppingCart size={80} style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1 }} />
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-color)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--secondary-color)', fontWeight: 600 }}>Look Up Customer Bin</span>
            <ArrowRight size={20} color="var(--secondary-color)" />
          </div>
        </div>

        {/* Mock other programs */}
        <div className="panel" style={{ padding: '20px', opacity: 0.6, cursor: 'not-allowed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Ticket size={24} color="var(--text-muted)" />
            <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Validate Store Coupon</h4>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Scan customer QR codes to apply discounts at POS.</p>
        </div>

      </div>
    </div>
  );
}

