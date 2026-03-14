import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, ShoppingCart, RefreshCw, Package, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ExchangeBinStatusProps {
  userMobile: string;
  onBack: () => void;
}

interface BinItem {
  id: string;
  photo_url: string;
  ai_category: string;
  ai_tier: number;
  final_value: number;
  manager_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

interface BinRequest {
  id: string;
  tentative_value: number;
  final_value: number;
  status: string;
  created_at: string;
  items: BinItem[];
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'APPROVED':
      return { label: 'Approved', color: 'var(--success-color)', bg: 'rgba(6,214,160,0.13)', Icon: CheckCircle };
    case 'REJECTED':
      return { label: 'Rejected', color: 'var(--accent-color)', bg: 'rgba(255,0,110,0.13)', Icon: XCircle };
    default:
      return { label: 'Awaiting Approval', color: '#f59e0b', bg: 'rgba(245,158,11,0.13)', Icon: Clock };
  }
}

function getRequestStatusLabel(status: string) {
  switch (status) {
    case 'COMPLETED': return { label: 'Reviewed', color: 'var(--success-color)' };
    case 'MANAGER_REVIEWING': return { label: 'Under Review', color: '#f59e0b' };
    default: return { label: 'Pending', color: 'var(--text-muted)' };
  }
}

// Carousel component for a batch — shows 2 items per page to match grid size
function BatchCarousel({ items }: { items: BinItem[] }) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(items.length / 2);
  
  // Get items for the current page
  const startIndex = currentPage * 2;
  const pageItems = [items[startIndex], items[startIndex + 1] ?? null];

  return (
    <div style={{ position: 'relative' }}>
      {/* Page Slot (Grid of 2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {pageItems.map((item, slotIdx) => {
          if (!item) {
            // Deactivated empty slot for parity
            return (
              <div
                key={`deactivated-carousel-${slotIdx}`}
                style={{
                  borderRadius: 'var(--radius-md)',
                  height: '264px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  opacity: 0.2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Package size={24} color="var(--text-muted)" />
              </div>
            );
          }
          const cfg = getStatusConfig(item.manager_status);
          const StatusIcon = cfg.Icon;
          const displayValue = item.manager_status === 'APPROVED' ? item.final_value : item.ai_tier;
          return (
            <div key={item.id} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1.5px solid ${cfg.color}55`, background: 'var(--surface-color)' }}>
              <div style={{ position: 'relative', width: '100%', height: '200px', background: '#111', overflow: 'hidden' }}>
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.ai_category} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={32} color="var(--text-muted)" />
                  </div>
                )}
                <div style={{ position: 'absolute', top: '8px', right: '8px', background: cfg.bg, backdropFilter: 'blur(8px)', border: `1px solid ${cfg.color}66`, padding: '3px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <StatusIcon size={11} color={cfg.color} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                </div>
              </div>
              <div style={{ padding: '8px 10px 10px', height: '64px', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.2 }}>{item.ai_category}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.manager_status === 'APPROVED' ? 'Final' : 'Est.'}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: item.manager_status === 'REJECTED' ? 'var(--accent-color)' : cfg.color }}>
                    {item.manager_status === 'REJECTED' ? '—' : `₹${displayValue}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows — only when multiple pages */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', gap: '10px' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: currentPage === 0 ? 'not-allowed' : 'pointer', opacity: currentPage === 0 ? 0.4 : 1, color: 'var(--text-primary)', fontSize: '0.85rem' }}
          >
            <ChevronLeft size={18} /> Prev
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                style={{ width: i === currentPage ? '20px' : '8px', height: '8px', borderRadius: '4px', border: 'none', background: i === currentPage ? 'var(--primary-color)' : 'var(--border-color-strong)', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages - 1 ? 0.4 : 1, color: 'var(--text-primary)', fontSize: '0.85rem' }}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// Grid — always 2 columns, placeholder (deactivated if empty) for missing slots
function BatchGrid({ items }: { items: BinItem[] }) {
  const slots = [items[0], items[1] ?? null]; // always exactly 2 slots
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {slots.map((item, slotIdx) => {
        if (!item) {
          // Deactivated empty slot (to keep layout but show inactivity)
          return (
            <div
              key={`deactivated-${slotIdx}`}
              style={{
                borderRadius: 'var(--radius-md)',
                height: '264px', // Matches filled card (200px photo + 64px info)
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                opacity: 0.2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Package size={24} color="var(--text-muted)" />
            </div>
          );
        }
        const cfg = getStatusConfig(item.manager_status);
        const StatusIcon = cfg.Icon;
        const displayValue = item.manager_status === 'APPROVED' ? item.final_value : item.ai_tier;
        return (
          <div key={item.id} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1.5px solid ${cfg.color}55`, background: 'var(--surface-color)' }}>
            <div style={{ position: 'relative', width: '100%', height: '200px', background: '#111', overflow: 'hidden' }}>
              {item.photo_url ? (
                <img src={item.photo_url} alt={item.ai_category} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={32} color="var(--text-muted)" />
                </div>
              )}
              <div style={{ position: 'absolute', top: '8px', right: '8px', background: cfg.bg, backdropFilter: 'blur(8px)', border: `1px solid ${cfg.color}66`, padding: '3px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <StatusIcon size={11} color={cfg.color} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</span>
              </div>
            </div>
            <div style={{ padding: '8px 10px 10px', height: '64px', boxSizing: 'border-box' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.2 }}>{item.ai_category}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.manager_status === 'APPROVED' ? 'Final' : 'Est.'}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: item.manager_status === 'REJECTED' ? 'var(--accent-color)' : cfg.color }}>
                  {item.manager_status === 'REJECTED' ? '—' : `₹${displayValue}`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ExchangeBinStatus({ userMobile, onBack }: ExchangeBinStatusProps) {
  const [requests, setRequests] = useState<BinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const fetchBinData = async () => {
    setLoading(true);
    try {
      const { data: reqData } = await supabase
        .from('exchange_bin_requests')
        .select('*')
        .eq('customer_mobile', userMobile)
        .order('created_at', { ascending: false });

      if (!reqData || reqData.length === 0) { setRequests([]); return; }

      const reqIds = reqData.map((r: any) => r.id);
      const { data: itemData } = await supabase
        .from('exchange_bin_items')
        .select('*')
        .in('request_id', reqIds)
        .order('created_at', { ascending: false });

      const itemsByRequest: Record<string, BinItem[]> = {};
      (itemData || []).forEach((item: any) => {
        if (!itemsByRequest[item.request_id]) itemsByRequest[item.request_id] = [];
        itemsByRequest[item.request_id].push(item);
      });

      setRequests(reqData.map((r: any) => ({ ...r, items: itemsByRequest[r.id] || [] })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBinData(); }, [userMobile]);

  const toggleBatch = (id: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalItems = requests.reduce((s, r) => s + r.items.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-color)' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', backdropFilter: 'blur(12px)', padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Exchange Bin</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalItems} item{totalItems !== 1 ? 's' : ''} submitted</p>
          </div>
          <button onClick={fetchBinData} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
            <RefreshCw size={32} color="var(--primary-color)" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading your exchange bin…</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(123,44,191,0.1)', padding: '24px', borderRadius: '50%', color: 'var(--primary-color)' }}>
              <ShoppingCart size={48} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Your Exchange Bin is Empty</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '260px', lineHeight: 1.6 }}>
              Start the Great Fashion Exchange to add garments and earn exchange balance.
            </p>
            <button onClick={onBack} className="btn btn-primary" style={{ marginTop: '8px' }}>Go Back to Dashboard</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {requests.map((req, rIdx) => {
              const reqStatus = getRequestStatusLabel(req.status);
              const isExpanded = expandedBatches.has(req.id);
              const useCarousel = req.items.length > 2;

              return (
                <div key={req.id} className="animate-fade-in" style={{ animationDelay: `${rIdx * 0.06}s` }}>
                  {/* Batch header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Batch #{requests.length - rIdx}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ background: `${reqStatus.color}22`, color: reqStatus.color, fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${reqStatus.color}44` }}>
                        {reqStatus.label}
                      </span>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {req.items.length} item{req.items.length !== 1 ? 's' : ''} · Tentative ₹{req.tentative_value}
                      </p>
                    </div>
                  </div>

                  {/* View / hide images toggle */}
                  <button
                    onClick={() => toggleBatch(req.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', marginBottom: isExpanded ? '12px' : '0' }}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {isExpanded ? 'Hide Images' : `View Images (${req.items.length})`}
                  </button>

                  {/* Photos — carousel or grid */}
                  {isExpanded && (
                    <div className="animate-fade-in">
                      {useCarousel
                        ? <BatchCarousel items={req.items} />
                        : <BatchGrid items={req.items} />
                      }
                    </div>
                  )}

                  {/* Final credited amount */}
                  {req.status === 'COMPLETED' && req.final_value > 0 && (
                    <div style={{ marginTop: '12px', background: 'rgba(6,214,160,0.08)', border: '1px dashed var(--success-color)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Total credited to balance</p>
                      <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--success-color)' }}>+₹{req.final_value}</p>
                    </div>
                  )}

                  {rIdx < requests.length - 1 && (
                    <div style={{ height: '1px', background: 'var(--border-color)', marginTop: '20px' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
