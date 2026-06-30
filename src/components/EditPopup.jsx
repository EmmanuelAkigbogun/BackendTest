export default function EditPopup({ fileName, onEditText, onUploadFile, onCancel }) {
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
        gap: 16,
        alignItems: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="4" width="20" height="20" rx="4" stroke="var(--text-muted)" strokeWidth="1.3" />
          <path d="M19 10l-7 8-3-3" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
          How would you like to edit <strong>{fileName}</strong>?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <button onClick={onEditText} style={{
            width: '100%', padding: '12px', borderRadius: 12, border: 'none',
            background: 'var(--bg-button)', color: 'var(--text-button)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Edit as Text
          </button>
          <button onClick={onUploadFile} style={{
            width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--border-input)',
            background: 'var(--bg-surface)', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Upload Replacement
          </button>
          <button onClick={onCancel} style={{
            width: '100%', padding: '8px', borderRadius: 10, border: 'none',
            background: 'none', color: 'var(--text-muted)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
