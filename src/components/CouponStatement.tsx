import { useState } from 'react';
import { ArrowLeft, CalendarRange, FileText, Ticket, CheckCircle, RefreshCw, AlertCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface CouponStatementProps {
  userMobile: string;
  onBack: () => void;
  onRedeem: () => void;
}

interface CouponRow {
  id: string;
  title: string;
  description: string;
  code: string;
  value: number;
  min_purchase: number;
  created_at: string;
  expiry?: string;
  redeemed_at?: string;
  redeemed_by_employee_id?: string;
  invoice_number?: string;
  status: string;
}

// Determine actual status based on expiry
function resolveStatus(c: CouponRow): 'ACTIVE' | 'REDEEMED' | 'EXPIRED' {
  if (c.status === 'REDEEMED') return 'REDEEMED';
  if (c.status === 'EXPIRED') return 'EXPIRED';
  // Check expiry if stored as "Expires in N days" from creation date
  if (c.expiry) {
    const match = c.expiry.match(/(\d+)\s*day/i);
    if (match) {
      const days = parseInt(match[1], 10);
      const expiryMs = new Date(c.created_at).getTime() + days * 86400000;
      if (Date.now() > expiryMs) return 'EXPIRED';
    } else {
      const d = new Date(c.expiry);
      if (!isNaN(d.getTime()) && Date.now() > d.getTime()) return 'EXPIRED';
    }
  }
  return 'ACTIVE';
}

function getDaysLeft(c: CouponRow): number {
  if (!c.expiry) return 999;
  const match = c.expiry.match(/(\d+)\s*day/i);
  if (match) {
    const days = parseInt(match[1], 10);
    const expiryMs = new Date(c.created_at).getTime() + days * 86400000;
    return Math.max(0, Math.ceil((expiryMs - Date.now()) / 86400000));
  }
  const d = new Date(c.expiry);
  if (!isNaN(d.getTime())) return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
  return 30;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

type TabType = 'ACTIVE' | 'REDEEMED' | 'EXPIRED';

function CouponCard({ coupon, onRedeem }: { coupon: CouponRow; onRedeem: () => void }) {
  const resolved = resolveStatus(coupon);
  const daysLeft = resolved === 'ACTIVE' ? getDaysLeft(coupon) : 0;
  const addedDate = formatDate(coupon.created_at);
  const redeemedDate = coupon.redeemed_at ? formatDate(coupon.redeemed_at) : null;

  const borderColor = resolved === 'ACTIVE' ? 'var(--success-color)' : resolved === 'REDEEMED' ? 'var(--primary-color)' : '#666';

  const urgencyColor = daysLeft <= 1 ? '#ef4444' : daysLeft <= 5 ? '#f97316' : daysLeft <= 10 ? '#f59e0b' : 'var(--text-muted)';

  return (
    <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1px solid var(--border-color)`, borderLeft: `3px solid ${borderColor}` }}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ background: 'rgba(123,44,191,0.15)', padding: '8px', borderRadius: 'var(--radius-sm)', color: 'var(--primary-color)', flexShrink: 0 }}>
          <Ticket size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>THE GREAT FASHION EXCHANGE</p>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2px' }}>{coupon.title}</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{coupon.description}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{coupon.value}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '1px' }}>{coupon.code}</p>
        </div>
      </div>

      {/* Date info + urgency */}
      <div style={{ padding: '10px 16px 14px', background: 'var(--surface-color)', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CalendarRange size={12} color="var(--text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Added: <strong style={{ color: 'var(--text-secondary)' }}>{addedDate}</strong></span>
          </div>
          {resolved === 'REDEEMED' && redeemedDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle size={12} color="var(--success-color)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Redeemed: <strong style={{ color: 'var(--success-color)' }}>{redeemedDate}</strong></span>
            </div>
          )}
          {resolved === 'EXPIRED' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <XCircle size={12} color="#888" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expired</span>
            </div>
          )}
        </div>

        {/* Only for ACTIVE — days left */}
        {resolved === 'ACTIVE' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', padding: daysLeft <= 1 ? '8px 10px' : '0', background: daysLeft <= 1 ? 'rgba(239,68,68,0.1)' : 'transparent', borderRadius: 'var(--radius-sm)' }}>
            {daysLeft <= 1 ? (
              <>
                <AlertCircle size={15} color="#ef4444" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>
                  You have only 1 day left to redeem. Do not miss the opportunity!
                </span>
              </>
            ) : (
              <>
                <Clock size={13} color={urgencyColor} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: urgencyColor }}>
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left to redeem
                </span>
              </>
            )}
          </div>
        )}

        {resolved === 'REDEEMED' && coupon.invoice_number && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🧾 Invoice: {coupon.invoice_number} · {coupon.redeemed_by_employee_id && `By: ${coupon.redeemed_by_employee_id}`}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Min Purchase: ₹{coupon.min_purchase}</span>
          {resolved === 'ACTIVE' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRedeem(); }}
              style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Redeem Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CouponStatement({ userMobile, onBack, onRedeem }: CouponStatementProps) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toYMD = (d: Date) => d.toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(toYMD(firstOfMonth));
  const [toDate, setToDate] = useState(toYMD(today));
  const [allCoupons, setAllCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('ACTIVE');

  const handleApply = async () => {
    if (!fromDate || !toDate) { setError('Please select both dates.'); return; }
    if (fromDate > toDate) { setError('From date must be before To date.'); return; }
    setError('');
    setLoading(true);
    setFetched(false);

    try {
      const fromISO = new Date(fromDate + 'T00:00:00').toISOString();
      const toISO = new Date(toDate + 'T23:59:59').toISOString();

      // Fetch all coupons created in the range
      const { data: created } = await supabase
        .from('coupons')
        .select('*')
        .eq('customer_mobile', userMobile)
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .order('created_at', { ascending: false });

      // Also fetch coupons redeemed in range (may have been created before)
      const { data: redeemed } = await supabase
        .from('coupons')
        .select('*')
        .eq('customer_mobile', userMobile)
        .eq('status', 'REDEEMED')
        .gte('redeemed_at', fromISO)
        .lte('redeemed_at', toISO)
        .order('redeemed_at', { ascending: false });

      // Merge, dedup by id
      const merged = [...(created || [])];
      (redeemed || []).forEach((r: CouponRow) => {
        if (!merged.find(c => c.id === r.id)) merged.push(r);
      });

      setAllCoupons(merged);
      setFetched(true);
      setActiveTab('ACTIVE');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statement.');
    } finally {
      setLoading(false);
    }
  };

  const categorized = {
    ACTIVE: allCoupons.filter(c => resolveStatus(c) === 'ACTIVE'),
    REDEEMED: allCoupons.filter(c => resolveStatus(c) === 'REDEEMED'),
    EXPIRED: allCoupons.filter(c => resolveStatus(c) === 'EXPIRED'),
  };

  const tabConfig: { key: TabType; label: string; color: string; bg: string }[] = [
    { key: 'ACTIVE', label: 'Active', color: 'var(--success-color)', bg: 'rgba(6,214,160,0.12)' },
    { key: 'REDEEMED', label: 'Redeemed', color: 'var(--primary-color)', bg: 'rgba(123,44,191,0.12)' },
    { key: 'EXPIRED', label: 'Expired', color: '#888', bg: 'rgba(255,255,255,0.05)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-color)' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', backdropFilter: 'blur(12px)', padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Statement of Coupons</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>View by date range · Active, Redeemed & Expired</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        {/* Date Picker */}
        <div className="glass-panel animate-fade-in" style={{ padding: '18px', marginBottom: '20px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>From</label>
              <input type="date" className="input-field" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)} style={{ fontSize: '0.9rem', padding: '10px 12px', colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>To</label>
              <input type="date" className="input-field" value={toDate} min={fromDate} max={toYMD(today)} onChange={e => setToDate(e.target.value)} style={{ fontSize: '0.9rem', padding: '10px 12px', colorScheme: 'dark' }} />
            </div>
          </div>
          {error && <p style={{ color: 'var(--accent-color)', fontSize: '0.85rem', marginBottom: '8px' }}>{error}</p>}
          <button onClick={handleApply} disabled={loading} className="btn btn-primary" style={{ width: '100%', height: '46px', fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {loading
              ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
              : <><FileText size={16} /> Apply & View Statement</>
            }
          </button>
        </div>

        {fetched && (
          <div className="animate-fade-in">
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              {tabConfig.map(tab => {
                const count = categorized[tab.key].length;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: isActive ? `1.5px solid ${tab.color}` : '1px solid var(--border-color)',
                      background: isActive ? tab.bg : 'var(--surface-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isActive ? tab.color : 'var(--text-muted)' }}>{count}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isActive ? tab.color : 'var(--text-muted)' }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Coupon list for active tab */}
            {categorized[activeTab].length === 0 ? (
              <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-md)', padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No {activeTab.toLowerCase()} coupons in this date range.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px' }}>
                {categorized[activeTab].map((c, i) => (
                  <div key={c.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                    <CouponCard coupon={c} onRedeem={onRedeem} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
