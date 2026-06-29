import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';

const FILE_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'],
  video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
  pdf: ['pdf'],
  text: ['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'log', 'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'less', 'html', 'htm', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'swift', 'kt', 'dart', 'lua', 'r', 'sh', 'bat', 'ps1', 'zsh', 'bash', 'fish', 'sql', 'pl', 'pm', 'env', 'gitignore', 'dockerfile', 'makefile'],
  document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
};

function getFileType(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return 'file';
}

const TYPE_META = {
  text: { label: 'TEXT', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  image: { label: 'IMAGE', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  video: { label: 'VIDEO', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  audio: { label: 'AUDIO', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  pdf: { label: 'PDF', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  document: { label: 'DOC', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  file: { label: 'FILE', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  link: { label: 'LINK', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
};

function useTilt(ref) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const onEnter = () => setHovered(true);
  const onLeave = () => { setHovered(false); setTilt({ x: 0, y: 0 }); };
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setTilt({ x: ((y / r.height) - 0.5) * 10, y: -((x / r.width) - 0.5) * 10 });
  };

  return { tilt, hovered, onEnter, onLeave, onMove };
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ item, onClose }) {
  if (!item) return null;
  const displayType = item.type === 'text' || item.type === 'link' ? item.type : getFileType(item.file_name || '');
  const [textContent, setTextContent] = useState(null);

  useEffect(() => {
    if (displayType === 'text' && item.type !== 'text') {
      fetch(item.content).then(r => r.text()).then(setTextContent).catch(() => setTextContent('(Failed to load)'));
    }
  }, [item]);

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
    if (displayType === 'link') return (
      <iframe src={item.content} style={{ width: '95vw', height: '90vh', borderRadius: 12, border: 'none', background: 'white' }} title="Link Preview" />
    );
    if (displayType === 'text') {
      const content = item.type === 'text' ? item.content : (textContent || 'Loading…');
      return (
        <pre tabIndex={0} style={{ maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 24, fontFamily: 'monospace', fontSize: 13, color: '#333', background: 'rgba(255,255,255,0.9)', borderRadius: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', outline: 'none' }}>
          {content}
        </pre>
      );
    }
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
function MediaCard({ item, onDelete, onCopy, textContents, onPreview, onDownload }) {
  const ref = useRef(null);
  const { tilt, hovered, onEnter, onLeave, onMove } = useTilt(ref);
  const videoRef = useRef(null);

  const displayType = item.type === 'text' || item.type === 'link' ? item.type : getFileType(item.file_name || '');
  const tm = TYPE_META[displayType] ?? TYPE_META.file;

  useEffect(() => {
    if (!videoRef.current) return;
    hovered ? videoRef.current.play().catch(() => { }) : videoRef.current.pause();
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
      <img src={item.content} alt={item.file_name} style={{
        width: '100%', height: '100%', display: 'block',
        objectFit: 'cover',
      }}/>
    );
    if (displayType === 'video') return (
      <>
        <video ref={videoRef} src={item.content} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {!hovered && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="white"><path d="M6 4l12 6-12 6V4z" /></svg>
            </div>
          </div>
        )}
      </>
    );
    if (displayType === 'audio') return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: tm.bg }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
          {[3, 6, 9, 7, 10, 5, 8, 6, 9, 4, 7, 10, 5, 8, 4].map((h, i) => (
            <div key={i} style={{
              width: 5, borderRadius: 3,
              height: `${h * 4}px`,
              background: tm.color,
              opacity: hovered ? 1 : 0.35,
              transition: `all ${0.12 + i * 0.018}s ease`,
              animation: hovered ? `bar ${0.45 + i * 0.06}s ease-in-out infinite alternate` : 'none',
            }} />
          ))}
        </div>
        <audio controls src={item.content} style={{ width: '80%' }} />
      </div>
    );
    if (displayType === 'pdf') return (
      <embed src={item.content} type="application/pdf" style={{ width: '100%', height: '100%' }} />
    );
    if (displayType === 'text') {
      const content = item.type === 'text' ? item.content : (textContents[item.id] || '…');
      return (
        <pre style={{
          width: '100%', height: '100%', margin: 0, padding: '14px 16px',
          fontFamily: 'monospace', fontSize: 12, color: '#555',
          lineHeight: 1.7, overflowY: 'auto', boxSizing: 'border-box',
          background: 'rgba(0,0,0,0.02)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{content}</pre>
      );
    }
    if (displayType === 'link') return (
      <iframe src={item.content} style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} title="Link Preview" />
    );
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: tm.bg }}>
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <rect x="7" y="3" width="24" height="32" rx="3" stroke={tm.color} strokeWidth="1.4" fill={tm.bg} />
          <path d="M13 13h12M13 19h8M13 25h10" stroke={tm.color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, color: tm.color, maxWidth: 120, textAlign: 'center', wordBreak: 'break-all' }}>{item.file_name}</span>
      </div>
    );
  };

  return (
    <div ref={ref} style={cardStyle} onMouseEnter={onEnter} onMouseLeave={onLeave} onMouseMove={onMove}>
      <div
        style={{ position: 'relative', height: previewH, overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => onPreview(item)}
      >
        <div style={{ position: 'absolute', inset: 0 }}>{renderPreview()}</div>
        {displayType !== 'text' && !hovered && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.06))', pointerEvents: 'none' }} />
        )}
      </div>

      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 6, background: tm.bg, color: tm.color, flexShrink: 0 }}>{tm.label}</span>
          <span style={{ fontSize: 10, color: '#ccc', flexShrink: 0 }}>
            {new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {item.file_name && (
            <span style={{ fontSize: 11, color: '#b5aea8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{item.file_name}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.type !== 'text' && (
            <a href={item.content} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="card-action" style={{ background: 'rgba(0,0,0,0.04)', color: '#999' }}>Open ↗</a>
          )}
          {item.type === 'text' && (
            <button onClick={() => onCopy(item.content)} className="card-action" style={{ background: 'rgba(0,0,0,0.04)', color: '#999' }}>Copy</button>
          )}
          <button onClick={() => onDownload(item)} className="card-action" style={{ background: 'rgba(0,0,0,0.04)', color: '#999' }}>Download</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => onDelete(item)} className="card-action" style={{ background: 'rgba(200,80,60,0.08)', color: '#c85c3c' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ tree, activeFolder, onSelect, onNewFolder, onDeleteFolder, sidebarOpen, onClose, expandedSet, onToggleExpand }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  const submit = useCallback(() => {
    if (name.trim()) { onNewFolder(name.trim()); setName(''); }
  }, [name, onNewFolder]);

  useEffect(() => {
    if (sidebarOpen && inputRef.current) inputRef.current.focus();
  }, [sidebarOpen]);

  return (
    <>
      {sidebarOpen && <div onClick={onClose} className="sidebar-overlay" />}

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">Folders</div>
          <button className="sidebar-close" onClick={onClose}>✕</button>
        </div>

        <div className="sidebar-scroll">
          <div
            onClick={() => { onSelect(null); onClose(); }}
            className={`sidebar-item ${activeFolder === null ? 'active' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
              <path d="M2 7h12" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span>All Items</span>
          </div>

          {tree.map(node => (
            <FolderTreeNode
              key={node.id}
              node={node}
              depth={0}
              activeFolder={activeFolder}
              expandedSet={expandedSet}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onDeleteFolder={onDeleteFolder}
              onClose={onClose}
            />
          ))}
        </div>

        <div className="sidebar-new-folder">
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="New folder name…"
            className="sidebar-input"
          />
          <button onClick={submit} className="sidebar-add-btn" disabled={!name.trim()}>ADD</button>
        </div>
      </div>
    </>
  );
}

// ── Tree helpers ──────────────────────────────────────────────────────────────
function buildTree(folders) {
  const map = {};
  const roots = [];
  folders.forEach(f => { map[f.id] = { ...f, children: [] }; });
  folders.forEach(f => {
    if (f.parent_id && map[f.parent_id]) {
      map[f.parent_id].children.push(map[f.id]);
    } else {
      roots.push(map[f.id]);
    }
  });
  return roots;
}

function getAllDescendantIds(folders, parentId) {
  const ids = [parentId];
  folders.filter(f => f.parent_id === parentId).forEach(child => {
    ids.push(...getAllDescendantIds(folders, child.id));
  });
  return ids;
}

// ── Folder tree recursive component ──────────────────────────────────────────
function FolderTreeNode({ node, depth, activeFolder, expandedSet, onToggleExpand, onSelect, onDeleteFolder, onClose }) {
  const isActive = activeFolder === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedSet.has(node.id);

  const handleClick = () => {
    if (isActive && hasChildren) {
      onToggleExpand(node.id);
    } else {
      onSelect(node.id);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`sidebar-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
      >
        {hasChildren ? (
          <svg className="sidebar-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none"
            style={{ flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div style={{ width: 10, flexShrink: 0 }} />
        )}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M2 4a1 1 0 011-1h3.586a1 1 0 01.707.293L8 4h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" fill={isActive ? '#1a1a1a' : '#ccc'} />
        </svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
        <button
          onClick={e => { e.stopPropagation(); onDeleteFolder(node.id); }}
          className="sidebar-delete"
        >✕</button>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <FolderTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              expandedSet={expandedSet}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onDeleteFolder={onDeleteFolder}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}
// ── Folder card (main area) ────────────────────────────────────────────────────
function FolderCard({ folder, itemCount, onNavigate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onNavigate(folder.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        background: 'rgba(255,255,255,0.72)',
        border: hovered ? '1px solid rgba(255,255,255,0.7)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: hovered ? '0 28px 64px rgba(0,0,0,0.12)' : '0 6px 24px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(20px)',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, border-color 0.25s, box-shadow 0.25s',
        transform: hovered ? 'translateY(-4px) scale(1.015)' : 'translateY(0) scale(1)',
        padding: '32px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: 180,
      }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: hovered ? 1 : 0.8, transition: 'opacity 0.2s' }}>
        <path d="M6 12a3 3 0 013-3h10.757a3 3 0 012.122.879L24 12h15a3 3 0 013 3v21a3 3 0 01-3 3H9a3 3 0 01-3-3V12z" fill={hovered ? '#1a1a1a' : '#ccc'} />
        <path d="M6 18h36" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>
      <span style={{ fontSize: 14, fontWeight: 600, color: hovered ? '#1a1a1a' : '#666', textAlign: 'center', wordBreak: 'break-word', transition: 'color 0.2s' }}>
        {folder.name}
      </span>
      {itemCount !== undefined && (
        <span style={{ fontSize: 11, color: '#b5aea8' }}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      )}
    </div>
  );
}

export default function DashboardPage({ session, onSignOut }) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [textContents, setTextContents] = useState({});
  const [toast, setToast] = useState('');
  const [previewItem, setPreviewItem] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSet, setExpandedSet] = useState(new Set());
  const [folderCounts, setFolderCounts] = useState({});
  const fetchedRef = useRef({});

  const fetchHistory = async () => {
    try {
      let q = supabase.from('history').select('id, type, content, file_name, created_at, folder_id').order('created_at', { ascending: false });
      if (activeFolder) {
        q = q.eq('folder_id', activeFolder);
      } else {
        q = q.is('folder_id', null);
      }
      const { data, error } = await q;
      if (error) throw error;
      setHistory(data || []);
    } catch (err) { alert(err.message); }
  };

  const fetchFolders = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, created_at, parent_id')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      try {
        const { data, error } = await supabase
          .from('folders')
          .select('id, name, created_at')
          .order('created_at', { ascending: true });
        if (error) throw error;
        setFolders(data || []);
      } catch (err2) {
        console.error('fetchFolders failed:', err2);
      }
    }
  }, []);

  const tree = useMemo(() => buildTree(folders), [folders]);

  const currentSubfolders = useMemo(
    () => folders.filter(f => activeFolder ? f.parent_id === activeFolder : !f.parent_id),
    [folders, activeFolder]
  );

  const toggleExpanded = useCallback((id) => {
    setExpandedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const fetchFolderCounts = useCallback(async (folderIds) => {
    if (!folderIds.length) { setFolderCounts({}); return; }
    try {
      const { data } = await supabase
        .from('history')
        .select('folder_id')
        .in('folder_id', folderIds);
      const counts = {};
      (data || []).forEach(h => {
        counts[h.folder_id] = (counts[h.folder_id] || 0) + 1;
      });
      setFolderCounts(counts);
    } catch { /* ignore count errors */ }
  }, []);

  const navigateToFolder = useCallback((id) => {
    setActiveFolder(id);
    if (id) setExpandedSet(prev => new Set([...prev, id]));
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders, session]);
  useEffect(() => { fetchHistory(); }, [activeFolder]);
  useEffect(() => {
    const ids = folders.filter(f => activeFolder ? f.parent_id === activeFolder : !f.parent_id).map(f => f.id);
    fetchFolderCounts(ids);
  }, [activeFolder, folders]);

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
      let payload = { user_id: userId, type: 'text', content: message, file_name: null, folder_id: activeFolder };
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

  const handleDownload = async (item) => {
    try {
      if (item.type === 'text') {
        const blob = new Blob([item.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'entry.txt';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const res = await fetch(item.content);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = item.file_name || 'download';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
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

  const handleNewFolder = async (name) => {
    try {
      const { error } = await supabase.from('folders').insert([{ user_id: session.user.id, name, parent_id: activeFolder }]);
      if (error) throw error;
      if (activeFolder) setExpandedSet(prev => new Set([...prev, activeFolder]));
      fetchFolders();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteFolder = async (id) => {
    if (!confirm('Delete this folder and all sub-folders? Items will become uncategorized.')) return;
    try {
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;
      if (activeFolder === id) setActiveFolder(null);
      fetchFolders();
      fetchHistory();
    } catch (err) { alert(err.message); }
  };

  useEffect(() => {
    if (!previewItem) return;
    const handler = (e) => { if (e.key === 'Escape') setPreviewItem(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewItem]);

  const activeFolderName = activeFolder ? folders.find(f => f.id === activeFolder)?.name || 'Folder' : 'All Items';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 22% 0%, #f0e9e5 0%, #e8ddd6 35%, #ddd4cc 70%, #d5cac2 100%)',
      color: '#1a1a1a',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        @keyframes bar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }

        * { box-sizing: border-box; }

        .sidebar {
          position: fixed;
          top: 0; left: 0;
          width: 220px;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid rgba(0,0,0,0.06);
          padding: 20px 0 0;
          z-index: 100;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px 12px;
        }
        .sidebar-title {
          font-size: 11px;
          font-weight: 600;
          color: #b5aea8;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .sidebar-close {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #999;
          font-family: inherit;
          padding: 2px 4px;
        }
        .sidebar-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 0 8px;
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 2px;
          font-size: 13px;
          color: #999;
          transition: all 0.12s;
          text-decoration: none;
        }
        .sidebar-item.active {
          color: #1a1a1a;
          background: rgba(0,0,0,0.04);
          font-weight: 600;
        }
        .sidebar-item:not(.active):hover {
          background: rgba(0,0,0,0.02);
        }
        .sidebar-delete {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 11px;
          color: #ccc;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: inherit;
          opacity: 0;
          transition: opacity 0.12s;
          flex-shrink: 0;
        }
        .sidebar-item:hover .sidebar-delete {
          opacity: 1;
        }
        .sidebar-chevron {
          color: #ccc;
        }
        .sidebar-item.active .sidebar-chevron {
          color: #1a1a1a;
        }
        .sidebar-new-folder {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px 14px;
          border-top: 1px solid rgba(0,0,0,0.05);
        }
        .sidebar-input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.8);
          outline: none;
          font-size: 12px;
          font-family: inherit;
        }
        .sidebar-input:focus {
          border-color: rgba(0,0,0,0.18);
        }
        .sidebar-add-btn {
          width: 100%;
          padding: 8px;
          border-radius: 8px;
          border: none;
          background: #1a1a1a;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: 0.05em;
          transition: opacity 0.15s;
        }
        .sidebar-add-btn:hover {
          opacity: 0.85;
        }
        .sidebar-add-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 99;
        }

        .hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          color: #1a1a1a;
        }

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
        .card-action {
          font-size: 10px; padding: 4px 10px; border-radius: 6px;
          border: none; cursor: pointer; font-family: inherit;
          text-decoration: none; transition: opacity 0.15s;
        }
        .card-action:hover { opacity: 0.7; }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .sidebar-close {
            display: block;
          }
          .sidebar-overlay {
            display: block;
          }
          .hamburger {
            display: flex;
          }
          .main-content {
            margin-left: 0 !important;
          }
          .main-content main {
            padding: 16px 14px 80px !important;
          }
        }

        @media (min-width: 769px) {
          .main-content {
            margin-left: 220px;
          }
        }

      `}</style>

      {/* Sidebar */}
      <Sidebar
        tree={tree}
        activeFolder={activeFolder}
        onSelect={navigateToFolder}
        onNewFolder={handleNewFolder}
        onDeleteFolder={handleDeleteFolder}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        expandedSet={expandedSet}
        onToggleExpand={toggleExpanded}
      />

      {/* Main */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 28px',
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#1a1a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7 2v10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
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
              zIndex: 10,
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

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 28px 80px', width: '100%' }}>
          {/* Folder breadcrumb */}
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 20 }}>
            {(activeFolder ? folders.find(f => f.id === activeFolder)?.name : 'All Items') || 'All Items'}
          </div>

          {/* Compose */}
          <form onSubmit={handleSend} style={{ marginBottom: 32 }}>
            <div className="compose-area">
              <textarea
                className="compose-textarea"
                rows={3}
                placeholder={activeFolder ? `Add to ${activeFolderName}…` : "Write something, or attach a file below…"}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend(e); }}
              />
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                borderTop: '1px solid rgba(0,0,0,0.04)',
                flexWrap: 'wrap', gap: 10,
              }}>
                <label htmlFor="fileInput" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#999', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#555'}
                  onMouseLeave={e => e.currentTarget.style.color = '#999'}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v9M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {selectedFile ? selectedFile.name : 'Attach a file'}
                </label>
                <input id="fileInput" type="file" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                <button type="submit" disabled={loading} className="send-btn">
                  {loading ? 'Sending…' : 'Send entry'}
                </button>
              </div>
            </div>
          </form>

          {/* Content */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', color: '#b5aea8', textTransform: 'uppercase' }}>{activeFolderName}</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
              <span style={{ fontSize: 10, color: '#ccc' }}>
                {currentSubfolders.length > 0 && `${currentSubfolders.length} folder${currentSubfolders.length > 1 ? 's' : ''}`}
                {currentSubfolders.length > 0 && history.length > 0 && ' · '}
                {history.length > 0 && `${history.length} file${history.length > 1 ? 's' : ''}`}
                {currentSubfolders.length === 0 && history.length === 0 && 'empty'}
              </span>
            </div>

            {currentSubfolders.length === 0 && history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed rgba(0,0,0,0.06)', borderRadius: 20 }}>
                <p style={{ fontSize: 14, color: '#b5aea8', margin: 0 }}>
                  {activeFolder ? 'This folder is empty.' : 'No transmissions yet. Send your first entry above.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                {currentSubfolders.map(sf => (
                  <FolderCard
                    key={sf.id}
                    folder={sf}
                    itemCount={folderCounts[sf.id]}
                    onNavigate={navigateToFolder}
                  />
                ))}
                {history.map(item => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                    onCopy={copyToClipboard}
                    textContents={textContents}
                    onPreview={setPreviewItem}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  );
}
