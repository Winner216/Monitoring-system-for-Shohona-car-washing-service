import { Clock, MapPin, MoreVertical, Package, Phone, ChevronRight, AlertTriangle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { STATUS_ORDER, DRYING_ALERT_HOURS, ITEM_LABELS } from '@/lib/constants';
import { cn, formatTime, hoursBetween, totalItems } from '@/lib/utils';
import type { Order } from '@/lib/types';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  onMenu?: (e: React.MouseEvent) => void;
}

export function OrderCard({ order, onClick, onMenu }: OrderCardProps) {
  const currentHistory = (order.status_history ?? []).find(
    (h) => h.status === order.status && !h.finished_at,
  );
  const elapsedHours = currentHistory
    ? hoursBetween(currentHistory.started_at, null, true)
    : 0;
  const isOverdue =
    order.status === 'quritilmoqda' && elapsedHours > DRYING_ALERT_HOURS;

  const items = order.order_items ?? [];
  const itemsCount = totalItems(order);

  return (
    <div
      onClick={onClick}
      className={cn(
        'tap group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-slate-900',
        isOverdue
          ? 'border-red-300 dark:border-red-500/40'
          : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-500/30',
      )}
    >
      {isOverdue && (
        <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-mono text-xs font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              {order.order_number}
            </span>
            <StatusBadge status={order.status} size="sm" />
            {order.paid && (
              <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-500/15 dark:text-green-400">
                To'langan
              </span>
            )}
          </div>
          <h3 className="mt-2 truncate text-base font-bold text-slate-900 dark:text-white">
            {order.customer_name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> {order.phone}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {order.location}
            </span>
          </div>
        </div>
        {onMenu ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenu(e);
            }}
            className="tap -m-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Menyu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        ) : (
          onClick && (
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
          )
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Package className="h-3.5 w-3.5" />
          <span>
            {itemsCount} ta buyurtma
            {items.length > 0 && (
              <span className="text-slate-400 dark:text-slate-500">
                {' · '}
                {items
                  .slice(0, 2)
                  .map((it) => `${it.quantity}× ${ITEM_LABELS[it.type]}`)
                  .join(', ')}
                {items.length > 2 && ` +${items.length - 2}`}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <Clock className="h-3 w-3" />
          {formatTime(order.created_at)}
        </div>
      </div>

      {isOverdue && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Quritishda {Math.round(elapsedHours)} soat — tezroq topshiring!
        </div>
      )}
    </div>
  );
}

export { STATUS_ORDER };
