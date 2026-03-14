import { useState, useEffect } from 'react';
import { ArrowLeft, Image as ImageIcon, CheckCircle, XCircle, Clock, Filter, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ExchangeGalleryProps {
  userMobile: string;
  onBack: () => void;
}

interface GalleryItem {
  id: string;
  photo_url: string;
  ai_category: string;
  ai_tier: number;
  manager_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  final_value: number;
  created_at: string;
  request_status: string;
}

export default function ExchangeGallery({ userMobile, onBack }: ExchangeGalleryProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    const fetchGallery = async () => {
      setLoading(true);
      try {
        // Fetch items joined with their request status
        const { data, error } = await supabase
          .from('exchange_bin_items')
          .select(`
            *,
            exchange_bin_requests!inner(status)
          `)
          .eq('customer_mobile', userMobile)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = data.map((item: any) => ({
          ...item,
          request_status: item.exchange_bin_requests.status
        }));

        setItems(formatted);
      } catch (err) {
        console.error('Error fetching gallery:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [userMobile]);

  const filteredItems = items.filter(item => {
    if (filter === 'ALL') return true;
    return item.manager_status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle size={14} color="var(--success-color)" />;
      case 'REJECTED': return <XCircle size={14} color="var(--accent-color)" />;
      default: return <Clock size={14} color="var(--text-muted)" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'var(--success-color)';
      case 'REJECTED': return 'var(--accent-color)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-color)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', backdropFilter: 'blur(12px)', padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <ArrowLeft size={24} />
            </button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Exchange Gallery</h2>
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Filter size={14} />
              {filter}
              <ChevronDown size={14} />
            </button>
            
            {showFilterMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', zIndex: 20, width: '120px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
                  <button 
                    key={f}
                    onClick={() => { setFilter(f as any); setShowFilterMenu(false); }}
                    style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: filter === f ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: filter === f ? 'var(--primary-color)' : 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(123,44,191,0.2)', borderTopColor: 'var(--primary-color)', borderRadius: '50%' }} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ImageIcon size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No items found in your gallery.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {filteredItems.map((item, idx) => (
              <div 
                key={item.id} 
                className="glass-panel animate-fade-in" 
                style={{ padding: '0', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', animationDelay: `${idx * 0.05}s` }}
              >
                <div style={{ position: 'relative', width: '100%', paddingBottom: '100%' }}>
                  <img 
                    src={item.photo_url} 
                    alt={item.ai_category} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {getStatusIcon(item.manager_status)}
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>{item.manager_status}</span>
                  </div>
                </div>
                
                <div style={{ padding: '12px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '2px', color: 'var(--text-primary)' }}>{item.ai_category}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 800, color: getStatusColor(item.manager_status) }}>
                      ₹{item.manager_status === 'APPROVED' ? item.final_value : item.ai_tier}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
