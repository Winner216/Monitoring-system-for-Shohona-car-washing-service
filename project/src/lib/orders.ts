import { supabase } from './supabase';
import { STATUS_ORDER } from './constants';
import { generateOrderNumber } from './utils';
import type {
  Employee,
  Order,
  OrderItemInput,
  OrderStatus,
  StatusHistory,
} from './types';

export async function fetchEmployee(userId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Employee | null;
}

export async function createEmployeeProfile(userId: string, name: string, role: 'admin' | 'xodim' = 'xodim'): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({ id: userId, name, role })
    .select('id, name, role, created_at')
    .single();
  if (error) throw error;
  return data as Employee;
}

async function nextOrderNumber(): Promise<string> {
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return generateOrderNumber((data ?? []).map((r) => r.order_number));
}

export interface NewOrderPayload {
  customerName: string;
  phone: string;
  location: Order['location'];
  notes: string | null;
  items: OrderItemInput[];
  employeeId: string;
  price: number | null;
}

export async function createOrder(payload: NewOrderPayload): Promise<Order> {
  const orderNumber = await nextOrderNumber();
  const nowIso = new Date().toISOString();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_name: payload.customerName,
      phone: payload.phone,
      location: payload.location,
      notes: payload.notes,
      status: 'qabul_qilindi',
      created_by: payload.employeeId,
      price: payload.price,
    })
    .select('id, order_number, customer_name, phone, location, notes, status, price, paid, paid_at, created_at, updated_at, created_by')
    .single();
  if (orderError) throw orderError;

  const items = payload.items.map((it) => ({
    order_id: order.id,
    type: it.type,
    quantity: it.quantity,
    size: it.size,
  }));
  if (items.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(items);
    if (itemsError) throw itemsError;
  }

  const { error: histError } = await supabase.from('status_history').insert({
    order_id: order.id,
    status: 'qabul_qilindi',
    started_at: nowIso,
    employee_id: payload.employeeId,
  });
  if (histError) throw histError;

  return order as Order;
}

export async function updateOrder(
  id: string,
  patch: Partial<Pick<Order, 'customer_name' | 'phone' | 'location' | 'notes' | 'price'>>,
): Promise<void> {
  const { error } = await supabase.from('orders').update(patch).eq('id', id);
  if (error) throw error;
}

export async function recordPayment(id: string, price: number): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ price, paid: true, paid_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function recordDeliveryWithPayment(
  orderId: string,
  newStatus: OrderStatus,
  employeeId: string,
  price: number,
): Promise<void> {
  await changeStatus(orderId, newStatus, employeeId);
  const { error } = await supabase
    .from('orders')
    .update({ price, paid: true, paid_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
}

export async function changeStatus(
  orderId: string,
  newStatus: OrderStatus,
  employeeId: string,
): Promise<void> {
  const nowIso = new Date().toISOString();

  // 1. Close out any open history row for this order
  const { data: openRows, error: openErr } = await supabase
    .from('status_history')
    .select('id, status')
    .eq('order_id', orderId)
    .is('finished_at', null);
  if (openErr) throw openErr;

  if (openRows && openRows.length > 0) {
    const updates = openRows.map((r) =>
      supabase.from('status_history').update({ finished_at: nowIso }).eq('id', r.id),
    );
    const results = await Promise.all(updates);
    for (const r of results) if (r.error) throw r.error;
  }

  // 2. Insert new status row with started_at = now
  const { error: insertErr } = await supabase.from('status_history').insert({
    order_id: orderId,
    status: newStatus,
    started_at: nowIso,
    employee_id: employeeId,
  });
  if (insertErr) throw insertErr;

  // 3. Update order current status
  const { error: orderErr } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);
  if (orderErr) throw orderErr;
}

export async function fetchOrders(filter?: { status?: OrderStatus[]; search?: string }): Promise<Order[]> {
  let q = supabase
    .from('orders')
    .select(
      `id, order_number, customer_name, phone, location, notes, status, price, paid, paid_at, created_at, updated_at, created_by,
       order_items(id, order_id, type, quantity, size, created_at),
       status_history(id, order_id, status, started_at, finished_at, employee_id, created_at),
       created_by_employee:created_by(id, name, role, created_at)`,
    )
    .order('created_at', { ascending: false });

  if (filter?.status && filter.status.length > 0) {
    q = q.in('status', filter.status);
  }

  if (filter?.search && filter.search.trim()) {
    const s = filter.search.trim();
    q = q.or(`customer_name.ilike.%${s}%,phone.ilike.%${s}%,order_number.ilike.%${s}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, order_number, customer_name, phone, location, notes, status, price, paid, paid_at, created_at, updated_at, created_by,
       order_items(id, order_id, type, quantity, size, created_at),
       status_history(id, order_id, status, started_at, finished_at, employee_id, created_at),
       created_by_employee:created_by(id, name, role, created_at)`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Order | null;
}

export async function fetchTodayStatusHistory(): Promise<StatusHistory[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('status_history')
    .select('id, order_id, status, started_at, finished_at, employee_id, created_at')
    .gte('started_at', start.toISOString())
    .order('started_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as StatusHistory[];
}

export async function fetchMonthStatusHistory(monthStart: Date): Promise<StatusHistory[]> {
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  const { data, error } = await supabase
    .from('status_history')
    .select('id, order_id, status, started_at, finished_at, employee_id, created_at')
    .gte('started_at', monthStart.toISOString())
    .lt('started_at', monthEnd.toISOString())
    .order('started_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as StatusHistory[];
}

export function statusIndex(s: OrderStatus): number {
  return STATUS_ORDER.indexOf(s);
}
