import { useState } from 'react';
import { ArrowLeft, CheckCircle, Ticket, Zap } from 'lucide-react';

interface CouponGeneratorProps {
  availableBalance: number;
  onBack: () => void;
  onGenerate: (totalCost: number, newCoupons: any[]) => void;
}

const DENOMINATIONS = [
  { value: 1000, label: '₹1000 OFF', description: 'Valid on purchases above ₹4000' },
  { value: 500, label: '₹500 OFF', description: 'Valid on purchases above ₹2500' },
  { value: 200, label: '₹200 OFF', description: 'Valid on purchases above ₹1500' },
];

export default function CouponGenerator({ availableBalance, onBack, onGenerate }: CouponGeneratorProps) {
  const [counts, setCounts] = useState<{ [key: number]: number }>({ 1000: 0, 500: 0, 200: 0 });
  const [success, setSuccess] = useState(false);

  const totalCost = DENOMINATIONS.reduce((sum, d) => sum + (counts[d.value] * d.value), 0);
  const remainingBalance = availableBalance - totalCost;

  const updateCount = (value: number, delta: number) => {
    setCounts(prev => {
      const newCount = Math.max(0, prev[value] + delta);
      // Prevent exceeding balance
      const potentialCost = DENOMINATIONS.reduce((sum, d) => sum + ((d.value === value ? newCount : prev[d.value]) * d.value), 0);
      if (potentialCost > availableBalance) return prev;
      return { ...prev, [value]: newCount };
    });
  };

  const handleGenerate = () => {
    if (totalCost === 0) return;
    
    // Create new coupon objects
    const newCoupons: any[] = [];
    DENOMINATIONS.forEach(d => {
      for (let i = 0; i < counts[d.value]; i++) {
        newCoupons.push({
          id: `GEN-${Math.random().toString().slice(2, 8)}`,
          brand: 'The Great Fashion Exchange',
          title: d.label,
          value: d.value,
          minPurchase: d.value === 1000 ? 4000 : d.value === 500 ? 2500 : 1500,
          description: d.description,
          expiry: 'Expires in 30 days',
          code: `EXCH${d.value}-${Math.random().toString().slice(2, 6).toUpperCase()}`
        });
      }
    });

    onGenerate(totalCost, newCoupons);
    setSuccess(true);
  };

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-color)', zIndex: 10, position: 'absolute', inset: 0 }}>
        <div style={{ background: 'rgba(6, 214, 160, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '24px', color: 'var(--success-color)' }} className="animate-fade-in">
          <CheckCircle size={64} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Vouchers Generated!</h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>They have been added to your active coupons.</p>
        <button onClick={onBack} className="btn btn-primary" style={{ width: 'auto', padding: '16px 32px' }}>
          Back to Wallet
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', backgroundColor: 'var(--bg-color)', zIndex: 10, position: 'absolute', inset: 0, overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ marginLeft: '16px', fontSize: '1.25rem', fontWeight: 600 }}>Create Vouchers</h2>
      </div>

      <div className="bg-gradient-primary" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', marginBottom: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-neon)' }}>
        <div>
          <p style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '4px' }}>Available Balance</p>
          <h3 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-1px' }}>₹{remainingBalance}</h3>
        </div>
        <Zap size={48} opacity={0.3} />
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>Select Denominations</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {DENOMINATIONS.map(d => (
          <div key={d.value} className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Ticket size={18} color="var(--primary-color)" />
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{d.label}</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{d.description}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface-color)', padding: '6px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => updateCount(d.value, -1)}
                disabled={counts[d.value] === 0}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: counts[d.value] === 0 ? 'transparent' : 'var(--surface-color-light)', color: counts[d.value] === 0 ? 'var(--border-color-strong)' : 'var(--text-primary)', fontSize: '1.2rem', cursor: counts[d.value] === 0 ? 'not-allowed' : 'pointer' }}
              >
                -
              </button>
              <span style={{ fontWeight: 600, fontSize: '1.1rem', width: '20px', textAlign: 'center' }}>{counts[d.value]}</span>
              <button 
                onClick={() => updateCount(d.value, 1)}
                disabled={remainingBalance < d.value}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: remainingBalance < d.value ? 'transparent' : 'var(--primary-color)', color: remainingBalance < d.value ? 'var(--border-color-strong)' : 'white', fontSize: '1.2rem', cursor: remainingBalance < d.value ? 'not-allowed' : 'pointer' }}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <button 
          onClick={handleGenerate}
          disabled={totalCost === 0} 
          className="btn btn-primary bg-gradient-accent" 
          style={{ height: '56px', fontSize: '1.1rem', opacity: totalCost === 0 ? 0.5 : 1 }}
        >
          Confirm & Generate (₹{totalCost})
        </button>
      </div>

    </div>
  );
}
