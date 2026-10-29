import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X, Loader2, ClipboardList } from 'lucide-react';
import { OrderCard } from '@/components/OrderCard';
import { PullToRefresh } from '@/components/PullToRefresh';
import { fetchOrders } from '@/lib/orders';
import { STATUS_LABELS } from '@/lib/constants';
import { cn, isSameDay, isYesterday, startOfWeek } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/types';

interface OrdersPageProps {
  onOpenOrder: (id: string) => void;
}

type FilterKey =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'week'
  | 'inprogress'
  | 'drying'
  | 'ready'
  | 'delivered';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Barchasi' },
  { key: 'today', label: 'Bugungi' },
  { key: 'yesterday', label: 'Kechagi' },
  { key: 'week', label: 'Shu hafta' },
  { key: 'inprogress', label: 'Jarayonda' },
  { key: 'drying', label: 'Quritilmoqda' },
  { key: 'ready', label: 'Tayyor' },
  { key: 'delivered', label: 'Topshirilgan' },
];

const STATUS_FOR_FILTER: Record<FilterKey, OrderStatus[] | null> = {
  all: null,
  today: null,
  yesterday: null,
  week: null,
  inprogress: ['yuvishda', 'tozalanmoqda'],
  drying: ['quritilmoqda'],
  ready: ['tayyor'],
  delivered: ['topshirildi'],
};

export function OrdersPage({ onOpenOrder }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [error, setError] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    let list = orders;

    const statusFilter = STATUS_FOR_FILTER[filter];
    if (statusFilter) {
      list = list.filter((o) => statusFilter.includes(o.status));
    } else if (filter === 'today') {
      list = list.filter((o) => isSameDay(new Date(o.created_at), now));
    } else if (filter === 'yesterday') {
      list = list.filter((o) => isYesterday(new Date(o.created_at), now));
    } else if (filter === 'week') {
      list = list.filter((o) => new Date(o.created_at) >= weekStart);
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.customer_name.toLowerCase().includes(s) ||
          o.phone.toLowerCase().includes(s) ||
          o.order_number.toLowerCase().includes(s),
      );
    }
    return list;
  }, [orders, filter, search]);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Buyurtmalar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Jami {orders.length} ta buyurtma
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Telefon, ism yoki buyurtma raqami"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="tap absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'tap flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                filter === f.key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              )}
            >
              {f.key !== 'all' && <SlidersHorizontal className="h-3 w-3" />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
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
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {search || filter !== 'all'
                ? 'Filtr bo\'yicha buyurtma topilmadi'
                : 'Hozircha buyurtmalar yo\'q'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
                className="tap mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400"
              >
                Filtrni tozalash
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <OrderCard key={o.id} order={o} onClick={() => onOpenOrder(o.id)} />
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

void STATUS_LABELS;
void Loader2;
