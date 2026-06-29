import { useState } from 'react';
import { supabase } from './supabaseClient';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Sculpture = () => (
  <svg viewBox="0 0 520 620" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <defs>
      <radialGradient id="sg" cx="35%" cy="28%" r="65%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96"/>
        <stop offset="45%" stopColor="#ddd6cf" stopOpacity="0.9"/>
        <stop offset="100%" stopColor="#a89888" stopOpacity="0.82"/>
      </radialGradient>
      <radialGradient id="cr" cx="28%" cy="18%" r="72%">
        <stop offset="0%" stopColor="#e8836a"/>
        <stop offset="55%" stopColor="#c45e3c"/>
        <stop offset="100%" stopColor="#8a3a18"/>
      </radialGradient>
      <radialGradient id="ct" cx="28%" cy="18%" r="72%">
        <stop offset="0%" stopColor="#7ababa"/>
        <stop offset="55%" stopColor="#488a8a"/>
        <stop offset="100%" stopColor="#285858"/>
      </radialGradient>
      <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f2ede9" stopOpacity="0.94"/>
        <stop offset="100%" stopColor="#cac4be" stopOpacity="0.86"/>
      </linearGradient>
      <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#d4a090" stopOpacity="0"/>
        <stop offset="30%" stopColor="#d4a090" stopOpacity="0.55"/>
        <stop offset="70%" stopColor="#c89080" stopOpacity="0.55"/>
        <stop offset="100%" stopColor="#c89080" stopOpacity="0"/>
      </linearGradient>
    </defs>

    <ellipse cx="260" cy="320" rx="180" ry="260" fill="rgba(200,160,140,0.04)"/>

    <line x1="40" y1="358" x2="480" y2="340" stroke="url(#lg)" strokeWidth="1.5"/>
    <line x1="55" y1="372" x2="465" y2="356" stroke="url(#lg)" strokeWidth="0.7" strokeOpacity="0.4"/>

    <g transform="translate(262,505) rotate(-12) scale(1,0.36)">
      <circle cx="0" cy="0" r="108" fill="none" stroke="#c0bcb8" strokeWidth="22" strokeOpacity="0.5"/>
      <circle cx="0" cy="0" r="108" fill="none" stroke="#a8a4a0" strokeWidth="7" strokeOpacity="0.28"/>
    </g>

    <g transform="translate(275,570)">
      <polygon points="0,-122 52,0 -52,0" fill="url(#cr)"/>
      <ellipse cx="0" cy="0" rx="52" ry="15" fill="#a04828" fillOpacity="0.65"/>
    </g>

    <g transform="translate(200,320)">
      <path d="M-72,58 Q-72,-76 0,-86 Q72,-76 72,58 L54,58 Q54,-58 0,-64 Q-54,-58 -54,58 Z" fill="url(#mg)"/>
      <path d="M-14,-56 Q12,-26 -8,22" stroke="rgba(255,255,255,0.38)" strokeWidth="1" fill="none"/>
      <path d="M28,-38 Q18,4 36,32" stroke="rgba(200,195,190,0.28)" strokeWidth="0.7" fill="none"/>
    </g>

    <circle cx="240" cy="232" r="60" fill="url(#sg)"/>
    <ellipse cx="220" cy="215" rx="17" ry="11" fill="white" fillOpacity="0.5" transform="rotate(-30,220,215)"/>

    <g transform="translate(338,118)">
      <polygon points="0,-68 48,38 -48,38" fill="url(#ct)"/>
      <ellipse cx="0" cy="38" rx="48" ry="13" fill="#285858" fillOpacity="0.48"/>
    </g>

    <g transform="translate(180,180) rotate(12)">
      <polygon points="0,-52 34,28 -34,28" fill="url(#cr)"/>
      <ellipse cx="0" cy="28" rx="34" ry="9" fill="#8a3818" fillOpacity="0.48"/>
    </g>

    <circle cx="390" cy="265" r="16" fill="#e8ddd8" fillOpacity="0.65"/>
    <circle cx="384" cy="259" r="4.5" fill="white" fillOpacity="0.55"/>

    <circle cx="100" cy="420" r="9" fill="#c8b4a8" fillOpacity="0.4"/>
    <circle cx="420" cy="160" r="7" fill="#b8c8c8" fillOpacity="0.35"/>
  </svg>
);

export default function AuthPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let error;
    if (isSignUp) {
      ({ error } = await supabase.auth.signUp({ email, password }));
      if (!error) alert('Check your email to confirm your account.');
    } else {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    }
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) alert(error.message);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#e8e0db',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        .auth-field {
          width: 100%;
          border: none;
          border-bottom: 1.5px solid #ccc5be;
          background: transparent;
          padding: 10px 0;
          font-size: 14px;
          color: #1a1a1a;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .auth-field:focus { border-color: #1a1a1a; }
        .auth-field::placeholder { color: #b5aea8; }
        .art-float { animation: artFloat 7s ease-in-out infinite; }
        .art-float-slow { animation: artFloat 11s ease-in-out infinite reverse; }
        @keyframes artFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .submit-btn {
          width: 100%;
          padding: 12px;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s, transform 0.1s;
        }
        .submit-btn:hover { opacity: 0.85; }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 11px;
          background: white;
          border: 1px solid #e0d9d4;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
        }
        .google-btn:hover { background: #f9f5f2; }
        .toggle-link {
          background: none;
          border: none;
          color: #888;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s;
          padding: 0;
        }
        .toggle-link:hover { color: #1a1a1a; }
      `}</style>

      {/* ── Left: Form ── */}
      <div style={{
        width: '46%',
        minWidth: 360,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        position: 'relative',
        zIndex: 2,
      }}>
        <div>
          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 56 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a1a1a' }}/>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.06em', color: '#1a1a1a' }}>Portal</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, color: '#111', margin: '0 0 8px', lineHeight: 1.2 }}>
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h1>
            <p style={{ fontSize: 14, color: '#999', margin: 0 }}>
              {isSignUp
                ? 'Your personal media vault, ready in seconds.'
                : 'Sign in to access your transmissions.'}
            </p>
          </div>

          {/* Fields */}
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#aaa', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
              <input
                className="auth-field"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#aaa', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
              <input
                className="auth-field"
                type="password"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn" style={{ marginTop: 8 }}>
              {loading ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#f0ebe8' }}/>
            <span style={{ fontSize: 12, color: '#ccc' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#f0ebe8' }}/>
          </div>

          <button className="google-btn" onClick={handleGoogle}>
            <GoogleIcon/>
            Continue with Google
          </button>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button className="toggle-link" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
          <span style={{ fontSize: 11, color: '#ccc' }}>© Portal {new Date().getFullYear()}</span>
          <a href="mailto:help@portal.app" style={{ fontSize: 11, color: '#ccc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="2.5" width="10" height="7" rx="1" stroke="#ccc" strokeWidth="1"/>
              <path d="M1 3.5l5 3.5 5-3.5" stroke="#ccc" strokeWidth="1"/>
            </svg>
            help@portal.app
          </a>
        </div>
      </div>

      {/* ── Right: Art ── */}
      <div style={{
        flex: 1,
        background: '#ddd6cf',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(210,190,178,0.38) 0%, transparent 68%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }}/>

        {/* Main sculpture */}
        <div className="art-float" style={{ width: 360, height: 440, position: 'relative', zIndex: 2 }}>
          <Sculpture/>
        </div>

        {/* Orbiting geometric accents */}
        <div className="art-float-slow" style={{ position: 'absolute', top: '11%', left: '7%', opacity: 0.38 }}>
          <svg width="58" height="58" viewBox="0 0 58 58">
            <circle cx="29" cy="29" r="27" fill="none" stroke="#c0a898" strokeWidth="1.4"/>
            <circle cx="29" cy="29" r="17" fill="none" stroke="#c0a898" strokeWidth="0.7" strokeDasharray="3 4"/>
          </svg>
        </div>
        <div className="art-float" style={{ position: 'absolute', bottom: '13%', right: '9%', opacity: 0.3 }}>
          <svg width="46" height="46" viewBox="0 0 46 46">
            <polygon points="23,3 43,39 3,39" fill="none" stroke="#b89880" strokeWidth="1.4"/>
          </svg>
        </div>
        <div className="art-float-slow" style={{ position: 'absolute', top: '31%', right: '6%', opacity: 0.26 }}>
          <svg width="30" height="30" viewBox="0 0 30 30">
            <rect x="3" y="3" width="24" height="24" rx="3" fill="none" stroke="#b89880" strokeWidth="1.1" transform="rotate(28,15,15)"/>
          </svg>
        </div>
        <div className="art-float" style={{ position: 'absolute', top: '62%', left: '9%', opacity: 0.22 }}>
          <svg width="22" height="22" viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="10" fill="none" stroke="#c0a898" strokeWidth="1"/>
            <line x1="11" y1="1" x2="11" y2="21" stroke="#c0a898" strokeWidth="0.6"/>
            <line x1="1" y1="11" x2="21" y2="11" stroke="#c0a898" strokeWidth="0.6"/>
          </svg>
        </div>

        {/* Caption */}
        <p style={{
          position: 'absolute',
          bottom: 36,
          fontSize: 11,
          letterSpacing: '0.2em',
          color: '#b8b0a8',
          textTransform: 'uppercase',
          fontWeight: 300,
          margin: 0,
        }}>
          Your transmissions, beautifully kept
        </p>
      </div>
    </div>
  );
}
