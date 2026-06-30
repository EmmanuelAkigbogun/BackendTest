import { useState, useEffect, useRef } from 'react';

export const FILE_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico', 'jfif'],
  video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
  pdf: ['pdf'],
  text: ['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'log', 'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'less', 'html', 'htm', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'swift', 'kt', 'dart', 'lua', 'r', 'sh', 'bat', 'ps1', 'zsh', 'bash', 'fish', 'sql', 'pl', 'pm', 'env', 'gitignore', 'dockerfile', 'makefile'],
  document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
};

export function getFileType(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return 'file';
}

export const TYPE_META = {
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

export default function MediaCard({ item, onDelete, onCopy, textContents, onPreview, onDownload, onEdit, selectMode, selected, onToggleSelect }) {
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
    background: 'var(--bg-surface)',
    border: selected
      ? '1px solid var(--border-card-selected)'
      : hovered
        ? '1px solid var(--border-card-hover)'
        : '1px solid var(--border-card)',
    boxShadow: selected
      ? '0 0 0 2px var(--border-card-selected), 0 28px 64px var(--shadow-lg)'
      : hovered
        ? '0 28px 64px var(--shadow-lg)'
        : '0 6px 24px var(--shadow-sm)',
    backdropFilter: 'blur(20px)',
    transform: hovered && !selectMode
      ? `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-8px) scale(1.025)`
      : 'perspective(900px) rotateX(0) rotateY(0) translateY(0) scale(1)',
    transition: 'transform 0.18s ease, border-color 0.25s, box-shadow 0.25s',
    willChange: 'transform',
  };

  const previewH = 260;

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
          fontFamily: 'monospace', fontSize: 12, color: 'var(--text-preview)',
          lineHeight: 1.7, overflowY: 'auto', boxSizing: 'border-box',
          background: 'var(--preview-bg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{content}</pre>
      );
    }
    if (displayType === 'link') return (
      <iframe src={item.content} style={{ width: '100%', height: '100%', border: 'none', background: 'white', pointerEvents: 'none' }} title="Link Preview" />
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
    <div ref={ref} id={`history-${item.id}`} style={cardStyle} onMouseEnter={onEnter} onMouseLeave={onLeave} onMouseMove={onMove}>
      <div
        style={{ position: 'relative', height: previewH, overflow: 'hidden', cursor: selectMode ? 'default' : 'pointer' }}
        onClick={() => selectMode ? onToggleSelect(item.id) : onPreview(item)}
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: selectMode ? 'none' : 'auto' }}>{renderPreview()}</div>
        {displayType !== 'text' && !hovered && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.06))', pointerEvents: 'none' }} />
        )}
        {selectMode && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            width: 24, height: 24, borderRadius: '50%',
            background: selected ? 'var(--bg-button)' : 'rgba(255,255,255,0.5)',
            border: selected ? 'none' : '2px solid var(--text-muted-lightest)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
          }}>
            {selected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="var(--text-button)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}
      </div>

      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border-light)',
      }}>
        {(() => {
          const displayName = item.file_name || (item.type === 'text' ? (item.content.length > 40 ? item.content.slice(0, 40) + '…' : item.content) : (item.type === 'link' ? (() => { try { return new URL(item.content).hostname.replace('www.', '') } catch { return item.content } })() : null));
          return displayName ? (
            <div style={{ fontSize: 11, color: 'var(--text-muted-lighter)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{displayName}</div>
          ) : null;
        })()}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, overflow: 'hidden' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 6, background: tm.bg, color: tm.color, flexShrink: 0 }}>{tm.label}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted-lightest)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {item.edited_at && (
            <span style={{ fontSize: 10, color: 'var(--text-muted-lightest)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              · edited {new Date(item.edited_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => onPreview(item)} className="card-action" style={{ background: 'var(--card-action-bg)', color: 'var(--card-action-color)', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M1 8s2.5-5.5 7-5.5S15 8 15 8s-2.5 5.5-7 5.5S1 8 1 8z" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </button>
          {item.type !== 'text' && (
            <a href={item.content} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="card-action" style={{ background: 'var(--card-action-bg)', color: 'var(--card-action-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>Open ↗</a>
          )}
          {item.type === 'text' && (
            <button onClick={() => onCopy(item.content)} className="card-action" style={{ background: 'var(--card-action-bg)', color: 'var(--card-action-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>Copy</button>
          )}
          {item.type === 'link' ? (
            <button onClick={() => onCopy(item.content)} className="card-action" style={{ background: 'var(--card-action-bg)', color: 'var(--card-action-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>Copy URL</button>
          ) : (
            <button onClick={() => onDownload(item)} className="card-action" style={{ background: 'var(--card-action-bg)', color: 'var(--card-action-color)', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v8M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => onEdit(item)} className="card-action" style={{
            background: 'var(--card-action-bg)', color: 'var(--card-action-color)',
            padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s',
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M11.5 2.5a1.5 1.5 0 012 2L5 13l-3 1 1-3 8.5-8.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"/>
              <path d="M9.5 4.5l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
          <button onClick={() => onDelete(item)} className="card-action" style={{ background: 'var(--card-action-bg)', color: 'var(--card-action-color)', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M4 4v9.5a1 1 0 001 1h6a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 7v5M10 7v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
