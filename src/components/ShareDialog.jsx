import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const DEBOUNCE_MS = 300;

export default function ShareDialog({ folder, onClose }) {
  const [tab, setTab] = useState('all');
  const [email, setEmail] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupResults, setGroupResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [shares, setShares] = useState([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState({});
  const [shareNames, setShareNames] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadShares();
    loadMemberships();
    getUserId().then(setCurrentUserId);
  }, []);

  const loadShares = async () => {
    const { data } = await supabase
      .from('shared_folders')
      .select('*')
      .eq('folder_id', folder.id);
    setShares(data || []);
    if (data) {
      const names = {};
      const userIds = data.filter(s => s.share_type === 'user' && s.shared_with_user).map(s => s.shared_with_user);
      const groupIds = data.filter(s => s.share_type === 'group' && s.shared_with_group).map(s => s.shared_with_group);
      if (userIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', userIds);
        if (profiles) profiles.forEach(p => { names[p.id] = p.email; });
      }
      if (groupIds.length) {
        const { data: groups } = await supabase.from('groups').select('id, name').in('id', groupIds);
        if (groups) groups.forEach(g => { names[g.id] = g.name; });
      }
      setShareNames(names);
    }
  };

  const loadMemberships = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', session.user.id);
    const map = {};
    (data || []).forEach(m => { map[m.group_id] = m.role; });
    setMemberships(map);
  };

  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id;
  };

  const handleShareAll = async () => {
    setLoading(true);
    try {
      if (shares.some(s => s.share_type === 'all')) { setToast('Already shared with everyone'); setLoading(false); return; }
      const userId = await getUserId();
      const { error } = await supabase.from('shared_folders').insert([{
        folder_id: folder.id, share_type: 'all', shared_by: userId
      }]);
      if (error) throw error;
      setToast('Shared with everyone');
      loadShares();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const handleShareByEmail = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data: profiles, error: pe } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle();
      if (pe || !profiles) { setToast('User not found'); setLoading(false); return; }
      const userId = await getUserId();
      const { error } = await supabase.from('shared_folders').insert([{
        folder_id: folder.id, share_type: 'user',
        shared_with_user: profiles.id, shared_by: userId
      }]);
      if (error) throw error;
      setToast(`Shared with ${email.trim()}`);
      setEmail('');
      loadShares();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  const handleShareWithGroup = async (grp) => {
    setLoading(true);
    try {
      const userId = await getUserId();
      const role = memberships[grp.id];
      const alreadyShared = shares.some(s => s.share_type === 'group' && s.shared_with_group === grp.id);
      if (alreadyShared) { setToast(`Already shared with "${grp.name}"`); setLoading(false); return; }
      if (grp.type === 'open' || role === 'admin') {
        const { error } = await supabase.from('shared_folders').insert([{
          folder_id: folder.id, share_type: 'group',
          shared_with_group: grp.id, shared_by: userId
        }]);
        if (error) throw error;
        setToast(`Shared with "${grp.name}"`);
      } else if (role) {
        await supabase.from('group_share_requests').insert([{
          group_id: grp.id, folder_id: folder.id, user_id: userId, status: 'pending'
        }]);
        setToast(`Share request sent — admin must approve`);
      } else {
        const { error } = await supabase.from('group_join_requests').insert([{
          group_id: grp.id, user_id: userId, folder_id: folder.id, status: 'pending'
        }]);
        if (error) throw error;
        setToast(`Join request sent — admin must approve`);
      }
      loadShares();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!groupSearch.trim()) { setGroupResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .rpc('search_shareable_groups', { search_term: groupSearch.trim() });
      if (!error) setGroupResults(data || []);
      setSearching(false);
    }, DEBOUNCE_MS);
  }, [groupSearch]);

  const handleUnshare = async (shareId) => {
    setLoading(true);
    try {
      await supabase.from('shared_folders').delete().eq('id', shareId);
      setToast('Unshared');
      loadShares();
    } catch (err) { setToast(err.message); }
    setLoading(false);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const sharedAll = shares.some(s => s.share_type === 'all');
  const groupShareIds = new Set(shares.filter(s => s.share_type === 'group').map(s => s.shared_with_group));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface-raised)', borderRadius: 20, padding: 24, width: 400, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', backdropFilter: 'blur(24px)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Share &quot;{folder.name}&quot;</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, fontFamily: 'inherit' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {['all', 'user', 'group'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '6px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: tab === t ? 'var(--bg-button)' : 'var(--card-action-bg)',
              color: tab === t ? 'var(--text-button)' : 'var(--text-muted)',
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
            }}>{t === 'all' ? 'Everyone' : t === 'user' ? 'By Email' : 'To Group'}</button>
          ))}
        </div>

        {tab === 'all' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Share with all logged-in users</p>
            <button onClick={handleShareAll} disabled={loading || sharedAll} style={{
              width: '100%', padding: 8, border: 'none', borderRadius: 8,
              background: sharedAll ? 'var(--text-muted-lightest)' : 'var(--bg-button)',
              color: 'var(--text-button)', cursor: sharedAll ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            }}>
              {sharedAll ? 'Already shared with everyone' : 'Share with everyone'}
            </button>
          </div>
        )}

        {tab === 'user' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Share with a person by email</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-input)',
                background: 'var(--bg-input)', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: 'var(--text-input)',
              }} />
              <button onClick={handleShareByEmail} disabled={loading || !email.trim()} style={{
                padding: '8px 14px', border: 'none', borderRadius: 8,
                background: 'var(--bg-button)', color: 'var(--text-button)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              }}>Share</button>
            </div>
          </div>
        )}

        {tab === 'group' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Search groups to share with</p>
            <input value={groupSearch} onChange={e => setGroupSearch(e.target.value)} placeholder="Type to search groups..." style={{
              width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-input)',
              background: 'var(--bg-input)', outline: 'none', fontSize: 12, fontFamily: 'inherit', color: 'var(--text-input)',
              boxSizing: 'border-box', marginBottom: 8,
            }} />
            {searching && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>Searching...</p>}
            {!searching && groupSearch.trim() && groupResults.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>No groups found</p>
            )}
            {groupResults.map(g => {
              const role = memberships[g.id];
              const alreadyShared = groupShareIds.has(g.id);
              return (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)', marginLeft: 8, textTransform: 'uppercase' }}>{g.type}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)', marginLeft: 8 }}>{g.member_count} {g.member_count === 1 ? 'member' : 'members'}</span>
                  </div>
                  {alreadyShared ? (
                    <span style={{ fontSize: 10, color: 'var(--text-muted-lighter)' }}>Shared</span>
                  ) : (
                    <button onClick={() => handleShareWithGroup(g)} disabled={loading} style={{
                      background: 'var(--bg-button)', color: 'var(--text-button)', border: 'none',
                      borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
                    }}>Share</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {shares.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted-lighter)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Shared with</div>
            {shares.map(s => {
              const canUnshare = currentUserId && (s.shared_by === currentUserId || (s.share_type === 'group' && memberships[s.shared_with_group] === 'admin'));
              return (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {s.share_type === 'all' ? 'Everyone' : s.share_type === 'user' ? (shareNames[s.shared_with_user] || `User ${s.shared_with_user?.slice(0, 8)}…`) : (shareNames[s.shared_with_group] || `Group ${s.shared_with_group?.slice(0, 8)}…`)}
                </span>
                {canUnshare && (
                  <button onClick={() => handleUnshare(s.id)} style={{
                    background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none',
                    borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                  }}>Unshare</button>
                )}
              </div>
              );
            })}
          </div>
        )}

        {toast && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>{toast}</div>}
      </div>
    </div>
  );
}
