import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseReady } from '../lib/supabase';
import { storageService } from '../services/storageService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabaseReady) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setUser(formatUser(session.user));
        setLoading(false);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session ? formatUser(session.user) : null);
      });
      return () => subscription.unsubscribe();
    } else {
      const saved = storageService.getUser();
      if (saved) setUser(saved);
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = async () => {
    if (!supabaseReady) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw new Error(error.message);
  };

  const register = async (name, email, password) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error('Please enter a valid email address.');

    if (supabaseReady) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } },
      });
      if (error) throw new Error(error.message);
      
      // If email confirmations are enabled in Supabase, session will be null
      if (data.user && !data.session && data.user.identities?.length === 0) {
          throw new Error('This email is already in use. Please sign in instead.');
      }
      if (data.user && !data.session) {
        throw new Error('Registration successful! Please check your email to confirm your account.');
      }

      if (!data.user) throw new Error('Registration failed.');
      
      const u = formatUser(data.user, name);
      setUser(u);
      return u;
    }
    const existing = storageService.getUserByEmail(email);
    if (existing) throw new Error('Email already registered.');
    const newUser = { id: crypto.randomUUID(), name, email, password, createdAt: new Date().toISOString() };
    storageService.saveUser(newUser);
    const { password: _, ...pub } = newUser;
    storageService.setCurrentUser(pub);
    setUser(pub);
    return pub;
  };

  const login = async (email, password) => {
    if (supabaseReady) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const u = formatUser(data.user);
      setUser(u);
      return u;
    }
    const found = storageService.getUserByEmail(email);
    if (!found) throw new Error('No account found with that email.');
    if (found.password !== password) throw new Error('Incorrect password.');
    const { password: _, ...pub } = found;
    storageService.setCurrentUser(pub);
    setUser(pub);
    return pub;
  };

  const resetPassword = async (email) => {
    if (supabaseReady) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) throw new Error(error.message);
    } else {
      // Mock for local storage
      const found = storageService.getUserByEmail(email);
      if (!found) throw new Error('No account found with that email.');
    }
  };

  const updatePassword = async (newPassword) => {
    if (supabaseReady) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    } else {
      // Mock for local storage - not fully functional since we don't have a token system for local
      if (!user) throw new Error('You must be logged in to update your password.');
      const allUsers = JSON.parse(localStorage.getItem('interview_users') || '[]');
      const updated = allUsers.map(u => u.email === user.email ? { ...u, password: newPassword } : u);
      localStorage.setItem('interview_users', JSON.stringify(updated));
    }
  };

  const logout = async () => {
    if (supabaseReady) await supabase.auth.signOut();
    else storageService.clearCurrentUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, loginWithGoogle, resetPassword, updatePassword, usingSupabase: supabaseReady }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

function formatUser(user, nameOverride) {
  return {
    id: user.id,
    email: user.email,
    name: nameOverride || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    createdAt: user.created_at,
  };
}
