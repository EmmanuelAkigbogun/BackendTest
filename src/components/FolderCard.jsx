import { useState } from 'react';

export default function FolderCard({ folder, itemCount, onNavigate, selectMode, selectedCount, onMoveSelected, onShare }) {
  const [hovered, setHovered] = useState(false);
  const isMoveMode = selectMode && selectedCount > 0;
  return (
    <div
      onClick={() => onNavigate(folder.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 20,
        background: 'var(--bg-surface)',
        border: hovered ? '1px solid var(--border-card-hover)' : '1px solid var(--border-card)',
        boxShadow: hovered ? '0 28px 64px var(--shadow-lg)' : '0 6px 24px var(--shadow-sm)',
        backdropFilter: 'blur(20px)',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, border-color 0.25s, box-shadow 0.25s',
        transform: hovered ? 'translateY(-4px) scale(1.015)' : 'translateY(0) scale(1)',
        padding: '32px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: 180, position: 'relative',
      }}
    >
      {hovered && isMoveMode && (
        <>
          <button
            onClick={e => { e.stopPropagation(); onNavigate(folder.id); }}
            style={{
              position: 'absolute', top: 12, left: 12,
              background: 'var(--card-action-bg)', border: 'none', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--text-muted)', fontSize: 11,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M2 8l6-6 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 6v7a1 1 0 001 1h6a1 1 0 001-1V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Open
          </button>
          <button
            onClick={e => { e.stopPropagation(); onMoveSelected(folder.id, folder.name); }}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'var(--bg-button)', border: 'none', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4,
              color: 'var(--text-button)', fontSize: 11,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 5h10M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Move
          </button>
        </>
      )}
      {hovered && !isMoveMode && onShare && (
        <button
          onClick={e => { e.stopPropagation(); onShare(folder); }}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'var(--card-action-bg)', border: 'none', borderRadius: 6,
            padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
            color: 'var(--text-muted)', fontSize: 11,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 8a2 2 0 100-4 2 2 0 000 4zM12 14a2 2 0 100-4 2 2 0 000 4zM12 6a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3" />
            <path d="M6.5 6.5l3-1M6.5 9.5l3 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Share
        </button>
      )}
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: hovered ? 1 : 0.8, transition: 'opacity 0.2s' }}>
        <path d="M6 12a3 3 0 013-3h10.757a3 3 0 012.122.879L24 12h15a3 3 0 013 3v21a3 3 0 01-3 3H9a3 3 0 01-3-3V12z" fill={hovered ? 'var(--folder-icon-hover)' : 'var(--folder-icon-fill)'} />
        <path d="M6 18h36" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      </svg>
      <span style={{ fontSize: 14, fontWeight: 600, color: hovered ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', wordBreak: 'break-word', transition: 'color 0.2s' }}>
        {folder.name}
      </span>
      {itemCount !== undefined && (
        <span style={{ fontSize: 11, color: 'var(--text-muted-lighter)' }}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      )}
    </div>
  );
}
