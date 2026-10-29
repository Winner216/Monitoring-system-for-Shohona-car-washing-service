import { Home, ClipboardList, CheckCircle2, Wallet, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Page } from '@/App';

interface BottomNavProps {
  current: Page;
  onNavigate: (page: Page) => void;
  readyCount: number;
}

const NAV_ITEMS: { page: Page; label: string; icon: typeof Home }[] = [
  { page: 'dashboard', label: 'Bosh', icon: Home },
  { page: 'orders', label: 'Buyurtma', icon: ClipboardList },
  { page: 'ready', label: 'Tayyor', icon: CheckCircle2 },
  { page: 'income', label: 'Daromad', icon: Wallet },
  { page: 'reports', label: 'Hisobot', icon: BarChart3 },
  { page: 'settings', label: 'Sozlama', icon: Settings },
];

export function BottomNav({ current, onNavigate, readyCount }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => {
          const active = current === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={cn(
                'tap relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500',
              )}
            >
              <span className="relative">
                <Icon
                  className={cn('h-5 w-5 transition-transform', active && 'scale-110')}
                  strokeWidth={active ? 2.5 : 2}
                />
                {page === 'ready' && readyCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[9px] font-bold text-white">
                    {readyCount > 99 ? '99+' : readyCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
