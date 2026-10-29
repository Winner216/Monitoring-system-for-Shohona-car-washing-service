import { useState } from 'react';
import {
  Moon,
  Sun,
  LogOut,
  Shield,
  User as UserIcon,
  Info,
  WashingMachine,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ROLE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const { employee, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [showLogout, setShowLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      toast('Chiqishda xatolik', 'error');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sozlamalar</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Hisob va tizim sozlamalari</p>
      </header>

      {/* Profile */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
            {employee?.name?.charAt(0).toUpperCase() ?? 'X'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">
              {employee?.name ?? 'Xodim'}
            </h2>
            <span
              className={cn(
                'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                employee?.role === 'admin'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              <Shield className="h-3 w-3" />
              {employee ? ROLE_LABELS[employee.role] : 'Xodim'}
            </span>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <SectionTitle>Ko'rinish</SectionTitle>
      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={toggleTheme}
          className="tap flex w-full items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Tungi rejim
            </span>
          </div>
          <span
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              theme === 'dark' ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </span>
        </button>
      </section>

      {/* Account */}
      <SectionTitle>Hisob</SectionTitle>
      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Row icon={UserIcon} label="Foydalanuvchi" value={employee?.name ?? '—'} />
        <Row icon={Shield} label="Rol" value={employee ? ROLE_LABELS[employee.role] : '—'} />
      </section>

      {/* About */}
      <SectionTitle>Haqida</SectionTitle>
      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <WashingMachine className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Gilam Yuvish Boshqaruv Tizimi
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Versiya 1.0.0</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-50 p-4 dark:border-slate-800/50">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Info className="h-5 w-5" />
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Xodimlar uchun ichki boshqaruv tizimi
          </p>
        </div>
      </section>

      {/* Sign out */}
      <button
        onClick={() => setShowLogout(true)}
        className="tap flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <LogOut className="h-5 w-5" />
        Tizimdan chiqish
      </button>

      <ConfirmDialog
        open={showLogout}
        title="Tizimdan chiqish"
        message="Hisobingizdan chiqishni xohlaysizmi?"
        confirmLabel="Chiqish"
        destructive
        onConfirm={handleSignOut}
        onClose={() => setShowLogout(false)}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </h2>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof UserIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      </div>
      <span className="text-sm text-slate-500 dark:text-slate-400">{value}</span>
    </div>
  );
}

void ChevronRight;
void Loader2;
