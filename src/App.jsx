import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthPage from './AuthPage';
import DashboardPage from './DashboardPage';

export default function App() {
  const [session, setSession] = useState(null);

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

  if (!session) return <AuthPage onSignIn={() => {}} />;

  return <DashboardPage session={session} onSignOut={handleSignOut} />;
}
