import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Phone,
  MapPin,
  FileText,
  Trash2,
  Edit2,
  QrCode,
  Printer,
  ChevronRight,
  Loader2,
  Package,
  AlertTriangle,
  Clock,
  User as UserIcon,
  CircleDollarSign,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { QRCode } from '@/components/QRCode';
import { Receipt } from '@/components/Receipt';
import {
  changeStatus,
  deleteOrder,
  fetchOrderById,
  recordDeliveryWithPayment,
  recordPayment,
  updateOrder,
} from '@/lib/orders';
import {
  ITEM_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  DRYING_ALERT_HOURS,
} from '@/lib/constants';
import { cn, formatCurrency, formatDateTime, hoursBetween, timeAgo } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/types';

interface OrderDetailsPageProps {
  orderId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export function OrderDetailsPage({ orderId, onBack, onDeleted }: OrderDetailsPageProps) {
  const { employee } = useAuth();
  const { toast } = useToast();
  const isAdmin = employee?.role === 'admin';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<OrderStatus | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const o = await fetchOrderById(orderId);
      setOrder(o);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const currentStatus = order?.status ?? 'qabul_qilindi';
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const next = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null;

  const dryingHours = useMemo(() => {
    if (!order) return 0;
    const h = (order.status_history ?? []).find(
      (x) => x.status === 'quritilmoqda' && !x.finished_at,
    );
    return h ? hoursBetween(h.started_at, null, true) : 0;
  }, [order]);

  const handleAdvance = async () => {
    if (!next || !employee || !order) return;
    // If advancing to 'topshirildi', open the payment modal instead
    if (next === 'topshirildi') {
      setShowPay(true);
      setChanging(null);
      return;
    }
    setChanging(next);
    try {
      await changeStatus(order.id, next, employee.id);
      toast(`Holati: ${STATUS_LABELS[next]}`, 'success');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Holatni o\'zgartirishda xatolik', 'error');
    } finally {
      setChanging(null);
    }
  };

  const handleSetStatus = async (status: OrderStatus) => {
    if (!employee || !order || status === currentStatus) return;
    // If setting to 'topshirildi', open the payment modal
    if (status === 'topshirildi') {
      setShowPay(true);
      return;
    }
    setChanging(status);
    try {
      await changeStatus(order.id, status, employee.id);
      toast(`Holati: ${STATUS_LABELS[status]}`, 'success');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Xatolik', 'error');
    } finally {
      setChanging(null);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    setDeleting(true);
    try {
      await deleteOrder(order.id);
      toast('Buyurtma o\'chirildi', 'success');
      onDeleted();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'O\'chirishda xatolik', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const printReceipt = () => {
    const node = document.getElementById('print-receipt');
    if (!node) return;
    const w = window.open('', '_blank', 'width=320,height=600');
    if (!w) {
      toast('Brauzer pop-up ni to\'sqichini o\'chiring', 'error');
      return;
    }
    w.document.write(`
      <html><head><title>Chek ${order?.order_number ?? ''}</title>
      <style>body{margin:0;font-family:Inter,sans-serif}</style></head>
      <body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="text-slate-500 dark:text-slate-400">Buyurtma topilmadi</p>
        <button onClick={onBack} className="tap mt-3 font-semibold text-blue-600">
          Orqaga
        </button>
      </div>
    );
  }

  const items = order.order_items ?? [];
  const isDryingOverdue = order.status === 'quritilmoqda' && dryingHours > DRYING_ALERT_HOURS;

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="tap flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="tap flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label="QR kod"
          >
            <QrCode className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowReceipt(true)}
            className="tap flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Chek"
          >
            <Printer className="h-5 w-5" />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowEdit(true)}
                className="tap flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                aria-label="Tahrirlash"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="tap flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-800"
                aria-label="O'chirish"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Order header */}
      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-blue-50 px-2 py-1 font-mono text-sm font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            {order.order_number}
          </span>
          <StatusBadge status={order.status} />
        </div>
        <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
          {order.customer_name}
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Yaratilgan: {formatDateTime(order.created_at)} · {timeAgo(order.created_at)}
        </p>
      </div>

      {/* Drying overdue alert */}
      {isDryingOverdue && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Quritishda {Math.round(dryingHours)} soat o'tdi — 24 soatdan ko'p!
          </p>
        </div>
      )}

      {/* Customer info */}
      <div className="mb-4 space-y-px overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <InfoRow icon={UserIcon} label="Mijoz" value={order.customer_name} />
        <InfoRow icon={Phone} label="Telefon" value={order.phone} />
        <InfoRow icon={MapPin} label="Manzil" value={order.location} />
        <InfoRow
          icon={CircleDollarSign}
          label="Narx"
          value={order.price != null ? formatCurrency(order.price) : 'Kiritilmagan'}
        />
        <InfoRow
          icon={CheckCircle2}
          label="To'lov"
          value={
            order.paid
              ? `To'langan${order.paid_at ? ' · ' + formatDateTime(order.paid_at) : ''}`
              : "To'lanmagan"
          }
        />
        {order.notes && <InfoRow icon={FileText} label="Izoh" value={order.notes} />}
        {order.created_by_employee && (
          <InfoRow
            icon={UserIcon}
            label="Yaratdi"
            value={order.created_by_employee.name}
          />
        )}
      </div>

      {/* Items */}
      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
          <Package className="h-4 w-4" /> Buyurtmalar ro'yxati
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Buyurtmalar yo'q</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                    {it.quantity}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {ITEM_LABELS[it.type]}
                    </p>
                    {it.size && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        O'lcham: {it.size}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
          <Clock className="h-4 w-4" /> Jarayon
        </h2>
        <Timeline history={order.status_history ?? []} currentStatus={order.status} />
      </div>

      {/* Status quick actions */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Holatni o'zgartirish</h2>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_ORDER.map((s) => {
            const active = s === currentStatus;
            const c = STATUS_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => handleSetStatus(s)}
                disabled={changing !== null}
                className={cn(
                  'tap rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all disabled:opacity-50',
                  active
                    ? cn(c.bg, c.border, c.text, 'ring-2', c.ring)
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                )}
              >
                {STATUS_LABELS[s]}
                {changing === s && <Loader2 className="mx-auto mt-1 h-3 w-3 animate-spin" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advance button */}
      {next && (
        <button
          onClick={handleAdvance}
          disabled={changing !== null}
          className={cn(
            'tap mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-60',
            STATUS_COLORS[next].bg.replace('/10', '/20'),
            'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25',
          )}
        >
          {changing === next ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          Keyingi: {STATUS_LABELS[next]}
        </button>
      )}

      {/* QR modal */}
      <Modal open={showQR} onClose={() => setShowQR(false)} title="QR Kod" size="sm">
        <div className="flex flex-col items-center gap-4 py-2">
          <QRCode value={`${order.order_number}|${order.customer_name}|${order.phone}`} size={200} />
          <div className="text-center">
            <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
              {order.order_number}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{order.customer_name}</p>
          </div>
        </div>
      </Modal>

      {/* Receipt modal */}
      <Modal
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        title="Chek"
        size="sm"
        footer={
          <button
            onClick={printReceipt}
            className="tap flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" /> Chop etish
          </button>
        }
      >
        <div className="flex justify-center rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
          <Receipt order={order} />
        </div>
        <div id="print-receipt" className="hidden">
          <Receipt order={order} />
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDelete}
        title="Buyurtmani o'chirish"
        message="Bu buyurtma butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi."
        confirmLabel="O'chirish"
        destructive
        onConfirm={handleDelete}
        onClose={() => setShowDelete(false)}
      />

      {/* Edit modal */}
      {showEdit && (
        <EditOrderModal
          order={order}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await load();
          }}
        />
      )}

      {/* Payment modal */}
      {showPay && (
        <PaymentModal
          order={order}
          onClose={() => setShowPay(false)}
          onConfirm={async (amount) => {
            if (!employee) return;
            setChanging('topshirildi');
            try {
              await recordDeliveryWithPayment(order.id, 'topshirildi', employee.id, amount);
              toast('Buyurtma topshirildi va to\'lov qabul qilindi!', 'success');
              setShowPay(false);
              await load();
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Xatolik', 'error');
            } finally {
              setChanging(null);
            }
          }}
        />
      )}

      {/* Mark as paid button (if delivered but not paid) */}
      {order.status === 'topshirildi' && !order.paid && (
        <button
          onClick={() => setShowPay(true)}
          className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-700"
        >
          <CircleDollarSign className="h-5 w-5" />
          To'lovni qabul qilish
        </button>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-0 dark:border-slate-800/50">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function EditOrderModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [phone, setPhone] = useState(order.phone);
  const [location, setLocation] = useState<string>(order.location);
  const [notes, setNotes] = useState(order.notes ?? '');
  const [price, setPrice] = useState(order.price != null ? String(order.price) : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!customerName.trim() || !phone.trim()) {
      toast('Mijoz va telefon majburiy', 'error');
      return;
    }
    setSaving(true);
    try {
      const priceNum = price.trim() ? parseFloat(price.replace(/\s/g, '')) : null;
      await updateOrder(order.id, {
        customer_name: customerName.trim(),
        phone: phone.trim(),
        location,
        notes: notes.trim() || null,
        price: priceNum,
      });
      toast('Saqlandi', 'success');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Buyurtmani tahrirlash"
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="tap flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Bekor qilish
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="tap flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Mijoz ismi">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </Field>
        <Field label="Telefon raqami">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </Field>
        <Field label="Manzil">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Masalan: G'allaorol Markaz"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </Field>
        <Field label="Izoh">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </Field>
        <Field label="Narx (so'm)">
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Masalan: 50000"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </Field>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

void ITEM_LABELS;

function PaymentModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(order.price != null ? String(order.price) : '');
  const [processing, setProcessing] = useState(false);

  const submit = async () => {
    const num = parseFloat(amount.replace(/\s/g, ''));
    if (isNaN(num) || num <= 0) {
      toast('To\'g\'ri summani kiriting', 'error');
      return;
    }
    setProcessing(true);
    try {
      await onConfirm(num);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="To'lov qabul qilish"
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="tap flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Bekor qilish
          </button>
          <button
            onClick={submit}
            disabled={processing}
            className="tap flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Tasdiqlash
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-green-50 p-3 dark:bg-green-500/10">
          <p className="text-xs font-medium text-green-700 dark:text-green-400">Buyurtma</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {order.order_number} · {order.customer_name}
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            To'langan summa (so'm)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Masalan: 50000"
            autoFocus
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-lg font-bold outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>
    </Modal>
  );
}
