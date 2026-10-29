import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Loader2,
  Droplets,
  Wind,
  CheckCircle2,
  PackageCheck,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/StatCard';
import { OrderCard } from '@/components/OrderCard';
import { PullToRefresh } from '@/components/PullToRefresh';
import { fetchOrders, fetchTodayStatusHistory } from '@/lib/orders';
import { isSameDay } from '@/lib/utils';
import type { Order, StatusHistory } from '@/lib/types';
import type { Page } from '@/App';

interface DashboardPageProps {
  onNavigate: (page: Page) => void;
  onOpenOrder: (id: string) => void;
}

export function DashboardPage({ onNavigate, onOpenOrder }: DashboardPageProps) {
  const { employee } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [todayHistory, setTodayHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const [ords, hist] = await Promise.all([fetchOrders(), fetchTodayStatusHistory()]);
      setOrders(ords);
      setTodayHistory(hist);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    const todayOrders = orders.filter((o) => isSameDay(new Date(o.created_at), today));
    const todayOrderIds = new Set(todayOrders.map((o) => o.id));

    const startedToday = (status: string) =>
      todayHistory.filter(
        (h) => h.status === status && todayOrderIds.has(h.order_id),
      ).length;

    return {
      today: todayOrders.length,
      inProgress: orders.filter(
        (o) => o.status === 'yuvishda' || o.status === 'tozalanmoqda',
      ).length,
      drying: orders.filter((o) => o.status === 'quritilmoqda').length,
      ready: orders.filter((o) => o.status === 'tayyor').length,
      delivered: orders.filter((o) => o.status === 'topshirildi').length,
      washedToday: startedToday('yuvishda') + startedToday('tozalanmoqda'),
    };
  }, [orders, todayHistory]);

  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Assalomu alaykum,
            </p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {employee?.name ?? 'Xodim'}
            </h1>
          </div>
          <button
            onClick={load}
            className="tap flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Yangilash"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </header>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <StatCard
            label="Bugungi buyurtmalar"
            value={stats.today}
            icon={ClipboardList}
            accent="blue"
            loading={loading}
          />
          <StatCard
            label="Jarayonda"
            value={stats.inProgress}
            icon={Droplets}
            accent="cyan"
            loading={loading}
          />
          <StatCard
            label="Quritishda"
            value={stats.drying}
            icon={Wind}
            accent="orange"
            loading={loading}
          />
          <StatCard
            label="Tayyor"
            value={stats.ready}
            icon={CheckCircle2}
            accent="green"
            loading={loading}
          />
        </div>

        <StatCard
          label="Topshirilgan"
          value={stats.delivered}
          icon={PackageCheck}
          accent="emerald"
          loading={loading}
        />

        {/* New order button */}
        <button
          onClick={() => onNavigate('neworder')}
          className="tap mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Yangi Buyurtma
        </button>

        {/* Recent orders */}
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Oxirgi buyurtmalar
            </h2>
            <button
              onClick={() => onNavigate('orders')}
              className="tap text-xs font-semibold text-blue-600 dark:text-blue-400"
            >
              Barchasi
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10">
              {error}
              <button onClick={load} className="tap mt-2 font-semibold underline">
                Qayta urinish
              </button>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Hozircha buyurtmalar yo'q
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <OrderCard key={o.id} order={o} onClick={() => onOpenOrder(o.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}
