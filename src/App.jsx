import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthPage from './AuthPage';
import DashboardPage from './DashboardPage';

export default function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.className = theme === 'dark' ? 'dark' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = () => supabase.auth.signOut();

  if (!session) return <AuthPage onSignIn={() => {}} theme={theme} toggleTheme={toggleTheme} />;

  return <DashboardPage session={session} onSignOut={handleSignOut} theme={theme} toggleTheme={toggleTheme} />;
}
