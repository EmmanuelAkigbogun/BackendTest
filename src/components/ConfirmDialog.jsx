export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Delete' }) {
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-surface-raised)',
        backdropFilter: 'blur(24px)',
        borderRadius: 20,
        padding: '32px 28px 24px',
        maxWidth: 380,
        width: '100%',
        boxShadow: '0 20px 60px var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="var(--danger)" strokeWidth="1.5" fill="var(--danger-bg)"/>
          <path d="M16 10v8M16 22v-1" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border-input)',
              background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: 'var(--bg-button)', color: 'var(--text-button)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
