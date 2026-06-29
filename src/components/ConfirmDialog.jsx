export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(24px)',
        borderRadius: 20,
        padding: '32px 28px 24px',
        maxWidth: 380,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="#c85c3c" strokeWidth="1.5" fill="rgba(200,92,60,0.08)"/>
          <path d="M16 10v8M16 22v-1" stroke="#c85c3c" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p style={{ margin: 0, fontSize: 14, color: '#444', textAlign: 'center', lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)',
              background: 'white', color: '#999', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: '#1a1a1a', color: 'white', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Delete</button>
        </div>
      </div>
    </div>
  );
}
