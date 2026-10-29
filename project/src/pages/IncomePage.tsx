import { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Loader2,
  TrendingUp,
  Calendar,
  CircleDollarSign,
  CheckCircle2,
  Clock,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { fetchOrders } from '@/lib/orders';
import { ITEM_LABELS } from '@/lib/constants';
import {
  cn,
  formatCurrency,
  formatDate,
  isSameDay,
  startOfWeek,
} from '@/lib/utils';
import type { Order } from '@/lib/types';

type Period = 'today' | 'week' | 'month' | 'all';

interface DayRecord {
  date: Date;
  label: string;
  income: number;
  count: number;
  orders: Order[];
}

export function IncomePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('today');
  const [itemFilter, setItemFilter] = useState<string>('all');
  const [locFilter, setLocFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await fetchOrders();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const paidOrders = useMemo(
    () => orders.filter((o) => o.paid && o.paid_at && o.price != null),
    [orders],
  );

  const itemTypes = useMemo(() => {
    const set = new Set<string>();
    for (const o of paidOrders) {
      for (const it of o.order_items ?? []) set.add(it.type);
    }
    return [...set];
  }, [paidOrders]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const o of paidOrders) set.add(o.location);
    return [...set].sort();
  }, [paidOrders]);

  const filteredPaid = useMemo(() => {
    return paidOrders.filter((o) => {
      if (locFilter !== 'all' && o.location !== locFilter) return false;
      if (itemFilter !== 'all') {
        const hasItem = (o.order_items ?? []).some((it) => it.type === itemFilter);
        if (!hasItem) return false;
      }
      return true;
    });
  }, [paidOrders, itemFilter, locFilter]);

  const periodOrders = useMemo(() => {
    const now = new Date();
    if (period === 'today') {
      return filteredPaid.filter((o) => isSameDay(new Date(o.paid_at!), now));
    }
    if (period === 'week') {
      const ws = startOfWeek(now);
      return filteredPaid.filter((o) => new Date(o.paid_at!) >= ws);
    }
    if (period === 'month') {
      const ms = new Date(now.getFullYear(), now.getMonth(), 1);
      return filteredPaid.filter((o) => new Date(o.paid_at!) >= ms);
    }
    return filteredPaid;
  }, [filteredPaid, period]);

  const total = useMemo(
    () => periodOrders.reduce((sum, o) => sum + (o.price ?? 0), 0),
    [periodOrders],
  );

  const count = periodOrders.length;
  const avg = count > 0 ? total / count : 0;

  const dailyRecords = useMemo<DayRecord[]>(() => {
    const map = new Map<string, DayRecord>();
    for (const o of periodOrders) {
      const d = new Date(o.paid_at!);
      const key = formatDate(o.paid_at!);
      if (!map.has(key)) {
        map.set(key, {
          date: d,
          label: key,
          income: 0,
          count: 0,
          orders: [],
        });
      }
      const rec = map.get(key)!;
      rec.income += o.price ?? 0;
      rec.count += 1;
      rec.orders.push(o);
    }
    return [...map.values()].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [periodOrders]);

  const unpaidCount = useMemo(
    () => orders.filter((o) => o.status === 'topshirildi' && !o.paid).length,
    [orders],
  );

  const unpaidTotal = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'topshirildi' && !o.paid && o.price != null)
        .reduce((sum, o) => sum + (o.price ?? 0), 0),
    [orders],
  );

  const activeFilterCount =
    (itemFilter !== 'all' ? 1 : 0) + (locFilter !== 'all' ? 1 : 0);

  const periodLabel =
    period === 'today' ? 'Bugungi daromad'
    : period === 'week' ? 'Shu hafta daromad'
    : period === 'month' ? 'Oylik daromad'
    : 'Jami daromad';

  return (
    <PullToRefresh onRefresh={load}>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <header className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Daromad</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            To'langan buyurtmalar va tushum
          </p>
        </header>

        {/* Summary card */}
        <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-600/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">{periodLabel}</p>
              {loading ? (
                <div className="skeleton mt-2 h-9 w-40 bg-white/20" />
              ) : (
                <p className="mt-1 text-3xl font-bold">{formatCurrency(total)}</p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <CircleDollarSign className="h-4 w-4 text-blue-100" />
              <span className="text-blue-100">{count} ta to'lov</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-100" />
              <span className="text-blue-100">O'rtacha: {formatCurrency(avg)}</span>
            </div>
          </div>
        </div>

        {/* Unpaid alert */}
        {unpaidCount > 0 && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                  {unpaidCount} ta to'lanmagan
                </p>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70">
                  {formatCurrency(unpaidTotal)} kutmoqda
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Period tabs */}
        <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
          {(
            [
              { key: 'today', label: 'Bugun' },
              { key: 'week', label: 'Hafta' },
              { key: 'month', label: 'Oy' },
              { key: 'all', label: 'Barchasi' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={cn(
                'tap shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                period === t.key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cn(
              'tap flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              activeFilterCount > 0
                ? 'border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtr
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setItemFilter('all');
                setLocFilter('all');
              }}
              className="tap flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              <X className="h-3 w-3" /> Tozalash
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-4 space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Item type filter */}
            {itemTypes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Buyurtma turi</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setItemFilter('all')}
                    className={cn(
                      'tap rounded-full border px-3 py-1 text-xs font-medium transition-all',
                      itemFilter === 'all'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300',
                    )}
                  >
                    Hammasi
                  </button>
                  {itemTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setItemFilter(t)}
                      className={cn(
                        'tap rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        itemFilter === t
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300',
                      )}
                    >
                      {ITEM_LABELS[t as keyof typeof ITEM_LABELS]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Location filter */}
            {locations.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Manzil</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setLocFilter('all')}
                    className={cn(
                      'tap rounded-full border px-3 py-1 text-xs font-medium transition-all',
                      locFilter === 'all'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300',
                    )}
                  >
                    Hammasi
                  </button>
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocFilter(loc)}
                      className={cn(
                        'tap max-w-[140px] truncate rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        locFilter === loc
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300',
                      )}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Daily history records */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10">
            {error}
            <button onClick={load} className="tap mt-2 font-semibold underline">
              Qayta urinish
            </button>
          </div>
        ) : dailyRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Bu davrda to'lov yo'q
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyRecords.map((rec) => {
              const isExpanded = expandedDay === rec.label;
              return (
                <div
                  key={rec.label}
                  className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* Day header */}
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : rec.label)}
                    className="tap flex w-full items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Calendar className="h-5 w-5" />
                      </span>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{rec.label}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{rec.count} ta to'lov</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(rec.income)}
                      </p>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-slate-400 transition-transform',
                          isExpanded && 'rotate-180',
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded transactions for this day */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                      <div className="space-y-2.5">
                        {rec.orders.map((o) => (
                          <div key={o.id} className="flex items-center gap-3 py-1">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {o.order_number}
                                </span>
                                <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {o.customer_name}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                                {(o.order_items ?? [])
                                  .map((it) => `${it.quantity}× ${ITEM_LABELS[it.type]}`)
                                  .join(', ')}
                                {' · '}
                                {o.location}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(o.price)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
