import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function NotifPopup({ shareNotifCount, onShareNotifsRead }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const wasOpenRef = useRef(false);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setItems([]); setLoading(false); return; }
      const userId = session.user.id;
      const { data: profile } = await supabase.from('profiles').select('last_viewed_shares_at').eq('id', userId).maybeSingle();
      const since = profile?.last_viewed_shares_at || new Date(0).toISOString();
      const results = [];
      const { data: dismissed } = await supabase.from('dismissed_notifications').select('source_table, source_id').eq('user_id', userId);
      const dismissedSet = new Set((dismissed || []).map(d => d.source_table + ':' + d.source_id));

      const { data: newShares } = await supabase.from('shared_folders').select('id, folder_id, share_type, shared_by, shared_with_group, created_at').gte('created_at', since);
      if (newShares) {
        const folderIds = [...new Set(newShares.map(s => s.folder_id))];
        const { data: folders } = folderIds.length ? await supabase.from('folders').select('id, name').in('id', folderIds) : { data: [] };
        const folderMap = Object.fromEntries((folders || []).map(f => [f.id, f.name]));
        const sharerIds = [...new Set(newShares.map(s => s.shared_by))];
        const { data: sharers } = sharerIds.length ? await supabase.from('profiles').select('id, email').in('id', sharerIds) : { data: [] };
        const sharerMap = Object.fromEntries((sharers || []).map(p => [p.id, p.email]));
        const groupIds = [...new Set(newShares.filter(s => s.share_type === 'group' && s.shared_with_group).map(s => s.shared_with_group))];
        const { data: groups } = groupIds.length ? await supabase.from('groups').select('id, name').in('id', groupIds) : { data: [] };
        const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g.name]));
        newShares.forEach(s => {
          if (dismissedSet.has('shared_folders:' + s.id)) return;
          const sharer = sharerMap[s.shared_by] || s.shared_by?.slice(0, 8);
          const folderName = folderMap[s.folder_id] || 'a folder';
          let msg;
          if (s.share_type === 'all') msg = `${sharer} shared "${folderName}" with everyone`;
          else if (s.share_type === 'group') msg = `${sharer} shared "${folderName}" with group "${groupMap[s.shared_with_group] || 'unknown'}"`;
          else msg = `${sharer} shared "${folderName}" with you`;
          results.push({ id: crypto.randomUUID(), dbId: s.id, sourceTable: 'shared_folders', message: msg, created_at: s.created_at });
        });
      }
      const { data: approvedShareReqs } = await supabase.from('group_share_requests').select('id, group_id, updated_at').eq('user_id', userId).eq('status', 'approved').gte('updated_at', since);
      if (approvedShareReqs) {
        const gIds = [...new Set(approvedShareReqs.map(r => r.group_id))];
        const { data: groups } = gIds.length ? await supabase.from('groups').select('id, name').in('id', gIds) : { data: [] };
        const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g.name]));
        approvedShareReqs.forEach(r => {
          if (dismissedSet.has('group_share_requests:' + r.id)) return;
          results.push({ id: crypto.randomUUID(), dbId: r.id, sourceTable: 'group_share_requests', message: `Share request approved for group "${groupMap[r.group_id] || 'unknown'}"`, created_at: r.updated_at });
        });
      }
      const { data: approvedJoinReqs } = await supabase.from('group_join_requests').select('id, group_id, updated_at').eq('user_id', userId).eq('status', 'approved').gte('updated_at', since);
      if (approvedJoinReqs) {
        const gIds = [...new Set(approvedJoinReqs.map(r => r.group_id))];
        const { data: groups } = gIds.length ? await supabase.from('groups').select('id, name').in('id', gIds) : { data: [] };
        const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g.name]));
        approvedJoinReqs.forEach(r => {
          if (dismissedSet.has('group_join_requests:' + r.id)) return;
          results.push({ id: crypto.randomUUID(), dbId: r.id, sourceTable: 'group_join_requests', message: `Join request approved for group "${groupMap[r.group_id] || 'unknown'}"`, created_at: r.updated_at });
        });
      }
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setItems(results.slice(0, 50));
    } catch {}
    setLoading(false);
  }, []);

  const dismissItem = useCallback(async (item) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && item.sourceTable && item.dbId) {
        await supabase.from('dismissed_notifications').upsert(
          { user_id: session.user.id, source_table: item.sourceTable, source_id: item.dbId },
          { onConflict: 'user_id, source_table, source_id' }
        );
      }
    } catch {}
    setItems(prev => prev.filter(i => i.id !== item.id));
  }, []);

  const handleClick = () => {
    if (!open) fetchNotifs();
    setOpen(!open);
  };

  useEffect(() => {
    if (open) wasOpenRef.current = true;
    if (!open && wasOpenRef.current && shareNotifCount > 0) onShareNotifsRead();
  }, [open, shareNotifCount, onShareNotifsRead]);

  return (
    <>
      <button onClick={handleClick} title="Notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0, border: 'none', borderRadius: 8, background: 'var(--card-action-bg)', cursor: 'pointer', color: 'var(--text-muted)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {shareNotifCount > 0 && !open && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 999, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{shareNotifCount > 9 ? '9+' : shareNotifCount}</span>
        )}
      </button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface-raised)', borderRadius: 16, width: 380, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</div>
              <button onClick={() => setOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--card-action-bg)', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '12px 20px 20px', overflow: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
              ) : items.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted-lighter)' }}>No new notifications</div>
              ) : (
                items.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', fontSize: 12, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', lineHeight: 1.4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>{item.message}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted-lighter)', marginTop: 3 }}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <button onClick={() => dismissItem(item)} style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted-lighter)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginTop: 1 }}>✕</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShareTooltip({ meta, names }) {
  const lines = [];
  (meta || []).forEach(s => {
    const sharer = names?.[s.shared_by] || s.shared_by?.slice(0, 8) || 'someone';
    if (s.share_type === 'all') {
      lines.push(`Shared by ${sharer} with everyone`);
    } else if (s.share_type === 'user') {
      const target = names?.[s.shared_with_user] || s.shared_with_user?.slice(0, 8) || 'unknown';
      lines.push(`Shared by ${sharer} with ${target}`);
    } else if (s.share_type === 'group') {
      const target = names?.[s.shared_with_group] || s.shared_with_group?.slice(0, 8) || 'unknown';
      lines.push(`Shared by ${sharer} with group "${target}"`);
    }
  });
  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)',
      borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'var(--text-secondary)',
      whiteSpace: 'nowrap', zIndex: 300, boxShadow: '0 4px 12px var(--shadow-sm)',
      pointerEvents: 'none',
    }}>
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

export function buildTree(folders) {
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

export function getAllDescendantIds(folders, parentId) {
  const ids = [parentId];
  folders.filter(f => f.parent_id === parentId).forEach(child => {
    ids.push(...getAllDescendantIds(folders, child.id));
  });
  return ids;
}

function FolderTreeNode({ node, depth, activeFolder, expandedSet, onToggleExpand, onSelect, onDeleteFolder, onRenameFolder, onClose }) {
  const isActive = activeFolder === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedSet.has(node.id);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const inputRef = useRef(null);

  const handleClick = () => {
    if (isActive && hasChildren) {
      onToggleExpand(node.id);
    } else {
      onSelect(node.id);
    }
  };

  const startRename = (e) => {
    e.stopPropagation();
    setRenameValue(node.name);
    setRenaming(true);
    setTimeout(() => { if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, 0);
  };

  const submitRename = () => {
    if (renameValue.trim() && renameValue.trim() !== node.name) {
      onRenameFolder(node.id, renameValue.trim());
    }
    setRenaming(false);
  };

  const handleRenameKey = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { submitRename(); }
    if (e.key === 'Escape') { setRenaming(false); }
  };

  return (
    <div>
      <div
        onClick={renaming ? undefined : handleClick}
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
          <path d="M2 4a1 1 0 011-1h3.586a1 1 0 01.707.293L8 4h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" fill={isActive ? 'var(--text-primary)' : 'var(--folder-icon-fill)'} />
        </svg>
        {renaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKey}
            onBlur={submitRename}
            onClick={e => e.stopPropagation()}
            className="sidebar-input"
            style={{ flex: 1, minWidth: 120, fontSize: 13, padding: '2px 6px', height: 24 }}
          />
        ) : (
          <span style={{ whiteSpace: 'nowrap' }}>{node.name}</span>
        )}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button onClick={startRename} className="sidebar-delete" title="Rename" style={{ fontSize: 11, marginLeft: 0 }}>✎</button>
          <button onClick={e => { e.stopPropagation(); onDeleteFolder(node.id); }} className="sidebar-delete" style={{ marginLeft: 0 }}>✕</button>
        </div>
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
              onRenameFolder={onRenameFolder}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ tree, activeFolder, onSelect, onNewFolder, onDeleteFolder, onRenameFolder, sidebarOpen, onClose, expandedSet, onToggleExpand, userEmail, onGroups, sharedFolders, sharedFoldersMeta, groupPendingCount, shareNotifCount, onShareNotifsRead }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  const submit = useCallback(() => {
    if (name.trim()) { onNewFolder(name.trim()); setName(''); }
  }, [name, onNewFolder]);

  return (
    <>
      {sidebarOpen && <div onClick={onClose} className="sidebar-overlay" />}

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <div className="sidebar-title">Folders</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted-lightest)', marginTop: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{userEmail}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <NotifPopup shareNotifCount={shareNotifCount} onShareNotifsRead={onShareNotifsRead} />
            <button onClick={onGroups} className="sidebar-groups-btn" title="Groups" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0, border: 'none', borderRadius: 8, background: 'var(--card-action-bg)', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 20v-1a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {groupPendingCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 999, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{groupPendingCount > 9 ? '9+' : groupPendingCount}</span>
              )}
            </button>
            <button className="sidebar-close" onClick={onClose}>✕</button>
          </div>
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
              onRenameFolder={onRenameFolder}
              onClose={onClose}
            />
          ))}

          {sharedFolders && sharedFolders.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted-lighter)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '16px 12px 4px' }}>Shared with me</div>
              {sharedFolders.map(sf => (
                <div
                  key={sf.id}
                  onClick={() => { onSelect(sf.id); onClose(); }}
                  className={`sidebar-item ${activeFolder === sf.id ? 'active' : ''}`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M2 4a1 1 0 011-1h3.586a1 1 0 01.707.293L8 4h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" fill="var(--folder-icon-fill)" />
                  </svg>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sf.name}</span>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted-lighter)', cursor: 'default' }}
                      onMouseEnter={e => { e.currentTarget.dataset.hover = 'true'; e.currentTarget.parentElement.querySelector('.share-tooltip').style.display = 'block'; }}
                      onMouseLeave={e => { e.currentTarget.parentElement.querySelector('.share-tooltip').style.display = 'none'; }}
                    >shared</span>
                    <div className="share-tooltip" style={{ display: 'none', position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', zIndex: 300 }}>
                      <ShareTooltip meta={sharedFoldersMeta?.shares?.[sf.id]} names={sharedFoldersMeta?.names} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
