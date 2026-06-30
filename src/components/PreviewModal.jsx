import { useState, useEffect } from 'react';

function getFileType(filename) {
  const FILE_TYPES = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico', 'jfif'],
    video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'],
    audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
    pdf: ['pdf'],
    text: ['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'log', 'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'less', 'html', 'htm', 'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'swift', 'kt', 'dart', 'lua', 'r', 'sh', 'bat', 'ps1', 'zsh', 'bash', 'fish', 'sql', 'pl', 'pm', 'env', 'gitignore', 'dockerfile', 'makefile'],
    document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  };
  const ext = (filename || '').split('.').pop().toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return 'file';
}

export default function PreviewModal({ item, onClose }) {
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
        <pre tabIndex={0} style={{ maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: 24, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-tertiary)', background: 'var(--bg-surface-raised)', borderRadius: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', outline: 'none' }}>
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
      background: 'var(--bg-preview-overlay)', backdropFilter: 'blur(12px)',
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
