import { useState, useEffect, useRef } from 'react';

export const FILE_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'],
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

export default function MediaCard({ item, onDelete, onCopy, textContents, onPreview, onDownload }) {
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
          <button onClick={() => onPreview(item)} className="card-action" style={{ background: 'rgba(0,0,0,0.04)', color: '#999', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M1 8s2.5-5.5 7-5.5S15 8 15 8s-2.5 5.5-7 5.5S1 8 1 8z" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </button>
          {item.type !== 'text' && (
            <a href={item.content} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="card-action" style={{ background: 'rgba(0,0,0,0.04)', color: '#999' }}>Open ↗</a>
          )}
          {item.type === 'text' && (
            <button onClick={() => onCopy(item.content)} className="card-action" style={{ background: 'rgba(0,0,0,0.04)', color: '#999' }}>Copy</button>
          )}
          {item.type === 'link' ? (
            <button onClick={() => onCopy(item.content)} className="card-action" style={{ background: 'rgba(0,0,0,0.04)', color: '#999' }}>Copy URL</button>
          ) : (
            <button onClick={() => onDownload(item)} className="card-action" style={{ background: 'rgba(0,0,0,0.04)', color: '#999' }}>Download</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => onDelete(item)} className="card-action" style={{ background: 'rgba(200,80,60,0.08)', color: '#c85c3c', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
