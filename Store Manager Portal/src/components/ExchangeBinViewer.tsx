import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Phone, ShieldCheck, Key, Loader, Eye, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ExchangeBinViewerProps {
  onBack: () => void;
}

interface BinItem {
  id: string;
  photo_url: string;
  ai_category: string;
  ai_tier: number;
  latitude?: number;
  longitude?: number;
  manager_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  final_value: number;
  manager_notes?: string;
}

interface BinRequest {
  id: string;
  customer_mobile: string;
  status: string;
  tentative_value: number;
  final_value: number;
  items: BinItem[];
}

type FlowStep = 'mobile_entry' | 'otp_sent' | 'reviewing' | 'done';

export default function ExchangeBinViewer({ onBack }: ExchangeBinViewerProps) {
  const [flowStep, setFlowStep] = useState<FlowStep>('mobile_entry');
  const [mobile, setMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [binRequest, setBinRequest] = useState<BinRequest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-fetch customer on 10-digit mobile
  useEffect(() => {
    if (mobile.length === 10) {
      const fetch = async () => {
        const { data } = await supabase.from('customers').select('name').eq('mobile', mobile).single();
        setCustomerName(data?.name || '');
      };
      fetch();
    } else {
      setCustomerName('');
    }
  }, [mobile]);

  const handleSendOtp = async () => {
    if (!customerName) { setError('Customer not found in Loyalty program.'); return; }
    setLoading(true);
    setError('');
    try {
      // Fetch the customer's pending exchange bin request
      const { data: requests } = await supabase
        .from('exchange_bin_requests')
        .select('*')
        .eq('customer_mobile', mobile)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!requests || requests.length === 0) {
        setError('No pending Exchange Bin found for this customer.');
        setLoading(false);
        return;
      }

      const req = requests[0];
      // Fetch items
      const { data: items } = await supabase
        .from('exchange_bin_items')
        .select('*')
        .eq('request_id', req.id);

      setBinRequest({ ...req, items: items || [] });

      // Generate and send OTP to customer
      const mockOtp = '0000'; // For testing purpose as requested
      await supabase.from('otp_verification').insert({ mobile, otp_code: mockOtp, purpose: 'EXCHANGE_VERIFY' });

      setFlowStep('otp_sent');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exchange bin.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!verificationCode) { setError('Please enter the Verification Code.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: fetchErr } = await supabase
        .from('otp_verification')
        .select('*')
        .eq('mobile', mobile)
        .eq('otp_code', verificationCode)
        .eq('purpose', 'EXCHANGE_VERIFY')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchErr || !data) throw new Error('Invalid or expired Verification Code.');

      await supabase.from('otp_verification').update({ status: 'VERIFIED' }).eq('id', data.id);
      await supabase.from('exchange_bin_requests').update({ status: 'MANAGER_REVIEWING' }).eq('id', binRequest!.id);

      setFlowStep('reviewing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const updateItemDecision = (itemId: string, decision: 'APPROVED' | 'REJECTED', finalValue?: number) => {
    setBinRequest((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId
            ? { ...item, manager_status: decision, final_value: decision === 'APPROVED' ? (finalValue ?? item.ai_tier) : 0 }
            : item
        ),
      };
    });
  };

  const handleCompleteReview = async () => {
    if (!binRequest) return;
    setSaving(true);
    setError('');
    try {
      // Update each item decision in Supabase
      for (const item of binRequest.items) {
        await supabase
          .from('exchange_bin_items')
          .update({ manager_status: item.manager_status, final_value: item.final_value })
          .eq('id', item.id);
      }

      const totalFinalValue = binRequest.items.reduce((s, i) => s + (Number(i.final_value) || 0), 0);

      // Mark request as COMPLETED
      const { error: reqError } = await supabase
        .from('exchange_bin_requests')
        .update({ status: 'COMPLETED', final_value: totalFinalValue })
        .eq('id', binRequest.id);
      
      if (reqError) throw reqError;

      // Credit customer exchange balance - use an atomic update or fresh fetch
      const { data: customer, error: custFetchErr } = await supabase
        .from('customers')
        .select('exchange_balance')
        .eq('mobile', mobile)
        .single();
      
      if (custFetchErr) throw custFetchErr;

      const currentBalance = Number(customer?.exchange_balance) || 0;
      const { error: balError } = await supabase
        .from('customers')
        .update({ exchange_balance: currentBalance + totalFinalValue })
        .eq('mobile', mobile);
      
      if (balError) throw balError;

      setBinRequest((prev) => prev ? { ...prev, final_value: totalFinalValue } : prev);
      setFlowStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save decisions.');
    } finally {
      setSaving(false);
    }
  };

  // ── MOBILE ENTRY ──────────────────────────────────────────────────────────
  if (flowStep === 'mobile_entry') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', backgroundColor: 'var(--bg-color)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ArrowLeft size={24} /></button>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Exchange Bin Lookup</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Enter customer mobile to view their bin</p>
        </div>
      </div>

      <div className="panel" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Phone size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
          <input
            type="tel" className="input-field"
            placeholder="Customer Mobile Number"
            style={{ paddingLeft: '48px', borderColor: customerName ? 'var(--success-color)' : undefined }}
            value={mobile}
            onChange={(e) => { setMobile(e.target.value); setError(''); }}
            maxLength={10}
          />
        </div>
        {customerName && (
          <div className="animate-fade-in" style={{ background: 'rgba(6,214,160,0.1)', border: '1px dashed var(--success-color)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={18} color="var(--success-color)" />
            <p style={{ fontWeight: 600, color: 'var(--success-color)' }}>{customerName}</p>
          </div>
        )}
        {error && <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginTop: '12px' }}>{error}</p>}
      </div>

      <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '24px', display: 'flex', gap: '10px' }}>
        <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '0.83rem', color: '#fbbf24', lineHeight: 1.6 }}>
          Ask the customer for the <strong>Verification Code</strong> displayed on their Loyalty App. After verification, you will view their bin and approve/reject each item.
        </p>
      </div>

      <button onClick={handleSendOtp} disabled={mobile.length < 10 || loading} className="btn btn-primary" style={{ height: '56px', fontSize: '1.05rem' }}>
        {loading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Looking up…</> : <><Eye size={18} /> View Exchange Bin</>}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── OTP VERIFICATION ──────────────────────────────────────────────────────
  if (flowStep === 'otp_sent') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={() => setFlowStep('mobile_entry')} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><ArrowLeft size={24} /></button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Customer Verification</h2>
      </div>

      <div className="panel animate-fade-in" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(6, 214, 160, 0.1)', padding: '18px', borderRadius: '50%', color: 'var(--success-color)', display: 'inline-flex', marginBottom: '20px' }}>
          <ShieldCheck size={48} />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px' }}>Ask {customerName} for Verification Code</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.6 }}>
          A 4-digit Verification Code is displayed on their Loyalty App dashboard. Ask them to read it out to you.
        </p>
        <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Exchange Bin: {binRequest?.items.length} item{(binRequest?.items.length ?? 0) !== 1 ? 's' : ''} · Tentative ₹{binRequest?.tentative_value}
        </p>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Key size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
          <input
            type="text" className="input-field"
            placeholder="Enter 4-digit Code"
            style={{ paddingLeft: '48px', letterSpacing: '6px', fontSize: '1.6rem', textAlign: 'center', fontWeight: 'bold' }}
            value={verificationCode} onChange={(e) => { setVerificationCode(e.target.value); setError(''); }} maxLength={4}
          />
        </div>
        {error && <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginBottom: '12px' }}>{error}</p>}
        <button onClick={handleVerifyOtp} disabled={loading || verificationCode.length < 4} className="btn btn-primary bg-gradient-accent" style={{ marginTop: '8px' }}>
          {loading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</> : `Verify & View Items`}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── REVIEWING ITEMS ───────────────────────────────────────────────────────
  if (flowStep === 'reviewing') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', backgroundColor: 'var(--bg-color)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Review: {customerName}'s Bin</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Physically verify each item. Tap to approve or reject.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {binRequest?.items.map((item, idx) => (
          <div key={item.id} className="panel animate-fade-in" style={{ padding: '16px', borderLeft: `4px solid ${item.manager_status === 'APPROVED' ? 'var(--success-color)' : item.manager_status === 'REJECTED' ? 'var(--accent-color)' : 'var(--border-color-strong)'}` }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color-strong)' }}>
                <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700 }}>Item #{idx + 1}</p>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{item.ai_category}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AI Value: <strong>₹{item.ai_tier}</strong></p>
              </div>
              <button onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {expandedItem === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>

            {/* Full photo expanded */}
            {expandedItem === item.id && (
              <div className="animate-fade-in" style={{ marginBottom: '12px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: '280px' }}>
                <img src={item.photo_url} alt="" style={{ width: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {/* Status badge */}
            {item.manager_status !== 'PENDING' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', background: item.manager_status === 'APPROVED' ? 'rgba(6,214,160,0.15)' : 'rgba(255,0,110,0.15)', color: item.manager_status === 'APPROVED' ? 'var(--success-color)' : 'var(--accent-color)' }}>
                {item.manager_status === 'APPROVED' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {item.manager_status} · ₹{item.final_value}
              </div>
            )}

            {/* Approve / Reject buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => updateItemDecision(item.id, 'APPROVED', item.ai_tier)}
                className="btn"
                style={{ flex: 1, padding: '10px', fontSize: '0.9rem', background: item.manager_status === 'APPROVED' ? 'var(--success-color)' : 'rgba(6,214,160,0.12)', color: item.manager_status === 'APPROVED' ? 'white' : 'var(--success-color)', border: '1px solid var(--success-color)', fontWeight: 600 }}
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                onClick={() => updateItemDecision(item.id, 'REJECTED', 0)}
                className="btn"
                style={{ flex: 1, padding: '10px', fontSize: '0.9rem', background: item.manager_status === 'REJECTED' ? 'var(--accent-color)' : 'rgba(255,0,110,0.08)', color: item.manager_status === 'REJECTED' ? 'white' : 'var(--accent-color)', border: '1px solid var(--accent-color)', fontWeight: 600 }}
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ background: 'var(--surface-color)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Items decided: {binRequest?.items.filter(i => i.manager_status !== 'PENDING').length} / {binRequest?.items.length}</p>
          <p style={{ fontWeight: 700, marginTop: '4px' }}>Final Credit: ₹{binRequest?.items.reduce((s, i) => s + (i.final_value ?? 0), 0)}</p>
        </div>
        <CheckCircle size={24} color={binRequest?.items.every(i => i.manager_status !== 'PENDING') ? 'var(--success-color)' : 'var(--border-color-strong)'} />
      </div>

      {error && <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '8px' }}>{error}</p>}

      <button
        onClick={handleCompleteReview}
        disabled={!binRequest?.items.every(i => i.manager_status !== 'PENDING') || saving}
        className="btn btn-primary"
        style={{ height: '56px', fontSize: '1.05rem' }}
      >
        {saving ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : `Confirm & Credit ₹${binRequest?.items.reduce((s, i) => s + (i.final_value ?? 0), 0)}`}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (flowStep === 'done') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '32px 24px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', backgroundColor: 'var(--success-color)', color: 'white' }} className="animate-fade-in">
      <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '50%', marginBottom: '24px' }}>
        <CheckCircle size={64} />
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Exchange Approved!</h2>
      <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '8px' }}>{customerName} ({mobile})</p>
      <p style={{ opacity: 0.9, marginBottom: '8px' }}>Final exchange balance credited:</p>
      <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '32px' }}>₹{binRequest?.final_value}</h1>
      <p style={{ opacity: 0.75, fontSize: '0.9rem', marginBottom: '32px', lineHeight: 1.65 }}>
        The customer will see a real-time update in their Loyalty App. They can convert this balance into discount coupons for their next purchase.
      </p>
      <button onClick={onBack} className="btn" style={{ backgroundColor: 'white', color: 'var(--success-color)', fontWeight: 700 }}>
        Return to Dashboard
      </button>
    </div>
  );

  return null;
}
