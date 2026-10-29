import { Clock, CheckCircle2 } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER, DRYING_ALERT_HOURS } from '@/lib/constants';
import { cn, formatTime, hoursBetween } from '@/lib/utils';
import type { OrderStatus, StatusHistory } from '@/lib/types';

interface TimelineProps {
  history: StatusHistory[];
  currentStatus: OrderStatus;
  compact?: boolean;
}

export function Timeline({ history, currentStatus, compact }: TimelineProps) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const historyByStatus = new Map<OrderStatus, StatusHistory>();
  for (const h of history) {
    if (!historyByStatus.has(h.status)) historyByStatus.set(h.status, h);
  }

  return (
    <ol className={cn('relative', !compact && 'space-y-1')}>
      {STATUS_ORDER.map((status, idx) => {
        const entry = historyByStatus.get(status);
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        const isFuture = idx > currentIdx;
        const c = STATUS_COLORS[status];

        const elapsedHours = entry
          ? hoursBetween(entry.started_at, entry.finished_at, isActive)
          : 0;
        const isOverdue =
          status === 'quritilmoqda' && isActive && elapsedHours > DRYING_ALERT_HOURS;

        return (
          <li key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all',
                  isDone
                    ? 'border-green-500 bg-green-500 text-white'
                    : isActive
                      ? cn('border-2', c.border, c.bg, c.text, 'animate-pulse-soft')
                      : 'border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600',
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive ? (
                  <span className={cn('h-2 w-2 rounded-full', c.dot)} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </div>
              {idx < STATUS_ORDER.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 flex-1',
                    compact ? 'min-h-[20px]' : 'min-h-[28px]',
                    isDone ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700',
                  )}
                />
              )}
            </div>
            <div className={cn('flex flex-1 flex-col pb-1', compact ? 'py-0.5' : 'py-1')}>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isFuture
                      ? 'text-slate-400 dark:text-slate-600'
                      : 'text-slate-800 dark:text-slate-100',
                    isOverdue && 'text-red-600 dark:text-red-400',
                  )}
                >
                  {STATUS_LABELS[status]}
                  {isOverdue && ' ⚠'}
                </span>
                {entry && (
                  <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                    <Clock className="h-3 w-3" />
                    {formatTime(entry.started_at)}
                    {entry.finished_at && (
                      <span className="text-slate-300 dark:text-slate-600">
                        {' → '}
                        {formatTime(entry.finished_at)}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {entry && !compact && (
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {entry.finished_at
                    ? `Yakunlandi: ${formatTime(entry.finished_at)}`
                    : isActive
                      ? 'Jarayonda...'
                      : 'Boshlanmagan'}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
