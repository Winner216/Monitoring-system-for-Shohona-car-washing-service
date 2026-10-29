import { forwardRef } from 'react';
import { STATUS_LABELS, ITEM_LABELS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import type { Order } from '@/lib/types';

interface ReceiptProps {
  order: Order;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ order }, ref) => {
  const items = order.order_items ?? [];
  return (
    <div
      ref={ref}
      className="mx-auto max-w-xs bg-white p-5 text-slate-900"
      style={{ width: 280, fontFamily: 'Inter, sans-serif' }}
    >
      <div className="text-center">
        <h1 className="text-base font-bold">Gilam Yuvish</h1>
        <p className="text-[10px] text-slate-500">Boshqaruv Tizimi</p>
        <div className="my-2 border-t border-dashed border-slate-300" />
      </div>

      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Buyurtma:</span>
          <span className="font-bold">{order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Sana:</span>
          <span>{formatDateTime(order.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Holati:</span>
          <span className="font-semibold">{STATUS_LABELS[order.status]}</span>
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-slate-300" />

      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Mijoz:</span>
          <span className="font-semibold">{order.customer_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Telefon:</span>
          <span>{order.phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Manzil:</span>
          <span>{order.location}</span>
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-slate-300" />

      <div className="text-[11px]">
        <p className="mb-1 font-semibold">Buyurtmalar:</p>
        {items.length === 0 ? (
          <p className="text-slate-400">Buyurtmalar yo'q</p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>
                  {it.quantity}× {ITEM_LABELS[it.type]}
                  {it.size ? ` (${it.size})` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {order.notes && (
        <>
          <div className="my-2 border-t border-dashed border-slate-300" />
          <p className="text-[11px] text-slate-500">Izoh: {order.notes}</p>
        </>
      )}

      {order.price != null && (
        <>
          <div className="my-2 border-t border-dashed border-slate-300" />
          <div className="flex justify-between text-[12px] font-bold">
            <span>Jami:</span>
            <span>{new Intl.NumberFormat('uz-UZ').format(order.price)} so'm</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>To'lov:</span>
            <span>{order.paid ? "To'langan" : "To'lanmagan"}</span>
          </div>
        </>
      )}

      <div className="my-2 border-t border-dashed border-slate-300" />
      <p className="text-center text-[10px] text-slate-400">Rahmat! Iltimos, chekni saqlang.</p>
    </div>
  );
});

Receipt.displayName = 'Receipt';
