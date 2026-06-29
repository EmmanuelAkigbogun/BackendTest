import { useState } from 'react';

export default function FolderCard({ folder, itemCount, onNavigate }) {
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
