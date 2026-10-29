import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: 'blue' | 'cyan' | 'orange' | 'green' | 'slate' | 'emerald';
  onClick?: () => void;
  loading?: boolean;
}

const ACCENTS = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
} as const;

export function StatCard({ label, value, icon: Icon, accent = 'blue', onClick, loading }: StatCardProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        onClick && 'tap hover:border-blue-200 hover:shadow-md dark:hover:border-blue-500/30',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            ACCENTS[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        {onClick && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Ko'rish
          </span>
        )}
      </div>
      <div>
        {loading ? (
          <div className="skeleton h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold leading-none text-slate-900 dark:text-white">{value}</p>
        )}
        <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </Comp>
  );
}
