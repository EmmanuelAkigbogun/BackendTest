import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import MediaCard, { getFileType } from './components/MediaCard';
import FolderCard from './components/FolderCard';
import Sidebar, { buildTree } from './components/Sidebar';
import PreviewModal from './components/PreviewModal';
import ConfirmDialog from './components/ConfirmDialog';
import EditPopup from './components/EditPopup';
import ShareDialog from './components/ShareDialog';
import GroupManager from './components/GroupManager';
import { DashboardDoodles } from './Doodles';
import './DashboardPage.css';

export default function DashboardPage({ session, onSignOut, theme, toggleTheme }) {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
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
  const [editingItem, setEditingItem] = useState(null);
  const [editFileAction, setEditFileAction] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [canPaste, setCanPaste] = useState(false);
  const [pasteBlocked, setPasteBlocked] = useState(0);
  const movableRef = useRef(new Set());

  const [uploadCount, setUploadCount] = useState(0);
  const fetchedRef = useRef({});
  const debounceRef = useRef(null);
  const [shareFolder, setShareFolder] = useState(null);
  const [showGroups, setShowGroups] = useState(false);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [groupPendingCount, setGroupPendingCount] = useState(0);
  const [sharedFoldersMeta, setSharedFoldersMeta] = useState({});
  const [shareNotifCount, setShareNotifCount] = useState(0);
  const [userMap, setUserMap] = useState({});
  const [roleMap, setRoleMap] = useState({});

  const fetchUserMap = useCallback(async (userIds) => {
    if (!userIds.length) return;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    if (profiles) {
      setUserMap(prev => ({ ...prev, ...Object.fromEntries(profiles.map(p => [p.id, p.email])) }));
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      let q = supabase.from('history').select('id, type, content, file_name, created_at, folder_id, edited_at, edited_by, user_id').order('created_at', { ascending: false }).order('id', { ascending: false });
      if (activeFolder) {
        q = q.eq('folder_id', activeFolder);
      } else {
        q = q.is('folder_id', null);
      }
      const { data, error } = await q;
      if (error) throw error;
      let items = data || [];
      const { data: hidden } = await supabase
        .from('hidden_history')
        .select('history_id')
        .eq('user_id', session.user.id);
      if (hidden && hidden.length) {
        const hiddenIds = new Set(hidden.map(h => h.history_id));
        items = items.filter(i => !hiddenIds.has(i.id));
      }
      const { data: personalEdits } = await supabase
        .from('personal_edits')
        .select('*')
        .eq('user_id', session.user.id);
      if (personalEdits) {
        const editMap = {};
        personalEdits.forEach(pe => { editMap[pe.history_id] = pe; });
        items = items.map(item => {
          const pe = editMap[item.id];
          if (pe) return { ...item, content: pe.content, file_name: pe.file_name || item.file_name, edited_at: pe.created_at, edited_by: session.user.id, is_personal_edit: true };
          return item;
        });
      }
      setHistory(items);
      const userIds = [...new Set(items.map(d => d.user_id).filter(Boolean))];
      fetchUserMap(userIds);
    } catch (err) { alert(err.message); }
  }, [activeFolder, session, fetchUserMap]);

  const getSharedInfoForFolder = useCallback(async (folderId) => {
    let currentId = folderId;
    while (currentId) {
      const { data: sfs } = await supabase
        .from('shared_folders')
        .select('shared_by, shared_with_group')
        .eq('folder_id', currentId);
      if (sfs && sfs.length > 0) return sfs;
      const { data: parent } = await supabase
        .from('folders')
        .select('parent_id')
        .eq('id', currentId)
        .maybeSingle();
      if (!parent || !parent.parent_id) break;
      currentId = parent.parent_id;
    }
    return null;
  }, []);

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

  const fetchSharedFolders = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: sfs } = await supabase
        .from('shared_folders')
        .select('folder_id, share_type, shared_by, shared_with_user, shared_with_group');
      if (!sfs || !sfs.length) { setSharedFolders([]); setSharedFoldersMeta({}); return; }
      const folderIds = [...new Set(sfs.map(s => s.folder_id))];
      const { data: folders } = await supabase
        .from('folders')
        .select('id, name, user_id')
        .in('id', folderIds);
      const filtered = (folders || []).filter(f => f.user_id !== session.user.id);
      setSharedFolders(filtered);
      const folderShares = {};
      const userIds = new Set();
      const groupIds = new Set();
      sfs.forEach(s => {
        if (!folderShares[s.folder_id]) folderShares[s.folder_id] = [];
        folderShares[s.folder_id].push({
          share_type: s.share_type,
          shared_by: s.shared_by,
          shared_with_user: s.shared_with_user,
          shared_with_group: s.shared_with_group,
        });
        if (s.shared_by) userIds.add(s.shared_by);
        if (s.share_type === 'group' && s.shared_with_group) groupIds.add(s.shared_with_group);
      });
      const nameMap = {};
      if (userIds.size) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', [...userIds]);
        if (profiles) profiles.forEach(p => { nameMap[p.id] = p.email; });
      }
      if (groupIds.size) {
        const { data: groups } = await supabase.from('groups').select('id, name').in('id', [...groupIds]);
        if (groups) groups.forEach(g => { nameMap[g.id] = g.name; });
      }
      setSharedFoldersMeta({ shares: folderShares, names: nameMap });
    } catch {}
  }, []);

  const fetchPendingCount = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: adminMemberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', session.user.id)
        .eq('role', 'admin');
      const owned = await supabase.from('groups').select('id').eq('created_by', session.user.id);
      const adminIds = [...new Set([...(adminMemberships || []).map(m => m.group_id), ...(owned?.data || []).map(g => g.id)])];
      if (!adminIds.length) { setGroupPendingCount(0); return; }
      const placeholder = '00000000-0000-0000-0000-000000000000';
      const ids = adminIds.length ? adminIds : [placeholder];
      const { data: joinReqs } = await supabase.from('group_join_requests').select('id').in('group_id', ids).eq('status', 'pending');
      const { data: shareReqs } = await supabase.from('group_share_requests').select('id').in('group_id', ids).eq('status', 'pending');
      setGroupPendingCount((joinReqs?.length || 0) + (shareReqs?.length || 0));
    } catch { setGroupPendingCount(0); }
  }, []);

  const fetchShareNotifCount = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      const { data: profile } = await supabase.from('profiles').select('last_viewed_shares_at').eq('id', userId).maybeSingle();
      const since = profile?.last_viewed_shares_at || new Date(0).toISOString();
      const { data: newShares } = await supabase.from('shared_folders').select('id').gte('created_at', since);
      const { data: approvedShareReqs } = await supabase.from('group_share_requests').select('id').eq('user_id', userId).eq('status', 'approved').gte('updated_at', since);
      const { data: approvedJoinReqs } = await supabase.from('group_join_requests').select('id').eq('user_id', userId).eq('status', 'approved').gte('updated_at', since);
      setShareNotifCount((newShares?.length || 0) + (approvedShareReqs?.length || 0) + (approvedJoinReqs?.length || 0));
    } catch { setShareNotifCount(0); }
  }, []);

  const markShareNotifsRead = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from('profiles').update({ last_viewed_shares_at: new Date().toISOString() }).eq('id', session.user.id);
      setShareNotifCount(0);
    } catch {}
  }, []);

  const navigateToFolder = useCallback((id) => {
    setActiveFolder(id);
    if (id) setExpandedSet(prev => new Set([...prev, id]));
  }, []);

  useEffect(() => { fetchFolders(); fetchSharedFolders(); fetchPendingCount(); fetchShareNotifCount(); }, [fetchFolders, fetchSharedFolders, fetchPendingCount, fetchShareNotifCount, session]);
  useEffect(() => { fetchHistory(); }, [activeFolder]);
  useEffect(() => {
    const ids = folders.filter(f => activeFolder ? f.parent_id === activeFolder : !f.parent_id).map(f => f.id);
    fetchFolderCounts(ids);
  }, [activeFolder, folders]);

  useEffect(() => {
    if (!history.length && !activeFolder) { setRoleMap({}); return; }
    const userIds = [...new Set(history.map(d => d.user_id).filter(Boolean))];
    (async () => {
      if (!activeFolder) {
        const rm = {};
        userIds.forEach(uid => { if (uid) rm[uid] = 'member'; });
        setRoleMap(rm);
        return;
      }
      const sfs = await getSharedInfoForFolder(activeFolder);
      if (!sfs) {
        const rm = {};
        userIds.forEach(uid => { if (uid) rm[uid] = 'member'; });
        setRoleMap(rm);
        return;
      }
      const hasGroupShares = sfs.some(s => s.shared_with_group);
      if (hasGroupShares) {
        const groupIds = [...new Set(sfs.map(s => s.shared_with_group).filter(Boolean))];
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id, role')
          .in('group_id', groupIds);
        const rm = {};
        if (members) members.forEach(m => { rm[m.user_id] = m.role; });
        sfs.forEach(s => { if (s.shared_by && !rm[s.shared_by]) rm[s.shared_by] = 'admin'; });
        userIds.forEach(uid => { if (uid && !rm[uid]) rm[uid] = 'member'; });
        setRoleMap(rm);
        if (members) fetchUserMap(members.map(m => m.user_id));
      } else {
        const { data: folder } = await supabase
          .from('folders')
          .select('user_id')
          .eq('id', activeFolder)
          .maybeSingle();
        const rm = {};
        const sharerId = sfs[0]?.shared_by || folder?.user_id;
        if (sharerId) rm[sharerId] = 'admin';
        userIds.forEach(uid => { if (uid && !rm[uid]) rm[uid] = 'member'; });
        setRoleMap(rm);
      }
    })();
  }, [activeFolder, history]);

  useEffect(() => {
    const channel = supabase.channel('db-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'history' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(fetchHistory, 300);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'folders' },
        () => { fetchFolders(); }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'shared_folders' },
        () => { fetchSharedFolders(); fetchFolders(); fetchShareNotifCount(); }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'personal_edits' },
        () => { fetchHistory(); }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeFolder]);

  useEffect(() => {
    if (selectedFiles.length && editFileAction === 'file') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedFiles.length, editFileAction]);

  useEffect(() => {
    const textItems = history.filter(i => i.type !== 'text' && getFileType(i.file_name) === 'text' && !fetchedRef.current[i.id]);
    if (!textItems.length) return;
    textItems.forEach(item => { fetchedRef.current[item.id] = true; });
    Promise.allSettled(textItems.map(async item => {
      try {
        const text = await (await fetch(item.content)).text();
        return { id: item.id, text };
      } catch {
        return { id: item.id, text: '(Failed to load)' };
      }
    })).then(results => {
      const updates = {};
      results.forEach(r => { if (r.status === 'fulfilled') updates[r.value.id] = r.value.text; });
      setTextContents(p => ({ ...p, ...updates }));
    });
  }, [history]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!editingItem && !message.trim() && !selectedFiles.length && !linkMode) return;
    if (!editingItem && linkMode && !message.trim()) return;
    setLoading(true);
    try {
      const userId = session.user.id;

      if (editingItem) {
        let canEditGlobally = editingItem.user_id === userId;
        if (!canEditGlobally && editingItem.folder_id) {
          try {
            const { data: canEdit } = await supabase.rpc('can_edit_in_folder', { fid: editingItem.folder_id });
            canEditGlobally = !!canEdit;
          } catch {
            const { data: sf } = await supabase.from('shared_folders').select('id').eq('folder_id', editingItem.folder_id).eq('shared_by', userId).maybeSingle();
            canEditGlobally = !!sf;
          }
        }
        let updateFields;
        if ((editingItem.type === 'text' || editingItem.type === 'link') && editFileAction !== 'file') {
          updateFields = { content: message, edited_at: new Date().toISOString(), edited_by: userId };
          if (canEditGlobally) {
            const { data: upd, error } = await supabase.from('history').update(updateFields).eq('id', editingItem.id).select();
            if (error) throw error;
            if (!upd || upd.length === 0) throw new Error('Update failed - no permission to edit this item');
          } else {
            const { error } = await supabase.from('personal_edits').upsert({ history_id: editingItem.id, user_id: userId, content: message }, { onConflict: 'history_id, user_id' });
            if (error) throw error;
          }
        } else if (editFileAction === 'text') {
          const fileExt = editingItem.file_name.split('.').pop();
          const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;
          const blob = new Blob([message], { type: 'text/plain' });
          const { error: ue } = await supabase.storage.from('uploads').upload(filePath, blob);
          if (ue) throw ue;
          const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
          if (canEditGlobally) {
            const oldPath = editingItem.content.split('/storage/v1/object/public/uploads/')[1];
            if (oldPath) await supabase.storage.from('uploads').remove([oldPath]).catch(() => {});
            updateFields = { content: publicUrl, edited_at: new Date().toISOString(), edited_by: userId };
            const { data: upd, error: e2 } = await supabase.from('history').update(updateFields).eq('id', editingItem.id).select();
            if (e2) throw e2;
            if (!upd || upd.length === 0) throw new Error('Update failed - no permission to edit this item');
          } else {
            const { error } = await supabase.from('personal_edits').upsert({ history_id: editingItem.id, user_id: userId, content: publicUrl, file_name: editingItem.file_name }, { onConflict: 'history_id, user_id' });
            if (error) throw error;
            updateFields = { content: publicUrl };
          }
        } else if (editFileAction === 'file' && selectedFiles.length) {
          const file = selectedFiles[0];
          const fileExt = file.name.split('.').pop();
          const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;
          const { error: ue } = await supabase.storage.from('uploads').upload(filePath, file);
          if (ue) throw ue;
          const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
          if (canEditGlobally) {
            const oldPath = editingItem.content.split('/storage/v1/object/public/uploads/')[1];
            if (oldPath) await supabase.storage.from('uploads').remove([oldPath]).catch(() => {});
            updateFields = { content: publicUrl, type: 'file', file_name: file.name, edited_at: new Date().toISOString(), edited_by: userId };
            const { data: upd, error: e3 } = await supabase.from('history').update(updateFields).eq('id', editingItem.id).select();
            if (e3) throw e3;
            if (!upd || upd.length === 0) throw new Error('Update failed - no permission to edit this item');
          } else {
            const { error } = await supabase.from('personal_edits').upsert({ history_id: editingItem.id, user_id: userId, content: publicUrl, file_name: file.name }, { onConflict: 'history_id, user_id' });
            if (error) throw error;
            updateFields = { content: publicUrl, file_name: file.name };
          }
        }
        if (updateFields) {
          setHistory(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...updateFields } : item));
        }
        setEditingItem(null); setEditFileAction(null); setMessage(''); setSelectedFiles([]);
        document.getElementById('fileInput').value = '';
        return;
      }

      if (linkMode) {
        const { error: de } = await supabase.from('history').insert([{ user_id: userId, type: 'link', content: message, file_name: null, folder_id: activeFolder }]);
        if (de) throw de;
      } else if (message.trim() && !selectedFiles.length) {
        const { error: de } = await supabase.from('history').insert([{ user_id: userId, type: 'text', content: message, file_name: null, folder_id: activeFolder }]);
        if (de) throw de;
      }
      if (selectedFiles.length) {
        const valid = selectedFiles.filter(f => f.size <= MAX_FILE_SIZE);
        const skipped = selectedFiles.length - valid.length;
        if (skipped) setToast(`${skipped} file${skipped > 1 ? 's' : ''} skipped (exceed 50MB limit)`);
        setUploadCount(0);
        const uploads = valid.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;
          const { error: ue } = await supabase.storage.from('uploads').upload(filePath, file);
          if (ue) throw ue;
          const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
          setUploadCount(prev => prev + 1);
          return { user_id: userId, type: 'file', content: publicUrl, file_name: file.name, folder_id: activeFolder };
        });
        const results = await Promise.allSettled(uploads);
        const records = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        if (records.length) {
          const { error: ie } = await supabase.from('history').insert(records);
          if (ie) throw ie;
        }
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed) setToast(`${failed} upload${failed > 1 ? 's' : ''} failed`);
      }
      setMessage(''); setSelectedFiles([]); setLinkMode(false);
      document.getElementById('fileInput').value = '';
      fetchHistory();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (item) => {
    const isOwner = item.user_id === session.user.id;
    let canDelete = isOwner;
    if (!canDelete && item.folder_id) {
      try {
        const { data: canEdit } = await supabase
          .rpc('can_edit_in_folder', { fid: item.folder_id });
        canDelete = !!canEdit;
      } catch {
        const { data: sf } = await supabase
          .from('shared_folders')
          .select('id')
          .eq('folder_id', item.folder_id)
          .eq('shared_by', session.user.id)
          .maybeSingle();
        canDelete = !!sf;
      }
    }
    setConfirmState({
      message: canDelete ? 'Delete this entry?' : 'Hide this entry from your view?',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          if (canDelete) {
            if (item.type !== 'text' && item.content) {
              const p = item.content.split('/storage/v1/object/public/uploads/')[1];
              if (p) await supabase.storage.from('uploads').remove([p]);
            }
            const { error } = await supabase.from('history').delete().eq('id', item.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('hidden_history').insert([{
              history_id: item.id, user_id: session.user.id
            }]);
            if (error) throw error;
          }
          fetchHistory();
        } catch (err) { alert(err.message); }
      },
    });
  };

  const handleEdit = (item) => {
    if (item.type === 'text') {
      setMessage(item.content);
      setEditingItem(item);
      setEditFileAction(null);
      setLinkMode(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (getFileType(item.file_name) === 'text' || item.type === 'link') {
      setShowEditPopup(item);
    } else {
      setEditingItem(item);
      setEditFileAction('file');
      document.getElementById('fileInput').click();
    }
  };

  const handleEditPopupChoice = (choice) => {
    const item = showEditPopup;
    setShowEditPopup(null);
    if (!item) return;
    setEditingItem(item);
    if (choice === 'text') {
      if (item.type === 'link') {
        setMessage(item.content);
      } else {
        setEditFileAction('text');
        const text = textContents[item.id];
        if (text) {
          setMessage(text);
        } else {
          fetch(item.content).then(r => r.text()).then(t => {
            setMessage(t);
            setTextContents(p => ({ ...p, [item.id]: t }));
          }).catch(() => setMessage('(Failed to load)'));
        }
      }
      setLinkMode(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setEditFileAction('file');
      document.getElementById('fileInput').click();
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditFileAction(null);
    setMessage('');
    setSelectedFiles([]);
    document.getElementById('fileInput').value = '';
  };

  const handleToggleSelectMode = () => {
    setSelectMode(prev => {
      if (prev) setSelectedItems(new Set());
      return !prev;
    });
  };

  const handleToggleSelect = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    const { data: items } = await supabase
      .from('history')
      .select('id, type, content, user_id, folder_id')
      .in('id', [...selectedItems]);
    const ownItems = (items || []).filter(i => i.user_id === session.user.id);
    const otherItems = (items || []).filter(i => i.user_id !== session.user.id);
    let canDeleteOtherIds = [];
    if (otherItems.length) {
      const folderIds = [...new Set(otherItems.map(i => i.folder_id).filter(Boolean))];
      const canDeleteFolderIds = new Set();
      if (folderIds.length) {
        try {
          const { data: editable } = await supabase.rpc('can_edit_in_folders', { fids: folderIds });
          if (editable) editable.forEach(e => canDeleteFolderIds.add(e.folder_id));
        } catch {
          for (const fid of folderIds) {
            try {
              const { data: canEdit } = await supabase.rpc('can_edit_in_folder', { fid });
              if (canEdit) canDeleteFolderIds.add(fid);
            } catch {
              const { data: sf } = await supabase
                .from('shared_folders')
                .select('folder_id')
                .eq('folder_id', fid)
                .eq('shared_by', session.user.id)
                .maybeSingle();
              if (sf) canDeleteFolderIds.add(fid);
            }
          }
        }
      }
      canDeleteOtherIds = otherItems.filter(i => canDeleteFolderIds.has(i.folder_id)).map(i => i.id);
    }
    const toDelete = [...ownItems.map(i => i.id), ...canDeleteOtherIds];
    const toHide = otherItems.filter(i => !canDeleteOtherIds.includes(i.id)).map(i => i.id);
    const willHide = toHide.length > 0;
    const count = selectedItems.size;
    setConfirmState({
      message: willHide ? `Delete ${count} selected ${count === 1 ? 'item' : 'items'}? (some will be hidden from your view)` : `Delete ${count} selected ${count === 1 ? 'item' : 'items'}?`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          for (const item of ownItems) {
            if (item.type !== 'text' && item.content) {
              const p = item.content.split('/storage/v1/object/public/uploads/')[1];
              if (p) await supabase.storage.from('uploads').remove([p]).catch(() => {});
            }
          }
          if (toDelete.length) {
            const { error } = await supabase.from('history').delete().in('id', toDelete);
            if (error) throw error;
          }
          if (toHide.length) {
            const { error } = await supabase.from('hidden_history').insert(
              toHide.map(id => ({ history_id: id, user_id: session.user.id }))
            );
            if (error) throw error;
          }
          setSelectedItems(new Set());
          setSelectMode(false);
          fetchHistory();
        } catch (err) { alert(err.message); }
      },
    });
  };

  useEffect(() => {
    if (!selectMode || selectedItems.size === 0) { setCanPaste(false); setPasteBlocked(0); movableRef.current = new Set(); return; }
    (async () => {
      const { data: items } = await supabase
        .from('history')
        .select('id, user_id, folder_id')
        .in('id', [...selectedItems]);
      const allFids = [...new Set((items || []).map(i => i.folder_id).filter(Boolean))];
      if (activeFolder && !allFids.includes(activeFolder)) allFids.push(activeFolder);
      const accessible = new Set();
      if (allFids.length) {
        const { data: acc } = await supabase.rpc('folders_are_accessible', { fids: allFids });
        if (acc) acc.forEach(a => accessible.add(a.folder_id));
      }
      const movable = new Set();
      let blocked = 0;
      for (const item of items || []) {
        if (item.user_id === session.user.id) { movable.add(item.id); continue; }
        if (item.folder_id && accessible.has(item.folder_id) && activeFolder && accessible.has(activeFolder)) {
          movable.add(item.id);
        } else {
          blocked++;
        }
      }
      movableRef.current = movable;
      setCanPaste(movable.size > 0);
      setPasteBlocked(blocked);
    })();
  }, [selectMode, selectedItems, activeFolder, session.user.id]);

  const handleMoveSelected = (folderId, folderName) => {
    if (selectedItems.size === 0) return;
    const toMove = folderId === activeFolder ? [...movableRef.current] : [...selectedItems];
    if (toMove.length === 0) { alert('No items can be moved here'); return; }
    const totalBlocked = selectedItems.size - toMove.length;
    setConfirmState({
      message: `Move ${toMove.length} item${toMove.length === 1 ? '' : 's'} to "${folderName}"?${totalBlocked > 0 ? ` (${totalBlocked} will be skipped)` : ''}`,
      confirmLabel: 'Move',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const { data: mv, error } = await supabase
            .from('history')
            .update({ folder_id: folderId })
            .in('id', toMove)
            .select();
          if (error) throw error;
          if (!mv || mv.length === 0) throw new Error('Move failed');
          if (mv.length < toMove.length) alert(`Moved ${mv.length} of ${toMove.length} items`);
          setSelectedItems(new Set());
          setSelectMode(false);
          fetchHistory();
        } catch (err) { alert(err.message); }
      },
    });
  };

  const downloadFile = async (item) => {
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
  };

  const handleDownload = async (item) => {
    try { await downloadFile(item); } catch (err) { alert(err.message); }
  };

  const handleDownloadSelected = async () => {
    try {
      const items = history.filter(i => selectedItems.has(i.id));
      setLoading(true);
      for (let i = 0; i < items.length; i++) {
        await downloadFile(items[i]);
        await new Promise(r => setTimeout(r, 300));
      }
      setSelectedItems(new Set());
      setSelectMode(false);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
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

  const handleRenameFolder = async (id, name) => {
    try {
      const { error } = await supabase.from('folders').update({ name }).eq('id', id);
      if (error) throw error;
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
      background: 'var(--bg-page)',
      color: 'var(--text-primary)',
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
        onRenameFolder={handleRenameFolder}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        expandedSet={expandedSet}
        onToggleExpand={toggleExpanded}
        userEmail={session.user.email}
        onGroups={() => setShowGroups(true)}
        sharedFolders={sharedFolders}
        sharedFoldersMeta={sharedFoldersMeta}
        groupPendingCount={groupPendingCount}
        shareNotifCount={shareNotifCount}
        onShareNotifsRead={markShareNotifsRead}
      />

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="app-header">
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 18px',
            background: 'var(--bg-surface-header)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid var(--border-light)',
            flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-icon)',
              }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4a1 1 0 011-1h3.586a1 1 0 01.707.293L8 4h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" fill="white" />
                </svg>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>Folder</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                style={{
                  fontSize: 12, color: 'white', background: 'var(--bg-icon)',
                  border: 'none',
                  borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
                }}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2v2M10 16v2M4 10H2M18 10h-2M5.5 5.5l-1-1M15.5 15.5l1 1M5.5 14.5l-1 1M15.5 5.5l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                )}
              </button>

              <button
              onClick={onSignOut}
              style={{
                fontSize: 12, color: 'var(--text-muted)', background: 'none',
                border: '1px solid var(--border-input)',
                borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >Sign out</button>
          </div>
        </header>
        </div>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 28px 80px', width: '100%' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, textAlign: 'right' }}>
            {(activeFolder ? folders.find(f => f.id === activeFolder)?.name : 'All Items') || 'All Items'}
          </div>

          <form onSubmit={handleSend} style={{ marginBottom: 32 }}>
            <div className="compose-area">
              <textarea
                className="compose-textarea"
                rows={3}
                placeholder={editingItem ? 'Edit content…' : (linkMode ? 'https://example.com' : (activeFolder ? `Add to ${activeFolderName}…` : "Write something, or attach a file below…"))}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend(e); }}
              />
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                borderTop: '1px solid var(--border-light)',
                flexWrap: 'wrap', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!linkMode && (
                    <label htmlFor="fileInput" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v9M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                      {editingItem ? (selectedFiles.length ? selectedFiles[0].name : 'Replace file…') : (selectedFiles.length > 1 ? `${selectedFiles.length} files selected` : selectedFiles.length ? selectedFiles[0].name : 'Attach a file')}
                    </label>
                  )}
                {!editingItem && (
                  <button
                    type="button"
                    onClick={() => { setLinkMode(!linkMode); setSelectedFiles([]); }}
                    className="card-action"
                    style={{
                      background: linkMode ? 'var(--link-mode-bg)' : 'var(--card-action-bg)',
                      color: linkMode ? 'var(--link-mode-color)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M7 8a3 3 0 014-4l2 2a3 3 0 01-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M9 8a3 3 0 01-4 4l-2-2a3 3 0 014-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    Link
                  </button>
                )}
                </div>
                <input id="fileInput" type="file" multiple style={{ display: 'none' }} onChange={e => setSelectedFiles([...e.target.files])} />
                <div style={{ display: 'flex', gap: 8 }}>
                  {editingItem && (
                    <button type="button" onClick={handleCancelEdit} className="send-btn" style={{ background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border-input)' }}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" disabled={loading} className="send-btn">
                    {loading ? (() => { const t = selectedFiles.filter(f => f.size <= MAX_FILE_SIZE).length; return t > 1 ? `Uploading ${uploadCount}/${t} (${Math.round(uploadCount/t*100)}%)…` : 'Saving…'; })() : editingItem ? 'Update entry' : (linkMode ? 'Add link' : 'Send entry')}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', color: 'var(--text-muted-lighter)', textTransform: 'uppercase' }}>{activeFolderName}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {currentSubfolders.length > 0 && `${currentSubfolders.length} folder${currentSubfolders.length > 1 ? 's' : ''}`}
                {currentSubfolders.length > 0 && history.length > 0 && ' · '}
                {history.length > 0 && `${history.length} file${history.length > 1 ? 's' : ''}`}
                {currentSubfolders.length === 0 && history.length === 0 && 'empty'}
              </span>
              {history.length > 0 && (
                <button
                  onClick={async () => {
                    setLoading(true);
                    for (const item of history) {
                      try { await downloadFile(item); await new Promise(r => setTimeout(r, 300)); } catch {}
                    }
                    setLoading(false);
                  }}
                  className="card-action"
                  style={{
                    background: 'var(--card-action-bg)',
                    color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  title="Download all"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v8M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  All
                </button>
              )}
              {selectMode && selectedItems.size > 0 && canPaste && (
                <button
                  onClick={() => handleMoveSelected(activeFolder, activeFolderName)}
                  className="card-action"
                  style={{
                    background: 'var(--bg-button)',
                    color: 'var(--text-button)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 5h10M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Paste{activeFolder ? '' : ' to All Items'}
                </button>
              )}
              <div className="select-btn-group">
                <button
                  onClick={() => {
                    if (!selectMode) setSelectMode(true);
                    if (history.length > 0 && selectedItems.size === history.length) setSelectedItems(new Set());
                    else setSelectedItems(new Set(history.map(h => h.id)));
                  }}
                  className="card-action"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: history.length > 0 && selectedItems.size === history.length ? 'var(--bg-button)' : 'var(--card-action-bg)', color: history.length > 0 && selectedItems.size === history.length ? 'var(--text-button)' : 'var(--text-muted)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    {history.length > 0 && selectedItems.size === history.length && <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />}
                  </svg>
                  All
                </button>
                <button
                  onClick={handleToggleSelectMode}
                  className="card-action"
                  style={{
                    background: selectMode ? 'var(--bg-button)' : 'var(--card-action-bg)',
                    color: selectMode ? 'var(--text-button)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    {selectMode && <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />}
                  </svg>
                  Select
                </button>
              </div>
            </div>

            {selectMode && selectedItems.size > 0 && (
              <div className="selection-bar">
                <span className="selection-count">{selectedItems.size} selected</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => setSelectedItems(new Set())} className="selection-action">Clear</button>
                <button onClick={handleDownloadSelected} className="selection-action">Download</button>
                <button onClick={handleDeleteSelected} className="selection-action selection-action-danger">Delete</button>
              </div>
            )}

            {currentSubfolders.length === 0 && history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed var(--border-subtle)', borderRadius: 20 }}>
                <p style={{ fontSize: 14, color: 'var(--text-muted-lighter)', margin: 0 }}>
                  {activeFolder ? 'This folder is empty.' : 'No transmissions yet. Send your first entry above.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {currentSubfolders.map(sf => (
                  <FolderCard
                    key={sf.id}
                    folder={sf}
                    itemCount={folderCounts[sf.id]}
                    onNavigate={navigateToFolder}
                    selectMode={selectMode}
                    selectedCount={selectedItems.size}
                    onMoveSelected={handleMoveSelected}
                    onShare={setShareFolder}
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
                    onEdit={handleEdit}
                    selectMode={selectMode}
                    selected={selectedItems.has(item.id)}
                    onToggleSelect={handleToggleSelect}
                    userEmail={userMap[item.user_id]}
                    userRole={roleMap[item.user_id]}
                    roleMap={roleMap}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showEditPopup && (
        <EditPopup
          fileName={showEditPopup.file_name}
          onEditText={() => handleEditPopupChoice('text')}
          onUploadFile={() => handleEditPopupChoice('file')}
          onCancel={() => setShowEditPopup(null)}
        />
      )}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 20px', borderRadius: 999,
          background: 'var(--bg-button)', color: 'var(--text-button)',
          fontSize: 12, fontWeight: 500, backdropFilter: 'blur(8px)',
          zIndex: 10000, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px var(--shadow-toast)',
          pointerEvents: 'none',
        }}>{toast}</div>
      )}
      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
          confirmLabel={confirmState.confirmLabel}
        />
      )}
      {shareFolder && <ShareDialog folder={shareFolder} onClose={() => setShareFolder(null)} />}
      {showGroups && <GroupManager onClose={() => { setShowGroups(false); fetchPendingCount(); }} onLeave={() => { fetchSharedFolders(); fetchHistory(); fetchPendingCount(); }} />}
    </div>
  );
}
