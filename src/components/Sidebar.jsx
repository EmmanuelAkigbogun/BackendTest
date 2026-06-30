import { useState, useRef, useCallback } from 'react';

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

export default function Sidebar({ tree, activeFolder, onSelect, onNewFolder, onDeleteFolder, onRenameFolder, sidebarOpen, onClose, expandedSet, onToggleExpand, userEmail }) {
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
          <button className="sidebar-close" onClick={onClose}>✕</button>
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
      </div>
    </>
  );
}
