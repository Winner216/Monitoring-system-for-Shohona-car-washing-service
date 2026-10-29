import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Phone, MapPin, Package, Clock, Check, CircleDollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Modal } from '@/components/Modal';
import { changeStatus, fetchOrders, recordDeliveryWithPayment } from '@/lib/orders';
import { ITEM_LABELS } from '@/lib/constants';
import { cn, formatCurrency, formatDateTime, timeAgo, totalItems } from '@/lib/utils';
import type { Order } from '@/lib/types';

interface ReadyOrdersPageProps {
  onOpenOrder: (id: string) => void;
}

export function ReadyOrdersPage({ onOpenOrder }: ReadyOrdersPageProps) {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState<string | null>(null);
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [locFilter, setLocFilter] = useState<string>('all');

  const load = async () => {
    try {
      const data = await fetchOrders({ status: ['tayyor'] });
      setOrders(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locations = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      map.set(o.location, (map.get(o.location) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [orders]);

  const sorted = useMemo(() => {
    const readyHistory = (o: Order) =>
      (o.status_history ?? []).find((h) => h.status === 'tayyor');
    let list = [...orders];
    if (locFilter !== 'all') {
      list = list.filter((o) => o.location === locFilter);
    }
    return list.sort((a, b) => {
      const ah = readyHistory(a)?.started_at ?? a.updated_at;
      const bh = readyHistory(b)?.started_at ?? b.updated_at;
      return new Date(ah).getTime() - new Date(bh).getTime();
    });
  }, [orders, locFilter]);

  const handleDeliver = async (id: string) => {
    if (!employee) return;
    const order = orders.find((o) => o.id === id);
    if (order && order.price == null) {
      // No price set — ask for payment amount
      setPayOrder(order);
      setPayAmount('');
      return;
    }
    setDelivering(id);
    try {
      await changeStatus(id, 'topshirildi', employee.id);
      toast('Buyurtma topshirildi!', 'success');
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Xatolik', 'error');
    } finally {
      setDelivering(null);
    }
  };

  const confirmPayDelivery = async () => {
    if (!employee || !payOrder) return;
    const num = parseFloat(payAmount.replace(/\s/g, ''));
    if (isNaN(num) || num <= 0) {
      toast("To'g'ri summani kiriting", 'error');
      return;
    }
    setProcessing(true);
    try {
      await recordDeliveryWithPayment(payOrder.id, 'topshirildi', employee.id, num);
      toast("Buyurtma topshirildi va to'lov qabul qilindi!", 'success');
      setOrders((prev) => prev.filter((o) => o.id !== payOrder.id));
      setPayOrder(null);
      setPayAmount('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Xatolik', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PullToRefresh onRefresh={load}>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <header className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tayyor Buyurtmalar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {sorted.length} ta buyurtma topshirishni kutmoqda
            </p>
          </div>
        </header>

        {/* Location filter */}
        {orders.length > 0 && (
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
            <button
              onClick={() => setLocFilter('all')}
              className={cn(
                'tap shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                locFilter === 'all'
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              )}
            >
              Barchasi ({orders.length})
            </button>
            {locations.map(([loc, count]) => (
              <button
                key={loc}
                onClick={() => setLocFilter(loc)}
                className={cn(
                  'tap shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                  locFilter === loc
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                )}
              >
                {loc} ({count})
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Tayyor buyurtmalar yo'q
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((o) => {
              const readyHistory = (o.status_history ?? []).find((h) => h.status === 'tayyor');
              const readyTime = readyHistory?.started_at ?? o.updated_at;
              return (
                <div
                  key={o.id}
                  className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm dark:border-green-500/30 dark:bg-slate-900"
                >
                  <button
                    onClick={() => onOpenOrder(o.id)}
                    className="tap w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="rounded-md bg-green-50 px-1.5 py-0.5 font-mono text-xs font-bold text-green-600 dark:bg-green-500/15 dark:text-green-400">
                          {o.order_number}
                        </span>
                        <h3 className="mt-1.5 truncate text-base font-bold text-slate-900 dark:text-white">
                          {o.customer_name}
                        </h3>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <Clock className="h-3 w-3" />
                        {timeAgo(readyTime)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {o.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {o.location}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Package className="h-3.5 w-3.5" />
                      {totalItems(o)} ta —{' '}
                      {(o.order_items ?? [])
                        .map((it) => `${it.quantity}× ${ITEM_LABELS[it.type]}`)
                        .join(', ')}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Tayyor bo'lgan: {formatDateTime(readyTime)}
                      </p>
                      {o.price != null && (
                        <span className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-0.5 text-xs font-bold text-green-600 dark:bg-green-500/15 dark:text-green-400">
                          <CircleDollarSign className="h-3 w-3" />
                          {formatCurrency(o.price)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeliver(o.id)}
                        disabled={delivering === o.id}
                        className="tap flex flex-1 items-center justify-center gap-2 bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {delivering === o.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-5 w-5" />
                        )}
                        Topshirildi
                      </button>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Payment on delivery modal */}
        <Modal
          open={payOrder !== null}
          onClose={() => {
            setPayOrder(null);
            setPayAmount('');
          }}
          title="To'lov qabul qilish"
          footer={
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPayOrder(null);
                  setPayAmount('');
                }}
                className="tap flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmPayDelivery}
                disabled={processing}
                className="tap flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Tasdiqlash
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 p-3 dark:bg-green-500/10">
              <p className="text-xs font-medium text-green-700 dark:text-green-400">Buyurtma</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {payOrder?.order_number} · {payOrder?.customer_name}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                To'langan summa (so'm)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Masalan: 50000"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-lg font-bold outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </Modal>
      </div>
    </PullToRefresh>
  );
}
