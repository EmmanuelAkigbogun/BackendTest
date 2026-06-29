import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

const FILE_TYPES = {
  image:    ['jpg','jpeg','png','gif','webp','svg','avif','bmp','ico'],
  video:    ['mp4','mov','avi','mkv','webm','flv','wmv','m4v'],
  audio:    ['mp3','wav','ogg','flac','aac','m4a','wma'],
  pdf:      ['pdf'],
  text:     ['txt','md','csv','json','xml','yaml','yml','toml','ini','cfg','log','js','ts','jsx','tsx','css','scss','less','html','htm','py','rb','java','c','cpp','h','hpp','cs','go','rs','php','swift','kt','dart','lua','r','sh','bat','ps1','zsh','bash','fish','sql','pl','pm','env','gitignore','dockerfile','makefile'],
  document: ['doc','docx','xls','xlsx','ppt','pptx'],
};

function getFileType(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return 'file';
}

const TYPE_META = {
  text:     { label: 'TEXT',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  image:    { label: 'IMAGE', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  video:    { label: 'VIDEO', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  audio:    { label: 'AUDIO', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  pdf:      { label: 'PDF',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  document: { label: 'DOC',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  file:     { label: 'FILE',  color: '#22d3ee', bg: 'rgba(34,211,238,0.12)'  },
};

// ── Card tilt hook ────────────────────────────────────────────────────────────
function useTilt(ref) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const onEnter = () => setHovered(true);
  const onLeave = () => { setHovered(false); setTilt({ x: 0, y: 0 }); };
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setMouse({ x, y });
    setTilt({ x: ((y / r.height) - 0.5) * 10, y: -((x / r.width) - 0.5) * 10 });
  };

  return { tilt, hovered, mouse, onEnter, onLeave, onMove };
}

// ── Open cursor pill ──────────────────────────────────────────────────────────
const OpenPill = ({ href }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    onClick={e => e.stopPropagation()}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: '#1a1a1a',
      borderRadius: 999,
      padding: '6px 14px',
      textDecoration: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      pointerEvents: 'auto',
      cursor: 'pointer',
    }}
  >
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path d="M2 2L7 12L9 8L13 6L2 2Z" fill="white" stroke="white" strokeWidth="0.4" strokeLinejoin="round"/>
    </svg>
    <span style={{ fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>OPEN</span>
  </a>
);

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ item, onClose }) {
  if (!item) return null;
  const displayType = item.type === 'text' ? 'text' : getFileType(item.file_name || '');

  const renderContent = () => {
    if (displayType === 'image') return (
      <img src={item.content} alt={item.file_name} style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
    );
    if (displayType === 'video') return (
      <video controls autoPlay style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 12 }}>
        <source src={item.content} />
      </video>
    );
    if (displayType === 'audio') return (
      <audio controls autoPlay src={item.content} style={{ width: '80%', maxWidth: 500 }} />
    );
    if (displayType === 'pdf') return (
      <embed src={item.content} type="application/pdf" style={{ width: '95vw', height: '90vh', borderRadius: 12 }} />
    );
    if (displayType === 'text') return (
      <pre style={{ maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 24, fontFamily: 'monospace', fontSize: 13, color: '#333', background: 'rgba(255,255,255,0.9)', borderRadius: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {item.content}
      </pre>
    );
    return (
      <iframe src={item.content} style={{ width: '95vw', height: '90vh', borderRadius: 12, border: 'none', background: 'white' }} title="Preview" />
    );
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderContent()}
        <button onClick={onClose} style={{
          position: 'absolute', top: -40, right: -8, background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.6)', fontSize: 28, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1, padding: 4,
        }}>✕</button>
      </div>
    </div>
  );
}

// ── Media card ────────────────────────────────────────────────────────────────
function MediaCard({ item, onDelete, onCopy, textContents, onPreview }) {
  const ref = useRef(null);
  const { tilt, hovered, onEnter, onLeave, onMove } = useTilt(ref);
  const videoRef = useRef(null);

  const displayType = item.type === 'text' ? 'text' : getFileType(item.file_name || '');
  const tm = TYPE_META[displayType] ?? TYPE_META.file;

  useEffect(() => {
    if (!videoRef.current) return;
    hovered ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
  }, [hovered]);

  const cardStyle = {
    borderRadius: 20,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.72)',
    border: hovered ? '1px solid rgba(255,255,255,0.7)' : '1px solid rgba(0,0,0,0.06)',
    boxShadow: hovered
      ? '0 28px 64px rgba(0,0,0,0.12)'
      : '0 6px 24px rgba(0,0,0,0.06)',
    backdropFilter: 'blur(20px)',
    transform: hovered
      ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-8px) scale(1.025)`
      : 'perspective(900px) rotateX(0) rotateY(0) translateY(0) scale(1)',
    transition: 'transform 0.18s ease, border-color 0.25s, box-shadow 0.25s',
    willChange: 'transform',
  };

  const previewH = displayType === 'text' ? 180 : 260;

  const renderPreview = () => {
    if (displayType === 'image') return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <img src={item.content} alt={item.file_name} style={{
          width: '100%', display: 'block',
          transition: 'transform 3s ease',
          transformOrigin: 'top center',
          transform: hovered ? `translateY(calc(-100% + ${previewH}px))` : 'translateY(0)',
        }}/>
      </div>
    );
    if (displayType === 'video') return (
      <>
        <video ref={videoRef} src={item.content} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        {!hovered && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="white"><path d="M6 4l12 6-12 6V4z"/></svg>
            </div>
          </div>
        )}
      </>
    );
    if (displayType === 'audio') return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: tm.bg }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
          {[3,6,9,7,10,5,8,6,9,4,7,10,5,8,4].map((h, i) => (
            <div key={i} style={{
              width: 5, borderRadius: 3,
              height: `${h * 4}px`,
              background: tm.color,
              opacity: hovered ? 1 : 0.35,
              transition: `all ${0.12 + i * 0.018}s ease`,
              animation: hovered ? `bar ${0.45 + i * 0.06}s ease-in-out infinite alternate` : 'none',
            }}/>
          ))}
        </div>
        <audio controls src={item.content} style={{ width: '80%' }}/>
      </div>
    );
    if (displayType === 'pdf') return (
      <embed src={item.content} type="application/pdf" style={{ width: '100%', height: '100%' }}/>
    );
    if (displayType === 'text') {
      const content = item.type === 'text' ? item.content : (textContents[item.id] || '…');
      return (
        <pre style={{
          width: '100%', height: '100%', margin: 0, padding: '14px 16px',
          fontFamily: 'monospace', fontSize: 11, color: '#888',
          lineHeight: 1.65, overflowY: 'auto', boxSizing: 'border-box',
          background: 'rgba(0,0,0,0.03)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>{content}</pre>
      );
    }
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: tm.bg }}>
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <rect x="7" y="3" width="24" height="32" rx="3" stroke={tm.color} strokeWidth="1.4" fill={tm.bg}/>
          <path d="M13 13h12M13 19h8M13 25h10" stroke={tm.color} strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 11, color: tm.color, maxWidth: 120, textAlign: 'center', wordBreak: 'break-all' }}>{item.file_name}</span>
      </div>
    );
  };

  const isFile = displayType !== 'text' || item.type !== 'text';

  return (
    <div ref={ref} style={cardStyle} onMouseEnter={onEnter} onMouseLeave={onLeave} onMouseMove={onMove}>
      {/* Preview zone — click to enlarge */}
      <div
        style={{ position: 'relative', height: previewH, overflow: 'hidden', cursor: isFile ? 'pointer' : 'default' }}
        onClick={() => { if (isFile) onPreview(item); }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>{renderPreview()}</div>

        {/* Bottom fade */}
        {displayType !== 'text' && !hovered && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.06))', pointerEvents: 'none' }}/>
        )}
      </div>

      {/* Meta bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderTop: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 6, background: tm.bg, color: tm.color }}>{tm.label}</span>
          {item.file_name && (
            <span style={{ fontSize: 11, color: '#b5aea8', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file_name}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#ccc' }}>
            {new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {isFile && (
            <a href={item.content} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, textDecoration: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#999', fontFamily: 'inherit' }}>Open ↗</a>
          )}
          {displayType === 'text' && !isFile && (
            <button onClick={() => onCopy(item.content)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#999', fontFamily: 'inherit' }}>Copy</button>
          )}
          <button onClick={() => onDelete(item)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(200,80,60,0.08)', color: '#c85c3c', fontFamily: 'inherit' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function DashboardPage({ session, onSignOut }) {
  const [message, setMessage]           = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [textContents, setTextContents] = useState({});
  const [toast, setToast]               = useState('');
  const [previewItem, setPreviewItem]   = useState(null);
  const fetchedRef = useRef({});

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('history')
        .select('id, type, content, file_name, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (err) { alert(err.message); }
  };

  useEffect(() => { fetchHistory(); }, []);

  useEffect(() => {
    history.filter(i => i.type !== 'text' && getFileType(i.file_name) === 'text').forEach(async item => {
      if (fetchedRef.current[item.id]) return;
      fetchedRef.current[item.id] = true;
      try {
        const text = await (await fetch(item.content)).text();
        setTextContents(p => ({ ...p, [item.id]: text }));
      } catch {
        setTextContents(p => ({ ...p, [item.id]: '(Failed to load)' }));
      }
    });
  }, [history]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;
    setLoading(true);
    try {
      const userId = session.user.id;
      let payload = { user_id: userId, type: 'text', content: message, file_name: null };
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;
        const { error: ue } = await supabase.storage.from('uploads').upload(filePath, selectedFile);
        if (ue) throw ue;
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
        payload = { ...payload, type: 'file', content: publicUrl, file_name: selectedFile.name };
      }
      const { error: de } = await supabase.from('history').insert([payload]);
      if (de) throw de;
      setMessage(''); setSelectedFile(null);
      document.getElementById('fileInput').value = '';
      fetchHistory();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm('Delete this entry?')) return;
    try {
      if (item.type !== 'text' && item.content) {
        const p = item.content.split('/storage/v1/object/public/uploads/')[1];
        if (p) await supabase.storage.from('uploads').remove([p]);
      }
      const { error } = await supabase.from('history').delete().eq('id', item.id);
      if (error) throw error;
      fetchHistory();
    } catch (err) { alert(err.message); }
  };

  const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setToast('Copied'); setTimeout(() => setToast(''), 2000);
  };

  useEffect(() => {
    if (!previewItem) return;
    const handler = (e) => { if (e.key === 'Escape') setPreviewItem(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewItem]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 22% 0%, #f0e9e5 0%, #e8ddd6 35%, #ddd4cc 70%, #d5cac2 100%)',
      color: '#1a1a1a',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        @keyframes bar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }
        .compose-area {
          border-radius: 20px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(0,0,0,0.06);
          backdrop-filter: blur(24px);
          overflow: hidden;
        }
        .compose-textarea {
          width: 100%; padding: 20px 22px;
          background: transparent; border: none; outline: none; resize: none;
          font-size: 14px; color: #333; line-height: 1.7;
          font-family: inherit;
        }
        .compose-textarea::placeholder { color: #b8b0a8; }
        .send-btn {
          padding: 10px 22px; border: none; border-radius: 12px; cursor: pointer;
          background: #1a1a1a;
          color: white; font-size: 13px; font-weight: 600; font-family: inherit;
          transition: opacity 0.18s, transform 0.1s;
          white-space: nowrap;
        }
        .send-btn:hover { opacity: 0.85; }
        .send-btn:active { transform: scale(0.97); }
        .send-btn:disabled { opacity: 0.38; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: '#1a1a1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2v10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1 }}>Portal</div>
            <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>{session.user.email}</div>
          </div>
        </div>

        {toast && (
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            padding: '6px 18px', borderRadius: 999,
            background: '#1a1a1a', color: 'white',
            fontSize: 12, fontWeight: 500, backdropFilter: 'blur(8px)',
          }}>{toast}</div>
        )}

        <button
          onClick={onSignOut}
          style={{
            fontSize: 12, color: '#999', background: 'none',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.target.style.color = '#333'}
          onMouseLeave={e => e.target.style.color = '#999'}
        >Sign out</button>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Compose */}
        <form onSubmit={handleSend} style={{ marginBottom: 40 }}>
          <div className="compose-area">
            <textarea
              className="compose-textarea"
              rows={4}
              placeholder="Write something, or attach a file below…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend(e); }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px',
              borderTop: '1px solid rgba(0,0,0,0.04)',
              flexWrap: 'wrap', gap: 10,
            }}>
              <label htmlFor="fileInput" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#999', cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#555'}
                onMouseLeave={e => e.currentTarget.style.color = '#999'}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v9M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {selectedFile ? selectedFile.name : 'Attach a file'}
              </label>
              <input id="fileInput" type="file" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])}/>
              <button type="submit" disabled={loading} className="send-btn">
                {loading ? 'Sending…' : 'Send entry'}
              </button>
            </div>
          </div>
        </form>

        {/* History */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', color: '#b5aea8', textTransform: 'uppercase' }}>Transmissions</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }}/>
            <span style={{ fontSize: 10, color: '#ccc' }}>{history.length} entries</span>
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed rgba(0,0,0,0.06)', borderRadius: 20 }}>
              <p style={{ fontSize: 14, color: '#b5aea8', margin: 0 }}>No transmissions yet. Send your first entry above.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
              {history.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onCopy={copyToClipboard}
                  textContents={textContents}
                  onPreview={setPreviewItem}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  );
}
