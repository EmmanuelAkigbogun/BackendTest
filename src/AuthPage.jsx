import { useState } from 'react';
import { supabase } from './supabaseClient';
import { GoogleIcon, Sculpture, Accent } from './Doodles';



export default function AuthPage({ theme, toggleTheme }) {
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
    <div className="auth-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-auth-page)',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        .auth-field {
          width: 100%;
          border: none;
          border-bottom: 1.5px solid var(--text-muted-lighter);
          background: transparent;
          padding: 10px 0;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .auth-field:focus { border-color: var(--text-primary); }
        .auth-field::placeholder { color: var(--text-muted-lighter); }
        .art-float { animation: artFloat 7s ease-in-out infinite; }
        .art-float-slow { animation: artFloat 11s ease-in-out infinite reverse; }
        .art-sway { animation: artSway 9s ease-in-out infinite; }
        .art-sway-slow { animation: artSway 13s ease-in-out infinite reverse; }
        .art-spin { animation: artSpin 20s linear infinite; }
        .art-bounce { animation: artBounce 4s ease-in-out infinite; }
        @keyframes artFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes artSway {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes artSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes artBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .submit-btn {
          width: 100%;
          padding: 12px;
          background: var(--bg-button);
          color: var(--text-button);
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
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
        }
        .google-btn:hover { background: var(--card-action-bg); }
        .toggle-link {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s;
          padding: 0;
        }
        .toggle-link:hover { color: var(--text-primary); }
        @media (max-width: 640px) {
          .auth-form { padding: 28px 20px !important; }
          .auth-heading { font-size: 26px !important; }
          .auth-wordmark { margin-bottom: 36px !important; }
        }
      `}</style>

      {/* ── Background glow & sculpture (behind form) ── */}
      <div style={{
        position: 'absolute',
        width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(210,190,178,0.4) 0%, transparent 68%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>
      <div className="art-float" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 340, height: 420, opacity: 0.18,
        pointerEvents: 'none', zIndex: 0,
      }}>
        <Sculpture/>
      </div>

      {/* ── Scattered interactive accents (edges only, away from form) ── */}
      <Accent className="art-float" x={4} y={8} factor={0.6}>
        <svg width="52" height="52" viewBox="0 0 58 58">
          <circle cx="29" cy="29" r="27" fill="none" stroke="#c0a898" strokeWidth="1.4"/>
          <circle cx="29" cy="29" r="17" fill="none" stroke="#c0a898" strokeWidth="0.7" strokeDasharray="3 4"/>
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={96} y={6} factor={-0.5}>
        <svg width="42" height="42" viewBox="0 0 46 46">
          <polygon points="23,3 43,39 3,39" fill="none" stroke="#b89880" strokeWidth="1.4"/>
        </svg>
      </Accent>
      <Accent className="art-float" x={3} y={92} factor={0.4}>
        <svg width="28" height="28" viewBox="0 0 30 30">
          <rect x="3" y="3" width="24" height="24" rx="3" fill="none" stroke="#b89880" strokeWidth="1.1" transform="rotate(28,15,15)"/>
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={97} y={88} factor={-0.7}>
        <svg width="20" height="20" viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="10" fill="none" stroke="#c0a898" strokeWidth="1"/>
          <line x1="11" y1="1" x2="11" y2="21" stroke="#c0a898" strokeWidth="0.6"/>
          <line x1="1" y1="11" x2="21" y2="11" stroke="#c0a898" strokeWidth="0.6"/>
        </svg>
      </Accent>
      <Accent className="art-float" x={2} y={50} factor={0.8}>
        <svg width="36" height="36" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#b89880" strokeWidth="1" strokeDasharray="2 3"/>
          <circle cx="20" cy="20" r="8" fill="none" stroke="#b89880" strokeWidth="0.8"/>
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={98} y={45} factor={0.3}>
        <svg width="24" height="24" viewBox="0 0 26 26">
          <rect x="3" y="3" width="20" height="20" rx="2" fill="none" stroke="#c0a898" strokeWidth="1" transform="rotate(12,13,13)"/>
          <line x1="13" y1="3" x2="13" y2="23" stroke="#c0a898" strokeWidth="0.6" transform="rotate(12,13,13)"/>
        </svg>
      </Accent>
      <Accent className="art-float" x={50} y={3} factor={-0.4}>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="7" fill="none" stroke="#b89880" strokeWidth="1"/>
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={50} y={97} factor={0.5}>
        <svg width="14" height="14" viewBox="0 0 14 14">
          <polygon points="7,1 13,13 1,13" fill="none" stroke="#c0a898" strokeWidth="0.9"/>
        </svg>
      </Accent>
      <Accent className="art-float" x={94} y={20} factor={-0.3}>
        <svg width="18" height="18" viewBox="0 0 20 20">
          <line x1="1" y1="10" x2="19" y2="10" stroke="#b89880" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="10" y1="1" x2="10" y2="19" stroke="#b89880" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={6} y={30} factor={0.6}>
        <svg width="30" height="30" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="13" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeDasharray="4 5"/>
          <line x1="15" y1="2" x2="15" y2="28" stroke="#c0a898" strokeWidth="0.5"/>
          <line x1="2" y1="15" x2="28" y2="15" stroke="#c0a898" strokeWidth="0.5"/>
        </svg>
      </Accent>
      <Accent className="art-float" x={94} y={70} factor={-0.5}>
        <svg width="22" height="22" viewBox="0 0 22 22">
          <polygon points="11,2 20,20 2,20" fill="none" stroke="#b89880" strokeWidth="1" transform="rotate(180,11,11)"/>
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={5} y={70} factor={0.4}>
        <svg width="26" height="26" viewBox="0 0 26 26">
          <rect x="2" y="2" width="22" height="22" rx="4" fill="none" stroke="#c0a898" strokeWidth="0.9" transform="rotate(35,13,13)"/>
          <circle cx="13" cy="13" r="4" fill="none" stroke="#c0a898" strokeWidth="0.7"/>
        </svg>
      </Accent>

      {/* ── Whimsical doodles ── */}
      <Accent x={90} y={2} factor={0.7}>
        <div className="art-bounce">
        <svg width="32" height="32" viewBox="0 0 32 32">
          {/* tiny cat */}
          <ellipse cx="16" cy="22" rx="8" ry="6" fill="none" stroke="#b89880" strokeWidth="1.1"/>
          <circle cx="16" cy="14" r="6" fill="none" stroke="#b89880" strokeWidth="1.1"/>
          <polygon points="12,10 10,4 14,8" fill="none" stroke="#b89880" strokeWidth="0.9" strokeLinejoin="round"/>
          <polygon points="20,10 22,4 18,8" fill="none" stroke="#b89880" strokeWidth="0.9" strokeLinejoin="round"/>
          <line x1="13" y1="14" x2="15" y2="15" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round"/>
          <line x1="19" y1="14" x2="17" y2="15" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round"/>
          <path d="M14 18 Q16 20 18 18" fill="none" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round"/>
          <line x1="11" y1="25" x2="10" y2="29" stroke="#b89880" strokeWidth="1" strokeLinecap="round"/>
          <line x1="21" y1="25" x2="22" y2="29" stroke="#b89880" strokeWidth="1" strokeLinecap="round"/>
          <path d="M14 26 Q16 28 18 26" fill="none" stroke="#b89880" strokeWidth="0.6" strokeLinecap="round"/>
        </svg>
        </div>
      </Accent>

      <Accent x={2} y={18} factor={-0.6}>
        <div className="art-sway">
        <svg width="28" height="36" viewBox="0 0 28 36">
          {/* little tree */}
          <line x1="14" y1="30" x2="14" y2="20" stroke="#b89880" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M14 22 Q6 16 14 10 Q22 16 14 22" fill="none" stroke="#c0a898" strokeWidth="1" strokeLinecap="round"/>
          <path d="M14 18 Q8 14 14 8 Q20 14 14 18" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeLinecap="round"/>
          <circle cx="12" cy="14" r="1.5" fill="none" stroke="#b89880" strokeWidth="0.5"/>
          <circle cx="16" cy="12" r="1" fill="none" stroke="#b89880" strokeWidth="0.5"/>
          <circle cx="14" cy="10" r="1.2" fill="none" stroke="#b89880" strokeWidth="0.5"/>
        </svg>
        </div>
      </Accent>

      <Accent x={93} y={92} factor={0.5}>
        <div className="art-float">
        <svg width="24" height="24" viewBox="0 0 24 24">
          {/* tiny bird */}
          <path d="M4 14 Q8 8 12 12 Q16 8 20 14" fill="none" stroke="#c0a898" strokeWidth="1" strokeLinecap="round"/>
          <circle cx="18" cy="10" r="2" fill="none" stroke="#b89880" strokeWidth="0.8"/>
          <polygon points="19,9 22,8 19,11" fill="none" stroke="#b89880" strokeWidth="0.7"/>
          <path d="M12 12 L8 18" stroke="#b89880" strokeWidth="0.7" strokeLinecap="round"/>
          <path d="M12 12 L16 18" stroke="#b89880" strokeWidth="0.7" strokeLinecap="round"/>
        </svg>
        </div>
      </Accent>

      <Accent x={48} y={96} factor={-0.4}>
        <div className="art-sway-slow">
        <svg width="20" height="20" viewBox="0 0 20 20">
          {/* crescent moon */}
          <path d="M14 3 A9 9 0 1 0 17 17 A7 7 0 1 1 14 3" fill="none" stroke="#c0a898" strokeWidth="1" strokeLinecap="round"/>
          <circle cx="10" cy="7" r="0.8" fill="none" stroke="#b89880" strokeWidth="0.4"/>
          <circle cx="6" cy="13" r="0.6" fill="none" stroke="#b89880" strokeWidth="0.4"/>
        </svg>
        </div>
      </Accent>

      <Accent x={7} y={80} factor={0.5}>
        <div className="art-float-slow">
        <svg width="22" height="22" viewBox="0 0 22 22">
          {/* flower */}
          <circle cx="11" cy="11" r="2" fill="none" stroke="#c0a898" strokeWidth="0.8"/>
          <ellipse cx="7" cy="9" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" transform="rotate(-30,7,9)"/>
          <ellipse cx="11" cy="6" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7"/>
          <ellipse cx="15" cy="9" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" transform="rotate(30,15,9)"/>
          <ellipse cx="7" cy="13" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" transform="rotate(30,7,13)"/>
          <ellipse cx="15" cy="13" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" transform="rotate(-30,15,13)"/>
          <path d="M11 13 Q9 18 8 21" stroke="#b89880" strokeWidth="0.7" strokeLinecap="round" fill="none"/>
          <path d="M8 21 Q8.5 19 10 19" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
        </svg>
        </div>
      </Accent>

      <Accent x={88} y={55} factor={0.8}>
        <div className="art-spin">
        <svg width="30" height="22" viewBox="0 0 30 22">
          {/* mountains */}
          <path d="M2 20 L10 6 L15 14 L22 4 L28 20" fill="none" stroke="#c0a898" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round"/>
          <path d="M2 20 L28 20" stroke="#c0a898" strokeWidth="0.6" strokeLinecap="round"/>
          <circle cx="18" cy="8" r="1.5" fill="none" stroke="#b89880" strokeWidth="0.5"/>
        </svg>
        </div>
      </Accent>

      <Accent x={45} y={2} factor={-0.7}>
        <div className="art-bounce">
        <svg width="18" height="18" viewBox="0 0 18 18">
          {/* star */}
          <polygon points="9,1 10.5,6.5 16,6.5 11.5,10 13,16 9,12.5 5,16 6.5,10 2,6.5 7.5,6.5" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinejoin="round"/>
        </svg>
        </div>
      </Accent>

      <Accent x={10} y={45} factor={0.4}>
        <div className="art-sway">
        <svg width="16" height="20" viewBox="0 0 16 20">
          {/* candle */}
          <rect x="5" y="8" width="6" height="10" rx="1" fill="none" stroke="#b89880" strokeWidth="0.9"/>
          <path d="M8 8 Q7 5 8 2 Q9 5 8 8" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeLinecap="round"/>
          <ellipse cx="8" cy="2" rx="1.5" ry="1" fill="none" stroke="#c0a898" strokeWidth="0.5"/>
          <line x1="8" y1="18" x2="8" y2="19" stroke="#b89880" strokeWidth="0.6"/>
        </svg>
        </div>
      </Accent>

      <Accent x={92} y={40} factor={-0.5}>
        <div className="art-spin">
        <svg width="16" height="16" viewBox="0 0 16 16">
          {/* snail spiral */}
          <path d="M8 8 Q12 4 12 8 Q12 12 8 12 Q4 12 4 8 Q4 5 7 5 Q9 5 9 7 Q9 8 8 8" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinecap="round"/>
          <line x1="4" y1="13" x2="6" y2="11" stroke="#b89880" strokeWidth="0.6" strokeLinecap="round"/>
        </svg>
        </div>
      </Accent>

      <Accent x={60} y={95} factor={0.3}>
        <div className="art-sway-slow">
        <svg width="24" height="16" viewBox="0 0 24 16">
          {/* waves */}
          <path d="M1 12 Q6 4 12 12 Q18 4 23 12" fill="none" stroke="#c0a898" strokeWidth="1" strokeLinecap="round"/>
          <path d="M1 14 Q6 8 12 14 Q18 8 23 14" fill="none" stroke="#b89880" strokeWidth="0.6" strokeLinecap="round" opacity="0.6"/>
        </svg>
        </div>
      </Accent>

      <Accent x={3} y={55} factor={-0.4}>
        <div className="art-float">
        <svg width="14" height="18" viewBox="0 0 14 18">
          {/* feather */}
          <path d="M7 2 Q4 8 7 16 Q10 8 7 2" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeLinecap="round"/>
          <line x1="7" y1="2" x2="7" y2="16" stroke="#b89880" strokeWidth="0.5"/>
          <path d="M7 6 Q5 7 4 9" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
          <path d="M7 6 Q9 7 10 9" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
          <path d="M7 10 Q5 11 4.5 12" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
          <path d="M7 10 Q9 11 9.5 12" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none"/>
        </svg>
        </div>
      </Accent>

      <Accent x={85} y={82} factor={0.6}>
        <div className="art-float-slow">
        <svg width="18" height="18" viewBox="0 0 18 18">
          {/* butterfly */}
          <path d="M9 9 Q4 2 9 4 Q14 2 9 9" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinecap="round"/>
          <path d="M9 9 Q4 14 9 12 Q14 14 9 9" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinecap="round"/>
          <line x1="9" y1="4" x2="9" y2="12" stroke="#b89880" strokeWidth="0.6"/>
          <line x1="9" y1="9" x2="4" y2="7" stroke="#b89880" strokeWidth="0.4"/>
          <line x1="9" y1="9" x2="14" y2="7" stroke="#b89880" strokeWidth="0.4"/>
          <path d="M9 12 L9 16" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round"/>
        </svg>
        </div>
      </Accent>

      <Accent x={40} y={98} factor={-0.3}>
        <div className="art-bounce">
        <svg width="16" height="16" viewBox="0 0 16 16">
          {/* heart */}
          <path d="M8 13 Q2 8 4 5 Q6 2 8 5 Q10 2 12 5 Q14 8 8 13" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        </div>
      </Accent>

      <Accent x={45} y={1} factor={0.5}>
        <div className="art-spin">
        <svg width="14" height="14" viewBox="0 0 14 14">
          {/* diamond */}
          <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinejoin="round"/>
          <line x1="7" y1="1" x2="7" y2="13" stroke="#b89880" strokeWidth="0.4"/>
          <line x1="1" y1="7" x2="13" y2="7" stroke="#b89880" strokeWidth="0.4"/>
        </svg>
        </div>
      </Accent>

      {/* ── Form ── */}
      <button
        onClick={toggleTheme}
        className="theme-toggle"
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 10,
          fontSize: 12, color: 'white', background: 'var(--bg-icon)',
          border: 'none',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
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

      <div className="auth-form" style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--bg-auth-form)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 48px',
        borderRadius: 20,
        boxShadow: '0 20px 60px var(--shadow-md)',
        position: 'relative',
        zIndex: 2,
        margin: 20,
      }}>
        <div>
          {/* Wordmark */}
          <div className="auth-wordmark" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 56 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-icon)' }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M2 4a1 1 0 011-1h3.586a1 1 0 01.707.293L8 4h5a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" fill="white" />
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--text-primary)' }}>Folder</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 className="auth-heading" style={{ fontSize: 30, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.2 }}>
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
              {isSignUp
                ? 'Your personal media vault, ready in seconds.'
                : 'Sign in to access your transmissions.'}
            </p>
          </div>

          {/* Fields */}
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted-light)', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
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
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted-light)', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
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
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }}/>
            <span style={{ fontSize: 12, color: 'var(--text-muted-lightest)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--separator)' }}/>
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
          <span style={{ fontSize: 11, color: 'var(--text-muted-lightest)' }}>© Folder {new Date().getFullYear()}</span>
          <a href="mailto:help@folder.app" style={{ fontSize: 11, color: 'var(--text-muted-lightest)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="2.5" width="10" height="7" rx="1" stroke="var(--text-muted-lightest)" strokeWidth="1"/>
              <path d="M1 3.5l5 3.5 5-3.5" stroke="var(--text-muted-lightest)" strokeWidth="1"/>
            </svg>
            help@folder.app
          </a>
        </div>
      </div>
    </div>
  );
}
