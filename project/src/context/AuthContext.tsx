import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchEmployee, createEmployeeProfile } from '@/lib/orders';
import type { Employee } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  employee: Employee | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function ensureEmployeeProfile(userId: string, name: string): Promise<Employee> {
  const existing = await fetchEmployee(userId);
  if (existing) return existing;
  return createEmployeeProfile(userId, name || 'Xodim', 'xodim');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        try {
          const nameFromMeta = (data.session.user.user_metadata?.name as string) || '';
          const emp = await ensureEmployeeProfile(data.session.user.id, nameFromMeta);
          if (mounted) setEmployee(emp);
        } catch {
          if (mounted) setEmployee(null);
        }
      }
      if (mounted) setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        if (!mounted) return;
        setSession(sess);
        if (sess) {
          try {
            const nameFromMeta = (sess.user.user_metadata?.name as string) || '';
            const emp = await ensureEmployeeProfile(sess.user.id, nameFromMeta);
            if (mounted) setEmployee(emp);
          } catch {
            if (mounted) setEmployee(null);
          }
        } else {
          if (mounted) setEmployee(null);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (data.user) {
      try {
        const emp = await createEmployeeProfile(data.user.id, name, 'xodim');
        setEmployee(emp);
      } catch {
        // Profile may already exist; onAuthStateChange will recover it
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmployee(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, employee, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
