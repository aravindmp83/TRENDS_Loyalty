import { ArrowLeft, Ticket, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface ExpiredCouponsProps {
  coupons: any[];
  onBack: () => void;
}

export default function ExpiredCoupons({ coupons, onBack }: ExpiredCouponsProps) {
  const inactiveCoupons = coupons.filter(c => c.status === 'REDEEMED' || c.status === 'EXPIRED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', backgroundColor: 'var(--bg-color)', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ marginLeft: '16px', fontSize: '1.25rem', fontWeight: 600 }}>Coupon History</h2>
      </div>

      {inactiveCoupons.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {inactiveCoupons.map((coupon) => (
            <div key={coupon.id} className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', opacity: 0.7, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Ticket size={20} color="var(--text-muted)" />
                  <h4 style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>{coupon.title}</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: coupon.status === 'REDEEMED' ? 'rgba(6, 214, 160, 0.1)' : 'rgba(255, 255, 255, 0.05)', color: coupon.status === 'REDEEMED' ? 'var(--success-color)' : 'var(--text-muted)' }}>
                  {coupon.status === 'REDEEMED' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{coupon.status}</span>
                </div>
              </div>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{coupon.description}</p>
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Coupon Code</p>
                  <code style={{ fontSize: '0.9rem', fontWeight: 600 }}>{coupon.code}</code>
                </div>
                {coupon.invoice_number && (
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Invoice #</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{coupon.invoice_number}</p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{coupon.status === 'REDEEMED' ? 'Redeemed On' : 'Expired On'}</p>
                  <p style={{ fontSize: '0.9rem' }}>{new Date(coupon.updated_at || coupon.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.5 }}>
          <Calendar size={48} style={{ marginBottom: '16px' }} />
          <p>No coupon history found.</p>
        </div>
      )}

    </div>
  );
}
