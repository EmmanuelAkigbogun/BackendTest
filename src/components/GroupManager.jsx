import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const DEBOUNCE_MS = 300;

export default function GroupManager({ onClose, onLeave }) {
  const [tab, setTab] = useState('my');
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState({});
  const [name, setName] = useState('');
  const [type, setType] = useState('open');
  const [joinName, setJoinName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [pendingCounts, setPendingCounts] = useState({}); // group_id -> { join: N, share: N }
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetail, setGroupDetail] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id;
  };

  const loadJoinedIds = async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
    setJoinedIds(new Set((data || []).map(m => m.group_id)));
    const { data: owned } = await supabase
      .from('groups')
      .select('id')
      .eq('created_by', userId);
    if (owned) owned.forEach(g => setJoinedIds(p => new Set([...p, g.id])));
  };

  useEffect(() => {
    if (tab === 'my') loadMyGroups();
  }, [tab]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!joinName.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .rpc('search_open_groups', { search_term: joinName.trim() });
      if (error) { console.error('search_open_groups error', error); }
      setSearchResults((data || []).filter(r => !joinedIds.has(r.id)));
      setSearching(false);
    }, DEBOUNCE_MS);
  }, [joinName, joinedIds]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUserId(session.user.id);
    });
    loadJoinedIds();
  }, []);

  const loadMyGroups = async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { data: mg } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', userId);
    const memberIds = (mg || []).map(m => m.group_id);
    const { data: owned } = await supabase
      .from('groups')
      .select('*')
      .eq('created_by', userId);
    const { data: joined } = await supabase
      .from('groups')
      .select('*')
      .in('id', memberIds.length ? memberIds : ['00000000-0000-0000-0000-000000000000']);
    const all = [...(owned || []), ...(joined || [])];
    const unique = all.filter((g, i, a) => a.findIndex(x => x.id === g.id) === i);
    setGroups(unique);
    unique.forEach(g => loadMembers(g.id));
    const adminIds = unique.filter(g =>
      g.created_by === userId || (mg || []).some(m => m.group_id === g.id && m.role === 'admin')
    ).map(g => g.id);
    if (adminIds.length) {
      const { data: joinReqs } = await supabase
        .from('group_join_requests')
        .select('group_id, id')
        .in('group_id', adminIds)
        .eq('status', 'pending');
      const byGroup = {};
      (joinReqs || []).forEach(r => {
        if (!byGroup[r.group_id]) byGroup[r.group_id] = { join: 0, share: 0 };
        byGroup[r.group_id].join++;
      });
      const { data: shareReqs } = await supabase
        .from('group_share_requests')
        .select('group_id, id')
        .in('group_id', adminIds)
        .eq('status', 'pending');
      (shareReqs || []).forEach(r => {
        if (!byGroup[r.group_id]) byGroup[r.group_id] = { join: 0, share: 0 };
        byGroup[r.group_id].share++;
      });
      setPendingCounts(byGroup);
    }
  };

  const loadMembers = async (groupId) => {
    const { data } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);
    if (data) setMembers(prev => ({ ...prev, [groupId]: data }));
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const userId = await getUserId();
      const { data: newGroup, error: ge } = await supabase.from('groups').insert([{
        name: name.trim(), type, created_by: userId
      }]).select();
      if (ge) throw ge;
      if (newGroup && newGroup.length > 0) {
        const { error: me } = await supabase.from('group_members').insert([{
          group_id: newGroup[0].id, user_id: userId, role: 'admin'
        }]);
        if (me) throw me;
      }
      setToast(`Group "${name.trim()}" created`);
      setName('');
      loadMyGroups();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const joinGroup = async (grp) => {
    setLoading(true);
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('group_members').insert([{
        group_id: grp.id, user_id: userId, role: 'member'
      }]);
      if (error) throw error;
      setToast(`Joined "${grp.name}"`);
      setJoinName('');
      setSearchResults([]);
      loadMyGroups();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const requestJoin = async (grp) => {
    setLoading(true);
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('group_join_requests').insert([{
        group_id: grp.id, user_id: userId, status: 'pending'
      }]);
      if (error) throw error;
      setToast(`Request sent to join "${grp.name}"`);
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const handleApprove = async (req) => {
    setLoading(true);
    try {
      await supabase.from('group_members').insert([{
        group_id: req.group_id, user_id: req.user_id, role: 'member'
      }]);
      if (req.folder_id) {
        await supabase.from('shared_folders').insert([{
          folder_id: req.folder_id, share_type: 'group',
          shared_with_group: req.group_id, shared_by: currentUserId
        }]);
      }
      await supabase.from('group_join_requests').update({ status: 'approved' }).eq('id', req.id);
      setToast('Request approved');
      loadMyGroups();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const handleReject = async (req) => {
    setLoading(true);
    try {
      await supabase.from('group_join_requests').update({ status: 'rejected' }).eq('id', req.id);
      setToast('Request rejected');
      loadMyGroups();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const handleApproveShare = async (req) => {
    setLoading(true);
    try {
      await supabase.from('shared_folders').insert([{
        folder_id: req.folder_id, share_type: 'group',
        shared_with_group: req.group_id, shared_by: currentUserId
      }]);
      await supabase.from('group_share_requests').update({ status: 'approved' }).eq('id', req.id);
      setToast('Share request approved');
      loadMyGroups();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const handleRejectShare = async (req) => {
    setLoading(true);
    try {
      await supabase.from('group_share_requests').update({ status: 'rejected' }).eq('id', req.id);
      setToast('Share request rejected');
      loadMyGroups();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const openGroupDetail = async (grp) => {
    setLoading(true);
    setSelectedGroup(grp);
    try {
      const { data: mbrs } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', grp.id);
      const { data: joinReqs } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('group_id', grp.id)
        .order('created_at', { ascending: false });
      const { data: shareReqs } = await supabase
        .from('group_share_requests')
        .select('*')
        .eq('group_id', grp.id)
        .order('created_at', { ascending: false });
      const allIds = [...new Set([
        ...(mbrs || []).map(m => m.user_id),
        ...(joinReqs || []).map(r => r.user_id),
        ...(shareReqs || []).map(r => r.user_id)
      ])];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', allIds.length ? allIds : ['00000000-0000-0000-0000-000000000000']);
      const profileMap = {};
      (profs || []).forEach(p => { profileMap[p.id] = p.email; });
      setGroupDetail({ members: mbrs || [], joinRequests: joinReqs || [], shareRequests: shareReqs || [], profileMap });
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const closeGroupDetail = () => {
    setSelectedGroup(null);
    setGroupDetail(null);
  };

  const handleLeaveGroup = async (groupId) => {
    const userId = await getUserId();
    setLoading(true);
    try {
      const { data: grp } = await supabase.from('groups').select('created_by').eq('id', groupId).maybeSingle();
      if (grp && grp.created_by === userId) {
        const { error } = await supabase.from('groups').delete().eq('id', groupId);
        if (error) throw error;
        setToast('Group deleted');
      } else {
        const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
        if (error) throw error;
        setToast('Left group');
      }
      loadMyGroups();
      if (onLeave) onLeave();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const handleRemoveMember = async (member) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('group_members').delete().eq('id', member.id);
      if (error) throw error;
      setToast(`Removed member from group`);
      openGroupDetail(selectedGroup);
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface-raised)', borderRadius: 20, padding: 24, width: 420, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', backdropFilter: 'blur(24px)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Groups</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, fontFamily: 'inherit' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {['my', 'create', 'join'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '6px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: tab === t ? 'var(--bg-button)' : 'var(--card-action-bg)',
              color: tab === t ? 'var(--text-button)' : 'var(--text-muted)',
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
            }}>{t === 'my' ? 'My Groups' : t === 'create' ? 'Create' : 'Join'}</button>
          ))}
        </div>

        {tab === 'my' && (
          <div>
            {groups.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>You haven't joined any groups yet.</p>}
            {groups.map(g => {
              const counts = pendingCounts[g.id];
              const total = counts ? counts.join + counts.share : 0;
              return (
              <div key={g.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span onClick={() => openGroupDetail(g)} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline' }}>{g.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)', marginLeft: 8, textTransform: 'uppercase' }}>{g.type}</span>
                    {total > 0 && (
                      <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--bg-button)' }}>({total} pending)</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleLeaveGroup(g.id)} style={{
                      background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none',
                      borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                    }}>Leave</button>
                  </div>
                </div>
                {members[g.id] && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {members[g.id].map(m => (
                      <span key={m.id} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--card-action-bg)', padding: '2px 8px', borderRadius: 4 }}>
                        {m.role === 'admin'
                          ? <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><path d="M6 1.5L7.5 4.5L10.5 3L9 6.5L10.5 10.5H1.5L3 6.5L1.5 3L4.5 4.5L6 1.5Z"/></svg>
                          : <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><circle cx="6" cy="3.5" r="2.5"/><path d="M0 11.5C0 9 4 8 6 8s6 1 6 3.5"/></svg>}
                        {m.user_id.slice(0, 8)}…
                      </span>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {tab === 'create' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Create a new group</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name" style={{
              width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-input)',
              background: 'var(--bg-input)', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: 'var(--text-input)',
              marginBottom: 10, boxSizing: 'border-box',
            }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['open', 'closed'].map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="radio" name="gtype" checked={type === t} onChange={() => setType(t)} />
                  {t === 'open' ? 'Open (anyone can join)' : 'Closed (creator must approve)'}
                </label>
              ))}
            </div>
            <button onClick={handleCreateGroup} disabled={loading || !name.trim()} style={{
              width: '100%', padding: 8, border: 'none', borderRadius: 8,
              background: 'var(--bg-button)', color: 'var(--text-button)', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            }}>Create Group</button>
          </div>
        )}

        {tab === 'join' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Search groups to join</p>
            <input value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="Type to search groups..." style={{
              width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-input)',
              background: 'var(--bg-input)', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: 'var(--text-input)',
              boxSizing: 'border-box', marginBottom: 8,
            }} />
            {searching && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>Searching...</p>}
            {!searching && joinName.trim() && searchResults.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>No groups found</p>
            )}
            {searchResults.map(g => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)', marginLeft: 8, textTransform: 'uppercase' }}>{g.type}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)', marginLeft: 8 }}>{g.member_count} {g.member_count === 1 ? 'member' : 'members'}</span>
                </div>
                {g.type === 'open' ? (
                  <button onClick={() => joinGroup(g)} disabled={loading} style={{
                    background: 'var(--bg-button)', color: 'var(--text-button)', border: 'none',
                    borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
                  }}>Join</button>
                ) : (
                  <button onClick={() => requestJoin(g)} disabled={loading} style={{
                    background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none',
                    borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                  }}>Request</button>
                )}
              </div>
            ))}
          </div>
        )}

        {toast && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>{toast}</div>}
      </div>

      {selectedGroup && groupDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeGroupDetail}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface-raised)', borderRadius: 20, padding: 24, width: 460, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', backdropFilter: 'blur(24px)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedGroup.name}</span>
              <button onClick={closeGroupDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, fontFamily: 'inherit' }}>✕</button>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)', textTransform: 'uppercase', marginBottom: 12, display: 'inline-block' }}>{selectedGroup.type}</span>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Members</div>
            {groupDetail.members.map(m => {
              const isAdmin = m.user_id === selectedGroup.created_by || m.role === 'admin';
              const canRemove = currentUserId !== m.user_id && (currentUserId === selectedGroup.created_by || groupDetail.members.some(mm => mm.user_id === currentUserId && mm.role === 'admin'));
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{groupDetail.profileMap[m.user_id] || m.user_id.slice(0, 8) + '…'}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)' }}>{isAdmin
                      ? <><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><path d="M6 1.5L7.5 4.5L10.5 3L9 6.5L10.5 10.5H1.5L3 6.5L1.5 3L4.5 4.5L6 1.5Z"/></svg> Admin</>
                      : <><svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{verticalAlign:'middle',marginRight:2}}><circle cx="6" cy="3.5" r="2.5"/><path d="M0 11.5C0 9 4 8 6 8s6 1 6 3.5"/></svg> Member</>}</span>
                    {canRemove && (
                      <button onClick={() => handleRemoveMember(m)} disabled={loading} style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>Remove</button>
                    )}
                  </div>
                </div>
              );
            })}

            {groupDetail.joinRequests.length > 0 && (
              <>
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Join Requests</div>
                {groupDetail.joinRequests.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{groupDetail.profileMap[req.user_id] || req.user_id.slice(0, 8) + '…'}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {req.folder_id && <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)' }}>(from share)</span>}
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => { handleApprove(req); openGroupDetail(selectedGroup); }} disabled={loading} style={{ background: 'var(--bg-button)', color: 'var(--text-button)', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>Approve</button>
                          <button onClick={() => { handleReject(req); openGroupDetail(selectedGroup); }} disabled={loading} style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>Reject</button>
                        </>
                      )}
                      {req.status === 'approved' && <span style={{ fontSize: 10, color: 'var(--bg-button)' }}>Approved</span>}
                      {req.status === 'rejected' && <span style={{ fontSize: 10, color: 'var(--danger)' }}>Rejected</span>}
                    </div>
                  </div>
                ))}
              </>
            )}

            {groupDetail.shareRequests.length > 0 && (
              <>
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Share Requests</div>
                {groupDetail.shareRequests.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{groupDetail.profileMap[req.user_id] || req.user_id.slice(0, 8) + '…'}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)', marginLeft: 6 }}>→ folder {req.folder_id?.slice(0, 8)}…</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => { handleApproveShare(req); openGroupDetail(selectedGroup); }} disabled={loading} style={{ background: 'var(--bg-button)', color: 'var(--text-button)', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>Approve</button>
                          <button onClick={() => { handleRejectShare(req); openGroupDetail(selectedGroup); }} disabled={loading} style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit' }}>Reject</button>
                        </>
                      )}
                      {req.status === 'approved' && <span style={{ fontSize: 10, color: 'var(--bg-button)' }}>Approved</span>}
                      {req.status === 'rejected' && <span style={{ fontSize: 10, color: 'var(--danger)' }}>Rejected</span>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
