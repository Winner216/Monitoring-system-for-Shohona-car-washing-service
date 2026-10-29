import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Loader2,
  Droplets,
  Wind,
  Timer,
  TrendingUp,
  Wallet,
  CalendarDays,
  ChevronDown,
  Filter,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { fetchMonthStatusHistory, fetchOrders } from '@/lib/orders';
import { ITEM_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { cn, durationLabel, formatCurrency, formatDate, isSameDay, startOfWeek } from '@/lib/utils';
import type { ItemType, Order, OrderStatus, StatusHistory } from '@/lib/types';

const STATUS_ORDER_FOR_CHART: OrderStatus[] = [
  'qabul_qilindi',
  'yuvishda',
  'tozalanmoqda',
  'quritilmoqda',
  'tayyor',
  'topshirildi',
];

type Period = 'week' | 'month';

interface DayRecord {
  date: Date;
  label: string;
  income: number;
  count: number;
  orders: Order[];
}

export function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [monthHistory, setMonthHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [itemFilter, setItemFilter] = useState<string>('all');
  const [locFilter, setLocFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [ords, hist] = await Promise.all([
        fetchOrders(),
        fetchMonthStatusHistory(monthStart),
      ]);
      setOrders(ords);
      setMonthHistory(hist);
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

  const incomeStats = useMemo(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const dailyIncome = filteredPaid
      .filter((o) => isSameDay(new Date(o.paid_at!), today))
      .reduce((sum, o) => sum + (o.price ?? 0), 0);
    const dailyCount = filteredPaid.filter((o) => isSameDay(new Date(o.paid_at!), today)).length;

    const monthlyIncome = filteredPaid
      .filter((o) => new Date(o.paid_at!) >= monthStart)
      .reduce((sum, o) => sum + (o.price ?? 0), 0);
    const monthlyCount = filteredPaid.filter((o) => new Date(o.paid_at!) >= monthStart).length;

    const totalIncome = filteredPaid.reduce((sum, o) => sum + (o.price ?? 0), 0);

    return { dailyIncome, dailyCount, monthlyIncome, monthlyCount, totalIncome };
  }, [filteredPaid]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayOrderIds = new Set(
      orders.filter((o) => isSameDay(new Date(o.created_at), today)).map((o) => o.id),
    );

    const todayWashHistory = monthHistory.filter(
      (h) => h.status === 'yuvishda' && todayOrderIds.has(h.order_id),
    );
    const todayOrderMap = new Map(orders.map((o) => [o.id, o]));
    const itemCountsToday: Record<string, number> = {};
    for (const h of todayWashHistory) {
      const o = todayOrderMap.get(h.order_id);
      if (o) {
        for (const it of o.order_items ?? []) {
          itemCountsToday[it.type] = (itemCountsToday[it.type] ?? 0) + it.quantity;
        }
      }
    }

    const washDurations: number[] = [];
    const dryDurations: number[] = [];
    for (const o of orders) {
      const hist = o.status_history ?? [];
      const wash = hist.find((h) => h.status === 'yuvishda');
      if (wash && wash.finished_at) {
        washDurations.push(new Date(wash.finished_at).getTime() - new Date(wash.started_at).getTime());
      }
      const dry = hist.find((h) => h.status === 'quritilmoqda');
      if (dry && dry.finished_at) {
        dryDurations.push(new Date(dry.finished_at).getTime() - new Date(dry.started_at).getTime());
      }
    }
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;

    return {
      itemCountsToday,
      avgWashTime: avg(washDurations),
      avgDryTime: avg(dryDurations),
      washCount: washDurations.length,
      dryCount: dryDurations.length,
    };
  }, [orders, monthHistory]);

  const dailyRecords = useMemo<DayRecord[]>(() => {
    const now = new Date();
    const periodStart =
      period === 'week' ? startOfWeek(now) : new Date(now.getFullYear(), now.getMonth(), 1);

    const map = new Map<string, DayRecord>();
    for (const o of filteredPaid) {
      const d = new Date(o.paid_at!);
      if (d < periodStart) continue;
      const key = formatDate(o.paid_at!);
      if (!map.has(key)) {
        map.set(key, { date: d, label: key, income: 0, count: 0, orders: [] });
      }
      const rec = map.get(key)!;
      rec.income += o.price ?? 0;
      rec.count += 1;
      rec.orders.push(o);
    }
    return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredPaid, period]);

  const monthlyChart = useMemo(() => {
    const now = new Date();
    const days = now.getDate();
    const buckets: { label: string; count: number; income: number }[] = [];
    const paidByDay = new Map<string, number>();
    for (const o of filteredPaid) {
      if (o.paid && o.paid_at && o.price != null) {
        const d = new Date(o.paid_at);
        if (d.getMonth() === now.getMonth()) {
          const key = String(d.getDate());
          paidByDay.set(key, (paidByDay.get(key) ?? 0) + (o.price ?? 0));
        }
      }
    }
    for (let d = 1; d <= days; d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const count = monthHistory.filter((h) => {
        const hd = new Date(h.started_at);
        return isSameDay(hd, date) && h.status === 'qabul_qilindi';
      }).length;
      buckets.push({ label: String(d), count, income: paidByDay.get(String(d)) ?? 0 });
    }
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    const maxIncome = Math.max(1, ...buckets.map((b) => b.income));
    return { buckets, maxCount, maxIncome };
  }, [monthHistory, filteredPaid]);

  const statusDistribution = useMemo(() => {
    return STATUS_ORDER_FOR_CHART.map((s) => ({
      status: s,
      count: orders.filter((o) => o.status === s).length,
    }));
  }, [orders]);

  const activeFilterCount =
    (itemFilter !== 'all' ? 1 : 0) + (locFilter !== 'all' ? 1 : 0);

  const periodFilteredIncome = dailyRecords.reduce((s, r) => s + r.income, 0);
  const periodFilteredCount = dailyRecords.reduce((s, r) => s + r.count, 0);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <header className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hisobot</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Statistika va tahlil</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10">
            {error}
            <button onClick={load} className="tap mt-2 font-semibold underline">
              Qayta urinish
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Income summary */}
            <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-600/20">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-100" />
                <h2 className="text-sm font-bold">Daromad</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="flex items-center gap-1 text-xs font-medium text-blue-100">
                    <CalendarDays className="h-3.5 w-3.5" /> Bugungi
                  </p>
                  <p className="mt-1 text-2xl font-bold">{formatCurrency(incomeStats.dailyIncome)}</p>
                  <p className="text-[11px] text-blue-100">{incomeStats.dailyCount} ta to'lov</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs font-medium text-blue-100">
                    <CalendarDays className="h-3.5 w-3.5" /> Oylik
                  </p>
                  <p className="mt-1 text-2xl font-bold">{formatCurrency(incomeStats.monthlyIncome)}</p>
                  <p className="text-[11px] text-blue-100">{incomeStats.monthlyCount} ta to'lov</p>
                </div>
              </div>
              <div className="mt-4 border-t border-white/15 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-100">Jami daromad</span>
                  <span className="text-lg font-bold">{formatCurrency(incomeStats.totalIncome)}</span>
                </div>
              </div>
            </section>

            {/* Monthly income chart */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-green-500" /> Oylik daromad
              </h2>
              <div className="flex h-32 items-end gap-1 overflow-x-auto">
                {monthlyChart.buckets.map((b, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-green-600 to-green-400 transition-all hover:from-green-700 hover:to-green-500"
                      style={{
                        height: `${(b.income / monthlyChart.maxIncome) * 100}%`,
                        minHeight: b.income > 0 ? '4px' : '0',
                      }}
                      title={`${b.label}-kun: ${formatCurrency(b.income)}`}
                    />
                    <span className="text-[8px] text-slate-400 dark:text-slate-500">
                      {i % 5 === 0 ? b.label : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Today items */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                <Droplets className="h-4 w-4 text-blue-500" /> Bugun yuvilganlar
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(stats.itemCountsToday).map(([type, count]) => (
                  <ItemStat key={type} label={ITEM_LABELS[type as ItemType]} value={count} />
                ))}
                {Object.keys(stats.itemCountsToday).length === 0 && (
                  <p className="col-span-3 py-4 text-center text-xs text-slate-400">Bugun yuvilganlar yo'q</p>
                )}
              </div>
            </section>

            {/* Average times */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                <Timer className="h-4 w-4 text-blue-500" /> O'rtacha vaqt
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <AvgCard
                  icon={Droplets}
                  label="Yuvish vaqti"
                  value={stats.avgWashTime ? durationLabel(stats.avgWashTime) : '—'}
                  count={stats.washCount}
                  accent="text-blue-600 dark:text-blue-400 bg-blue-500/10"
                />
                <AvgCard
                  icon={Wind}
                  label="Quritish vaqti"
                  value={stats.avgDryTime ? durationLabel(stats.avgDryTime) : '—'}
                  count={stats.dryCount}
                  accent="text-orange-600 dark:text-orange-400 bg-orange-500/10"
                />
              </div>
            </section>

            {/* Monthly orders chart */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-blue-500" /> Oylik buyurtmalar
              </h2>
              <div className="flex h-32 items-end gap-1 overflow-x-auto">
                {monthlyChart.buckets.map((b, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-all hover:from-blue-700 hover:to-blue-500"
                      style={{
                        height: `${(b.count / monthlyChart.maxCount) * 100}%`,
                        minHeight: b.count > 0 ? '4px' : '0',
                      }}
                      title={`${b.label}-kun: ${b.count} ta`}
                    />
                    <span className="text-[8px] text-slate-400 dark:text-slate-500">
                      {i % 5 === 0 ? b.label : ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Daily income history with filters */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  <Wallet className="h-4 w-4 text-green-500" /> Daromad tarixi
                </h2>
                <div className="flex gap-1.5">
                  {(['week', 'month'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={cn(
                        'tap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all',
                        period === p
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400',
                      )}
                    >
                      {p === 'week' ? 'Hafta' : 'Oy'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter bar */}
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={() => setShowFilters((s) => !s)}
                  className={cn(
                    'tap flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                    activeFilterCount > 0
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300',
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
                    className="tap flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
                  >
                    <X className="h-3 w-3" /> Tozalash
                  </button>
                )}
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="mb-3 space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  {itemTypes.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Buyurtma turi</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setItemFilter('all')}
                          className={cn(
                            'tap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
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
                              'tap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                              itemFilter === t
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300',
                            )}
                          >
                            {ITEM_LABELS[t as ItemType]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {locations.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Manzil</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setLocFilter('all')}
                          className={cn(
                            'tap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
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
                              'tap max-w-[120px] truncate rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
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

              {/* Period total */}
              <div className="mb-3 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2.5 dark:bg-green-500/10">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {period === 'week' ? 'Shu hafta' : 'Shu oy'} jami:
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{periodFilteredCount} ta</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(periodFilteredIncome)}
                  </span>
                </div>
              </div>

              {/* Daily records */}
              {dailyRecords.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs text-slate-400">Bu davrda to'lov yo'q</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dailyRecords.map((rec) => {
                    const isExpanded = expandedDay === rec.label;
                    return (
                      <div
                        key={rec.label}
                        className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800"
                      >
                        <button
                          onClick={() => setExpandedDay(isExpanded ? null : rec.label)}
                          className="tap flex w-full items-center justify-between p-3"
                        >
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{rec.label}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{rec.count} ta to'lov</p>
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
                        {isExpanded && (
                          <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                            <div className="space-y-2">
                              {rec.orders.map((o) => (
                                <div key={o.id} className="flex items-center gap-2 py-0.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                                  <div className="min-w-0 flex-1">
                                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                      {o.order_number}
                                    </span>
                                    <span className="ml-1.5 truncate text-xs text-slate-600 dark:text-slate-300">
                                      {o.customer_name} · {o.location}
                                    </span>
                                  </div>
                                  <p className="shrink-0 text-xs font-bold text-green-600 dark:text-green-400">
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
            </section>

            {/* Status distribution */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                <BarChart3 className="h-4 w-4 text-blue-500" /> Holat bo'yicha taqsimot
              </h2>
              <div className="space-y-2">
                {statusDistribution.map(({ status, count }) => {
                  const c = STATUS_COLORS[status];
                  const pct = orders.length ? (count / orders.length) * 100 : 0;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {STATUS_LABELS[status]}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={cn('h-full rounded-full transition-all', c.dot)}
                          style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-xs font-bold text-slate-700 dark:text-slate-200">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

function ItemStat({ label, value }: { label: string; value: number }) {
  const colorMap: Record<string, string> = {
    Gilam: 'text-blue-600 dark:text-blue-400',
    "Ko'rpa": 'text-cyan-600 dark:text-cyan-400',
    "Ko'rpacha": 'text-orange-600 dark:text-orange-400',
    Adeyol: 'text-purple-600 dark:text-purple-400',
    Mebel: 'text-amber-600 dark:text-amber-400',
    Parda: 'text-pink-600 dark:text-pink-400',
  };
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
      <p className={cn('text-2xl font-bold', colorMap[label] ?? 'text-blue-600 dark:text-blue-400')}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function AvgCard({
  icon: Icon,
  label,
  value,
  count,
  accent,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  count: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-lg', accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {label} · {count} ta
      </p>
    </div>
  );
}
