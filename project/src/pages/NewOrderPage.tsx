import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Check, User, Phone, MapPin, FileText, Package, CircleDollarSign } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { createOrder } from '@/lib/orders';
import { ITEM_LABELS, ITEM_TYPES } from '@/lib/constants';
import type { ItemType, OrderItemInput } from '@/lib/types';
import type { Page } from '@/App';

interface NewOrderPageProps {
  onBack: () => void;
  onCreated: (page: Page) => void;
}

interface ItemForm extends OrderItemInput {
  uid: string;
}

let itemUid = 0;

export function NewOrderPage({ onBack, onCreated }: NewOrderPageProps) {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [items, setItems] = useState<ItemForm[]>([
    { uid: `i${++itemUid}`, type: 'gilam', quantity: 1, size: '' },
  ]);
  const [saving, setSaving] = useState(false);

  const updateItem = (uid: string, patch: Partial<ItemForm>) => {
    setItems((prev) => prev.map((it) => (it.uid === uid ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { uid: `i${++itemUid}`, type: 'gilam', quantity: 1, size: '' },
    ]);
  };

  const removeItem = (uid: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.uid !== uid) : prev));
  };

  const validItems = items.filter((it) => it.quantity > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return toast('Mijoz ismini kiriting', 'error');
    if (!phone.trim()) return toast('Telefon raqamini kiriting', 'error');
    if (!location.trim()) return toast('Manzilni kiriting', 'error');
    if (validItems.length === 0) return toast("Kamida bitta buyurtma qo'shing", 'error');
    if (!employee) return toast("Hisob ma'lumotlari topilmadi", 'error');

    const priceNum = price.trim() ? parseFloat(price.replace(/\s/g, '')) : null;
    if (priceNum !== null && (isNaN(priceNum) || priceNum < 0)) {
      return toast("Narx noto'g'ri kiritilgan", 'error');
    }

    setSaving(true);
    try {
      await createOrder({
        customerName: customerName.trim(),
        phone: phone.trim(),
        location: location.trim(),
        notes: notes.trim() || null,
        items: validItems.map(({ type, quantity, size }) => ({
          type,
          quantity,
          size: size?.trim() || null,
        })),
        employeeId: employee.id,
        price: priceNum,
      });
      toast('Buyurtma yaratildi!', 'success');
      onCreated('orders');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-4">
      <header className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="tap flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Yangi Buyurtma</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Mijoz ma'lumotlarini kiriting</p>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-5">
        {/* Customer info */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Mijoz ma'lumotlari</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Mijoz ismi
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masalan: Akmal Karimov"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Telefon raqami
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99 123 45 67"
                  inputMode="tel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Manzil (qo'lda kiriting)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Masalan: G'allaorol Markaz"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
              <Package className="h-4 w-4" /> Buyurtmalar ro'yxati
            </h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              {items.length} ta
            </span>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div
                key={it.uid}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Buyurtma #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.uid)}
                      className="tap -m-1 rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      aria-label="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Turi
                    </label>
                    <select
                      value={it.type}
                      onChange={(e) => updateItem(it.uid, { type: e.target.value as ItemType })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    >
                      {ITEM_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {ITEM_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Miqdori
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={it.quantity}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateItem(it.uid, { quantity: raw === '' ? 0 : parseInt(raw) || 0 });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    O'lcham (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={it.size ?? ''}
                    onChange={(e) => updateItem(it.uid, { size: e.target.value })}
                    placeholder="Masalan: 2x3"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="tap mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10"
          >
            <Plus className="h-4 w-4" /> Buyurtma qo'shish
          </button>
        </section>

        {/* Price */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
            <CircleDollarSign className="h-4 w-4" /> Narx (ixtiyoriy)
          </h2>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Masalan: 50000"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-14 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
              so'm
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            To'lov keyin "Topshirildi" bosqichida qabul qilinadi
          </p>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
            <FileText className="h-4 w-4" /> Izoh
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Qo'shimcha ma'lumot..."
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
          />
        </section>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="tap flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={saving}
            className="tap flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Saqlash
          </button>
        </div>
      </form>
    </div>
  );
}

export type { ItemForm };
