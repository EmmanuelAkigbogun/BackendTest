import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import MediaCard, { getFileType } from './components/MediaCard';
import FolderCard from './components/FolderCard';
import Sidebar, { buildTree } from './components/Sidebar';
import PreviewModal from './components/PreviewModal';
import ConfirmDialog from './components/ConfirmDialog';
import { DashboardDoodles } from './Doodles';
import './DashboardPage.css';

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
  const [confirmState, setConfirmState] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
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
    if (!message.trim() && !selectedFile && !linkMode) return;
    if (linkMode && !message.trim()) return;
    setLoading(true);
    try {
      const userId = session.user.id;
      let payload;
      if (linkMode) {
        payload = { user_id: userId, type: 'link', content: message, file_name: null, folder_id: activeFolder };
      } else {
        payload = { user_id: userId, type: 'text', content: message, file_name: null, folder_id: activeFolder };
        if (selectedFile) {
          const fileExt = selectedFile.name.split('.').pop();
          const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;
          const { error: ue } = await supabase.storage.from('uploads').upload(filePath, selectedFile);
          if (ue) throw ue;
          const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
          payload = { ...payload, type: 'file', content: publicUrl, file_name: selectedFile.name };
        }
      }
      const { error: de } = await supabase.from('history').insert([payload]);
      if (de) throw de;
      setMessage(''); setSelectedFile(null); setLinkMode(false);
      document.getElementById('fileInput').value = '';
      fetchHistory();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = (item) => {
    setConfirmState({
      message: 'Delete this entry?',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          if (item.type !== 'text' && item.content) {
            const p = item.content.split('/storage/v1/object/public/uploads/')[1];
            if (p) await supabase.storage.from('uploads').remove([p]);
          }
          const { error } = await supabase.from('history').delete().eq('id', item.id);
          if (error) throw error;
          fetchHistory();
        } catch (err) { alert(err.message); }
      },
    });
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

  const handleDeleteFolder = (id) => {
    setConfirmState({
      message: 'Delete this folder and all sub-folders? Items will become uncategorized.',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const { error } = await supabase.from('folders').delete().eq('id', id);
          if (error) throw error;
          if (activeFolder === id) setActiveFolder(null);
          fetchFolders();
          fetchHistory();
        } catch (err) { alert(err.message); }
      },
    });
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
      position: 'relative',
      overflow: 'hidden',
    }}>
      <DashboardDoodles />

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
        userEmail={session.user.email}
      />

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 18px',
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: '#1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 2v10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1 }}>Folder</div>
            </div>

            <button
              onClick={onSignOut}
              style={{
                fontSize: 12, color: '#999', background: 'none',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.target.style.color = '#333'}
              onMouseLeave={e => e.target.style.color = '#999'}
            >Sign out</button>
          </header>
        </div>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 28px 80px', width: '100%' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 20, textAlign: 'right' }}>
            {(activeFolder ? folders.find(f => f.id === activeFolder)?.name : 'All Items') || 'All Items'}
          </div>

          <form onSubmit={handleSend} style={{ marginBottom: 32 }}>
            <div className="compose-area">
              <textarea
                className="compose-textarea"
                rows={3}
                placeholder={linkMode ? 'https://example.com' : (activeFolder ? `Add to ${activeFolderName}…` : "Write something, or attach a file below…")}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!linkMode && (
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
                  )}
                  <button
                    type="button"
                    onClick={() => { setLinkMode(!linkMode); setSelectedFile(null); }}
                    className="card-action"
                    style={{
                      background: linkMode ? 'rgba(52,211,153,0.15)' : 'rgba(0,0,0,0.04)',
                      color: linkMode ? '#34d399' : '#999',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M7 8a3 3 0 014-4l2 2a3 3 0 01-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M9 8a3 3 0 01-4 4l-2-2a3 3 0 014-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    Link
                  </button>
                </div>
                <input id="fileInput" type="file" style={{ display: 'none' }} onChange={e => setSelectedFile(e.target.files[0])} />
                <button type="submit" disabled={loading} className="send-btn">
                  {loading ? 'Sending…' : linkMode ? 'Add link' : 'Send entry'}
                </button>
              </div>
            </div>
          </form>

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

      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 20px', borderRadius: 999,
          background: '#1a1a1a', color: 'white',
          fontSize: 12, fontWeight: 500, backdropFilter: 'blur(8px)',
          zIndex: 10000, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}>{toast}</div>
      )}
      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
