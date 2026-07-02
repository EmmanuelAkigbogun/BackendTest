import { useState, useEffect, useRef } from 'react';
//import
export function Accent({ className, children, x, y, factor = 1 }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      const rx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ry = (e.clientY / window.innerHeight - 0.5) * 2;
      setPos({ x: rx * 12 * factor, y: ry * 12 * factor });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: 'absolute', top: `${y}%`, left: `${x}%`,
        zIndex: 10,
        opacity: 0.5, pointerEvents: 'auto', cursor: 'default',
        transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 0.15s ease-out, opacity 0.3s, scale 0.3s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.scale = '1.4'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.scale = '1'; }}
    >
      {children}
    </div>
  );
}

export function Sculpture() {
  return (
    <svg viewBox="0 0 520 620" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="sg" cx="35%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="45%" stopColor="#ddd6cf" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a89888" stopOpacity="0.82" />
        </radialGradient>
        <radialGradient id="cr" cx="28%" cy="18%" r="72%">
          <stop offset="0%" stopColor="#e8836a" />
          <stop offset="55%" stopColor="#c45e3c" />
          <stop offset="100%" stopColor="#8a3a18" />
        </radialGradient>
        <radialGradient id="ct" cx="28%" cy="18%" r="72%">
          <stop offset="0%" stopColor="#7ababa" />
          <stop offset="55%" stopColor="#488a8a" />
          <stop offset="100%" stopColor="#285858" />
        </radialGradient>
        <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f2ede9" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#cac4be" stopOpacity="0.86" />
        </linearGradient>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d4a090" stopOpacity="0" />
          <stop offset="30%" stopColor="#d4a090" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#c89080" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c89080" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="260" cy="320" rx="180" ry="260" fill="rgba(200,160,140,0.04)" />
      <line x1="40" y1="358" x2="480" y2="340" stroke="url(#lg)" strokeWidth="1.5" />
      <line x1="55" y1="372" x2="465" y2="356" stroke="url(#lg)" strokeWidth="0.7" strokeOpacity="0.4" />

      <g transform="translate(262,505) rotate(-12) scale(1,0.36)">
        <circle cx="0" cy="0" r="108" fill="none" stroke="#c0bcb8" strokeWidth="22" strokeOpacity="0.5" />
        <circle cx="0" cy="0" r="108" fill="none" stroke="#a8a4a0" strokeWidth="7" strokeOpacity="0.28" />
      </g>

      <g transform="translate(275,570)">
        <polygon points="0,-122 52,0 -52,0" fill="url(#cr)" />
        <ellipse cx="0" cy="0" rx="52" ry="15" fill="#a04828" fillOpacity="0.65" />
      </g>

      <g transform="translate(200,320)">
        <path d="M-72,58 Q-72,-76 0,-86 Q72,-76 72,58 L54,58 Q54,-58 0,-64 Q-54,-58 -54,58 Z" fill="url(#mg)" />
        <path d="M-14,-56 Q12,-26 -8,22" stroke="rgba(255,255,255,0.38)" strokeWidth="1" fill="none" />
        <path d="M28,-38 Q18,4 36,32" stroke="rgba(200,195,190,0.28)" strokeWidth="0.7" fill="none" />
      </g>

      <circle cx="240" cy="232" r="60" fill="url(#sg)" />
      <ellipse cx="220" cy="215" rx="17" ry="11" fill="white" fillOpacity="0.5" transform="rotate(-30,220,215)" />

      <g transform="translate(338,118)">
        <polygon points="0,-68 48,38 -48,38" fill="url(#ct)" />
        <ellipse cx="0" cy="38" rx="48" ry="13" fill="#285858" fillOpacity="0.48" />
      </g>

      <g transform="translate(180,180) rotate(12)">
        <polygon points="0,-52 34,28 -34,28" fill="url(#cr)" />
        <ellipse cx="0" cy="28" rx="34" ry="9" fill="#8a3818" fillOpacity="0.48" />
      </g>

      <circle cx="390" cy="265" r="16" fill="#e8ddd8" fillOpacity="0.65" />
      <circle cx="384" cy="259" r="4.5" fill="white" fillOpacity="0.55" />

      <circle cx="100" cy="420" r="9" fill="#c8b4a8" fillOpacity="0.4" />
      <circle cx="420" cy="160" r="7" fill="#b8c8c8" fillOpacity="0.35" />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function DashboardDoodles() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <Accent className="art-float" x={2} y={5} factor={0.6}>
        <svg width="52" height="52" viewBox="0 0 58 58">
          <circle cx="29" cy="29" r="27" fill="none" stroke="#c0a898" strokeWidth="1.4" />
          <circle cx="29" cy="29" r="17" fill="none" stroke="#c0a898" strokeWidth="0.7" strokeDasharray="3 4" />
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={97} y={4} factor={-0.5}>
        <svg width="42" height="42" viewBox="0 0 46 46">
          <polygon points="23,3 43,39 3,39" fill="none" stroke="#b89880" strokeWidth="1.4" />
        </svg>
      </Accent>
      <Accent className="art-float" x={1} y={92} factor={0.4}>
        <svg width="28" height="28" viewBox="0 0 30 30">
          <rect x="3" y="3" width="24" height="24" rx="3" fill="none" stroke="#b89880" strokeWidth="1.1" transform="rotate(28,15,15)" />
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={98} y={88} factor={-0.7}>
        <svg width="20" height="20" viewBox="0 0 22 22">
          <circle cx="11" cy="11" r="10" fill="none" stroke="#c0a898" strokeWidth="1" />
          <line x1="11" y1="1" x2="11" y2="21" stroke="#c0a898" strokeWidth="0.6" />
          <line x1="1" y1="11" x2="21" y2="11" stroke="#c0a898" strokeWidth="0.6" />
        </svg>
      </Accent>
      <Accent className="art-float" x={2} y={52} factor={0.8}>
        <svg width="36" height="36" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#b89880" strokeWidth="1" strokeDasharray="2 3" />
          <circle cx="20" cy="20" r="8" fill="none" stroke="#b89880" strokeWidth="0.8" />
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={98} y={45} factor={0.3}>
        <svg width="24" height="24" viewBox="0 0 26 26">
          <rect x="3" y="3" width="20" height="20" rx="2" fill="none" stroke="#c0a898" strokeWidth="1" transform="rotate(12,13,13)" />
          <line x1="13" y1="3" x2="13" y2="23" stroke="#c0a898" strokeWidth="0.6" transform="rotate(12,13,13)" />
        </svg>
      </Accent>
      <Accent className="art-float" x={96} y={22} factor={-0.3}>
        <svg width="18" height="18" viewBox="0 0 20 20">
          <line x1="1" y1="10" x2="19" y2="10" stroke="#b89880" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="10" y1="1" x2="10" y2="19" stroke="#b89880" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={4} y={30} factor={0.6}>
        <svg width="30" height="30" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="13" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeDasharray="4 5" />
          <line x1="15" y1="2" x2="15" y2="28" stroke="#c0a898" strokeWidth="0.5" />
          <line x1="2" y1="15" x2="28" y2="15" stroke="#c0a898" strokeWidth="0.5" />
        </svg>
      </Accent>
      <Accent className="art-float" x={95} y={72} factor={-0.5}>
        <svg width="22" height="22" viewBox="0 0 22 22">
          <polygon points="11,2 20,20 2,20" fill="none" stroke="#b89880" strokeWidth="1" transform="rotate(180,11,11)" />
        </svg>
      </Accent>
      <Accent className="art-float-slow" x={3} y={72} factor={0.4}>
        <svg width="26" height="26" viewBox="0 0 26 26">
          <rect x="2" y="2" width="22" height="22" rx="4" fill="none" stroke="#c0a898" strokeWidth="0.9" transform="rotate(35,13,13)" />
          <circle cx="13" cy="13" r="4" fill="none" stroke="#c0a898" strokeWidth="0.7" />
        </svg>
      </Accent>
      <Accent x={92} y={2} factor={0.7}>
        <div className="art-bounce">
          <svg width="32" height="32" viewBox="0 0 32 32">
            <ellipse cx="16" cy="22" rx="8" ry="6" fill="none" stroke="#b89880" strokeWidth="1.1" />
            <circle cx="16" cy="14" r="6" fill="none" stroke="#b89880" strokeWidth="1.1" />
            <polygon points="12,10 10,4 14,8" fill="none" stroke="#b89880" strokeWidth="0.9" strokeLinejoin="round" />
            <polygon points="20,10 22,4 18,8" fill="none" stroke="#b89880" strokeWidth="0.9" strokeLinejoin="round" />
            <line x1="13" y1="14" x2="15" y2="15" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round" />
            <line x1="19" y1="14" x2="17" y2="15" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round" />
            <path d="M14 18 Q16 20 18 18" fill="none" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round" />
            <line x1="11" y1="25" x2="10" y2="29" stroke="#b89880" strokeWidth="1" strokeLinecap="round" />
            <line x1="21" y1="25" x2="22" y2="29" stroke="#b89880" strokeWidth="1" strokeLinecap="round" />
            <path d="M14 26 Q16 28 18 26" fill="none" stroke="#b89880" strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </div>
      </Accent>
    </div>
  );
}

export const doodles = (
  <>
    <svg width="52" height="52" viewBox="0 0 58 58">
      <circle cx="29" cy="29" r="27" fill="none" stroke="#c0a898" strokeWidth="1.4" />
      <circle cx="29" cy="29" r="17" fill="none" stroke="#c0a898" strokeWidth="0.7" strokeDasharray="3 4" />
    </svg>
    <svg width="42" height="42" viewBox="0 0 46 46">
      <polygon points="23,3 43,39 3,39" fill="none" stroke="#b89880" strokeWidth="1.4" />
    </svg>
    <svg width="28" height="28" viewBox="0 0 30 30">
      <rect x="3" y="3" width="24" height="24" rx="3" fill="none" stroke="#b89880" strokeWidth="1.1" transform="rotate(28,15,15)" />
    </svg>
    <svg width="20" height="20" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="10" fill="none" stroke="#c0a898" strokeWidth="1" />
      <line x1="11" y1="1" x2="11" y2="21" stroke="#c0a898" strokeWidth="0.6" />
      <line x1="1" y1="11" x2="21" y2="11" stroke="#c0a898" strokeWidth="0.6" />
    </svg>
    <svg width="36" height="36" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="none" stroke="#b89880" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="20" cy="20" r="8" fill="none" stroke="#b89880" strokeWidth="0.8" />
    </svg>
    <svg width="24" height="24" viewBox="0 0 26 26">
      <rect x="3" y="3" width="20" height="20" rx="2" fill="none" stroke="#c0a898" strokeWidth="1" transform="rotate(12,13,13)" />
      <line x1="13" y1="3" x2="13" y2="23" stroke="#c0a898" strokeWidth="0.6" transform="rotate(12,13,13)" />
    </svg>
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" fill="none" stroke="#b89880" strokeWidth="1" />
    </svg>
    <svg width="14" height="14" viewBox="0 0 14 14">
      <polygon points="7,1 13,13 1,13" fill="none" stroke="#c0a898" strokeWidth="0.9" />
    </svg>
    <svg width="18" height="18" viewBox="0 0 20 20">
      <line x1="1" y1="10" x2="19" y2="10" stroke="#b89880" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="1" x2="10" y2="19" stroke="#b89880" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
    <svg width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="13" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeDasharray="4 5" />
      <line x1="15" y1="2" x2="15" y2="28" stroke="#c0a898" strokeWidth="0.5" />
      <line x1="2" y1="15" x2="28" y2="15" stroke="#c0a898" strokeWidth="0.5" />
    </svg>
    <svg width="22" height="22" viewBox="0 0 22 22">
      <polygon points="11,2 20,20 2,20" fill="none" stroke="#b89880" strokeWidth="1" transform="rotate(180,11,11)" />
    </svg>
    <svg width="26" height="26" viewBox="0 0 26 26">
      <rect x="2" y="2" width="22" height="22" rx="4" fill="none" stroke="#c0a898" strokeWidth="0.9" transform="rotate(35,13,13)" />
      <circle cx="13" cy="13" r="4" fill="none" stroke="#c0a898" strokeWidth="0.7" />
    </svg>
  </>
);

export const doodleDoodles = (
  <>
    <div className="art-bounce">
      <svg width="32" height="32" viewBox="0 0 32 32">
        <ellipse cx="16" cy="22" rx="8" ry="6" fill="none" stroke="#b89880" strokeWidth="1.1" />
        <circle cx="16" cy="14" r="6" fill="none" stroke="#b89880" strokeWidth="1.1" />
        <polygon points="12,10 10,4 14,8" fill="none" stroke="#b89880" strokeWidth="0.9" strokeLinejoin="round" />
        <polygon points="20,10 22,4 18,8" fill="none" stroke="#b89880" strokeWidth="0.9" strokeLinejoin="round" />
        <line x1="13" y1="14" x2="15" y2="15" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="19" y1="14" x2="17" y2="15" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M14 18 Q16 20 18 18" fill="none" stroke="#b89880" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="11" y1="25" x2="10" y2="29" stroke="#b89880" strokeWidth="1" strokeLinecap="round" />
        <line x1="21" y1="25" x2="22" y2="29" stroke="#b89880" strokeWidth="1" strokeLinecap="round" />
        <path d="M14 26 Q16 28 18 26" fill="none" stroke="#b89880" strokeWidth="0.6" strokeLinecap="round" />
      </svg>
    </div>
    <div className="art-sway">
      <svg width="28" height="36" viewBox="0 0 28 36">
        <line x1="14" y1="30" x2="14" y2="20" stroke="#b89880" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M14 22 Q6 16 14 10 Q22 16 14 22" fill="none" stroke="#c0a898" strokeWidth="1" strokeLinecap="round" />
        <path d="M14 18 Q8 14 14 8 Q20 14 14 18" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="12" cy="14" r="1.5" fill="none" stroke="#b89880" strokeWidth="0.5" />
        <circle cx="16" cy="12" r="1" fill="none" stroke="#b89880" strokeWidth="0.5" />
        <circle cx="14" cy="10" r="1.2" fill="none" stroke="#b89880" strokeWidth="0.5" />
      </svg>
    </div>
    <div className="art-float">
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M4 14 Q8 8 12 12 Q16 8 20 14" fill="none" stroke="#c0a898" strokeWidth="1" strokeLinecap="round" />
        <circle cx="18" cy="10" r="2" fill="none" stroke="#b89880" strokeWidth="0.8" />
        <polygon points="19,9 22,8 19,11" fill="none" stroke="#b89880" strokeWidth="0.7" />
        <path d="M12 12 L8 18" stroke="#b89880" strokeWidth="0.7" strokeLinecap="round" />
        <path d="M12 12 L16 18" stroke="#b89880" strokeWidth="0.7" strokeLinecap="round" />
      </svg>
    </div>
    <div className="art-sway-slow">
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M14 3 A9 9 0 1 0 17 17 A7 7 0 1 1 14 3" fill="none" stroke="#c0a898" strokeWidth="1" strokeLinecap="round" />
        <circle cx="10" cy="7" r="0.8" fill="none" stroke="#b89880" strokeWidth="0.4" />
        <circle cx="6" cy="13" r="0.6" fill="none" stroke="#b89880" strokeWidth="0.4" />
      </svg>
    </div>
    <div className="art-float-slow">
      <svg width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="2" fill="none" stroke="#c0a898" strokeWidth="0.8" />
        <ellipse cx="7" cy="9" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" transform="rotate(-30,7,9)" />
        <ellipse cx="11" cy="6" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" />
        <ellipse cx="15" cy="9" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" transform="rotate(30,15,9)" />
        <ellipse cx="7" cy="13" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" transform="rotate(30,7,13)" />
        <ellipse cx="15" cy="13" rx="3" ry="1.8" fill="none" stroke="#b89880" strokeWidth="0.7" transform="rotate(-30,15,13)" />
        <path d="M11 13 Q9 18 8 21" stroke="#b89880" strokeWidth="0.7" strokeLinecap="round" fill="none" />
        <path d="M8 21 Q8.5 19 10 19" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
    <div className="art-spin">
      <svg width="30" height="22" viewBox="0 0 30 22">
        <path d="M2 20 L10 6 L15 14 L22 4 L28 20" fill="none" stroke="#c0a898" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M2 20 L28 20" stroke="#c0a898" strokeWidth="0.6" strokeLinecap="round" />
        <circle cx="18" cy="8" r="1.5" fill="none" stroke="#b89880" strokeWidth="0.5" />
      </svg>
    </div>
    <div className="art-bounce">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <polygon points="9,1 10.5,6.5 16,6.5 11.5,10 13,16 9,12.5 5,16 6.5,10 2,6.5 7.5,6.5" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinejoin="round" />
      </svg>
    </div>
    <div className="art-sway">
      <svg width="16" height="20" viewBox="0 0 16 20">
        <rect x="5" y="8" width="6" height="10" rx="1" fill="none" stroke="#b89880" strokeWidth="0.9" />
        <path d="M8 8 Q7 5 8 2 Q9 5 8 8" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeLinecap="round" />
        <ellipse cx="8" cy="2" rx="1.5" ry="1" fill="none" stroke="#c0a898" strokeWidth="0.5" />
        <line x1="8" y1="18" x2="8" y2="19" stroke="#b89880" strokeWidth="0.6" />
      </svg>
    </div>
    <div className="art-spin">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <path d="M8 8 Q12 4 12 8 Q12 12 8 12 Q4 12 4 8 Q4 5 7 5 Q9 5 9 7 Q9 8 8 8" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="4" y1="13" x2="6" y2="11" stroke="#b89880" strokeWidth="0.6" strokeLinecap="round" />
      </svg>
    </div>
    <div className="art-sway-slow">
      <svg width="24" height="16" viewBox="0 0 24 16">
        <path d="M1 12 Q6 4 12 12 Q18 4 23 12" fill="none" stroke="#c0a898" strokeWidth="1" strokeLinecap="round" />
        <path d="M1 14 Q6 8 12 14 Q18 8 23 14" fill="none" stroke="#b89880" strokeWidth="0.6" strokeLinecap="round" opacity="0.6" />
      </svg>
    </div>
    <div className="art-float">
      <svg width="14" height="18" viewBox="0 0 14 18">
        <path d="M7 2 Q4 8 7 16 Q10 8 7 2" fill="none" stroke="#c0a898" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="7" y1="2" x2="7" y2="16" stroke="#b89880" strokeWidth="0.5" />
        <path d="M7 6 Q5 7 4 9" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none" />
        <path d="M7 6 Q9 7 10 9" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none" />
        <path d="M7 10 Q5 11 4.5 12" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none" />
        <path d="M7 10 Q9 11 9.5 12" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
    <div className="art-float-slow">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M9 9 Q4 2 9 4 Q14 2 9 9" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M9 9 Q4 14 9 12 Q14 14 9 9" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="9" y1="4" x2="9" y2="12" stroke="#b89880" strokeWidth="0.6" />
        <line x1="9" y1="9" x2="4" y2="7" stroke="#b89880" strokeWidth="0.4" />
        <line x1="9" y1="9" x2="14" y2="7" stroke="#b89880" strokeWidth="0.4" />
        <path d="M9 12 L9 16" stroke="#b89880" strokeWidth="0.5" strokeLinecap="round" />
      </svg>
    </div>
    <div className="art-bounce">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <path d="M8 13 Q2 8 4 5 Q6 2 8 5 Q10 2 12 5 Q14 8 8 13" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <div className="art-spin">
      <svg width="14" height="14" viewBox="0 0 14 14">
        <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#c0a898" strokeWidth="0.9" strokeLinejoin="round" />
        <line x1="7" y1="1" x2="7" y2="13" stroke="#b89880" strokeWidth="0.4" />
        <line x1="1" y1="7" x2="13" y2="7" stroke="#b89880" strokeWidth="0.4" />
      </svg>
    </div>
  </>
);
