import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

// ─── File Type Detection ─────────────────────────────────────────────────────
// Returns a specific type string based on file extension.
// Extend these arrays as new formats are needed in the future.
const FILE_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'],
  video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
  pdf: ['pdf'],
  text: [
    'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'log',
    'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'less', 'html', 'htm',
    'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'swift', 'kt', 'dart', 'lua', 'r',
    'sh', 'bat', 'ps1', 'zsh', 'bash', 'fish',
    'sql', 'pl', 'pm',
    'env', 'gitignore', 'dockerfile', 'makefile',
  ],
  document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
};

function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPES)) {
    if (exts.includes(ext)) return type;
  }
  return 'file'; // fallback for unknown formats
}

// ─── Type Badge Styles ────────────────────────────────────────────────────────
const TYPE_BADGE = {
  text: 'bg-slate-900 text-slate-400',
  image: 'bg-violet-950 text-violet-400',
  video: 'bg-blue-950 text-blue-400',
  audio: 'bg-pink-950 text-pink-400',
  pdf: 'bg-red-950 text-red-400',
  document: 'bg-amber-950 text-amber-400',
  file: 'bg-cyan-950 text-cyan-400',
};

// ─── Google Icon SVG ──────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // App Core State
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [textContents, setTextContents] = useState({});

  // ── Fetch History ────────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('history')
        .select('id, type, content, file_name, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchHistory();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchHistory();
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch Text File Contents ─────────────────────────────────────────────────
  const fetchedRef = useRef({});

  useEffect(() => {
    const textItems = history.filter(
      (item) => item.type !== 'text' && getFileType(item.file_name) === 'text'
    );
    if (textItems.length === 0) return;

    textItems.forEach(async (item) => {
      if (fetchedRef.current[item.id]) return;
      fetchedRef.current[item.id] = true;
      try {
        const res = await fetch(item.content);
        const text = await res.text();
        setTextContents((prev) => ({ ...prev, [item.id]: text }));
      } catch {
        setTextContents((prev) => ({ ...prev, [item.id]: '(Failed to load file content)' }));
      }
    });
  }, [history]);

  // ── Auth Handlers ────────────────────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let error;
    if (isSignUp) {
      ({ error } = await supabase.auth.signUp({ email, password }));
      if (!error) alert('Account created! Check your email for a confirmation link if required.');
    } else {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    }
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) alert(error.message);
  };

  // ── Send Entry ───────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;
    setLoading(true);

    try {
      const userId = session.user.id;
      let payload = {
        user_id: userId,
        type: 'text',
        content: message,
        file_name: null,
      };

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, selectedFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        // Store type based on detected file content
        payload.type = 'file';
        payload.content = publicUrl;
        payload.file_name = selectedFile.name;
      }

      const { error: dbError } = await supabase.from('history').insert([payload]);
      if (dbError) throw dbError;

      setMessage('');
      setSelectedFile(null);
      document.getElementById('fileInput').value = '';
      fetchHistory();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete Entry ─────────────────────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (!confirm('Delete this entry?')) return;

    try {
      // Remove file from storage if applicable
      if (item.type !== 'text' && item.content) {
        const storagePath = item.content.split('/storage/v1/object/public/uploads/')[1];
        if (storagePath) {
          await supabase.storage.from('uploads').remove([storagePath]);
        }
      }

      const { error } = await supabase.from('history').delete().eq('id', item.id);
      if (error) throw error;
      fetchHistory();
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Copy to Clipboard ─────────────────────────────────────────────────────────
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  // ── Login Screen ─────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
          <h2 className="text-3xl font-extrabold text-center bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-6">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 transition font-medium text-sm mb-4"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500">or with email</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Email Address</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-700 focus:outline-none focus:border-emerald-500 text-slate-100"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Password</label>
              <input
                type="password"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-700 focus:outline-none focus:border-emerald-500 text-slate-100"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold hover:opacity-90 active:scale-95 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-cyan-400 hover:underline">
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col items-center p-4 sm:p-8">
      <header className="w-full max-w-3xl flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Portal</h1>
          <p className="text-xs text-slate-400">{session.user.email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-3 py-1.5 border border-slate-700 text-xs text-slate-300 rounded-lg hover:bg-slate-800 transition"
        >
          Sign Out
        </button>
      </header>

      <main className="w-full max-w-3xl space-y-6">
        {/* Input Form */}
        <form onSubmit={handleSend} className="bg-slate-800/40 backdrop-blur-lg border border-slate-700/60 p-5 rounded-2xl shadow-xl space-y-4">
          <textarea
            className="w-full h-24 p-3 bg-slate-900/50 rounded-xl border border-slate-700 resize-none focus:outline-none focus:border-emerald-500 placeholder-slate-500 text-slate-100"
            placeholder="Type your entry or attach a file below..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <input
              id="fileInput"
              type="file"
              className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 file:cursor-pointer"
              onChange={e => setSelectedFile(e.target.files[0])}
            />
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-6 bg-emerald-500 hover:bg-emerald-600 font-semibold rounded-xl active:scale-95 transition disabled:opacity-40 flex items-center justify-center"
            >
              {loading ? 'Sending...' : 'Send Entry'}
            </button>
          </div>
        </form>

        {/* History Feed */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 px-1">Transmission History</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-center text-slate-500 py-8 border border-dashed border-slate-800 rounded-2xl">
                No historical transmissions found.
              </p>
            ) : (
              history.map((item) => {
                const displayType = item.type === 'text' ? 'text' : getFileType(item.file_name || '');

                return (
                  <div key={item.id} className="bg-slate-800/30 border border-slate-800/80 p-4 rounded-xl flex flex-col space-y-2 hover:border-slate-700 transition">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-medium ${TYPE_BADGE[displayType] ?? TYPE_BADGE.file}`}>
                        {displayType.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        {displayType === 'text' && (
                          <button
                            onClick={() => copyToClipboard(
                              item.type === 'text'
                                ? item.content
                                : textContents[item.id] || item.content
                            )}
                            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                            title="Copy text"
                          >
                            Copy
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item)}
                          className="px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-800/70 text-red-400 transition"
                          title="Delete"
                        >
                          Delete
                        </button>
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-slate-200 break-words text-sm">
                      {displayType === 'text' ? (
                        item.type === 'text' ? (
                          <pre className="whitespace-pre-wrap font-mono text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 overflow-x-auto">{item.content}</pre>
                        ) : (
                          <div className="space-y-2">
                            <a href={item.content} target="_blank" rel="noreferrer" className="inline-flex items-center text-cyan-400 hover:underline gap-1.5 text-xs">
                              📎 <span className="font-medium">{item.file_name}</span>
                            </a>
                            <iframe
                              src={item.content}
                              className="w-full h-96 rounded-lg border border-slate-700/50"
                              title={item.file_name || 'File preview'}
                              sandbox="allow-scripts allow-same-origin"
                            />
                          </div>
                        )
                      ) : displayType === 'image' ? (
                        <div className="space-y-2">
                          <a href={item.content} target="_blank" rel="noreferrer" className="inline-flex items-center text-cyan-400 hover:underline gap-1.5 text-xs">
                            📎 <span className="font-medium">{item.file_name}</span>
                          </a>
                          <div className="border border-slate-700/50 rounded-lg overflow-hidden max-w-md">
                            <img src={item.content} alt={item.file_name} className="w-full h-auto object-cover max-h-80" />
                          </div>
                        </div>
                      ) : displayType === 'video' ? (
                        <div className="space-y-2">
                          <a href={item.content} target="_blank" rel="noreferrer" className="inline-flex items-center text-cyan-400 hover:underline gap-1.5 text-xs">
                            📎 <span className="font-medium">{item.file_name}</span>
                          </a>
                          <video controls className="rounded-lg border border-slate-700/50 max-h-80 w-full max-w-md">
                            <source src={item.content} />
                          </video>
                        </div>
                      ) : displayType === 'audio' ? (
                        <div className="space-y-2">
                          <a href={item.content} target="_blank" rel="noreferrer" className="inline-flex items-center text-cyan-400 hover:underline gap-1.5 text-xs">
                            📎 <span className="font-medium">{item.file_name}</span>
                          </a>
                          <audio controls className="w-full">
                            <source src={item.content} />
                          </audio>
                        </div>
                      ) : displayType === 'pdf' ? (
                        <div className="space-y-2">
                          <a href={item.content} target="_blank" rel="noreferrer" className="inline-flex items-center text-cyan-400 hover:underline gap-1.5 text-xs">
                            📎 <span className="font-medium">{item.file_name}</span>
                          </a>
                          <embed src={item.content} type="application/pdf" className="w-full h-96 rounded-lg border border-slate-700/50" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <a href={item.content} target="_blank" rel="noreferrer" className="inline-flex items-center text-cyan-400 hover:underline gap-1.5 text-xs">
                            📎 <span className="font-medium">{item.file_name || 'View Attachment'}</span>
                          </a>
                          <iframe
                            src={item.content}
                            className="w-full h-96 rounded-lg border border-slate-700/50"
                            title={item.file_name || 'File preview'}
                            sandbox="allow-scripts allow-same-origin"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}