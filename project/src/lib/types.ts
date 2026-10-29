export type Role = 'admin' | 'xodim';

export type OrderStatus =
  | 'qabul_qilindi'
  | 'yuvishda'
  | 'tozalanmoqda'
  | 'quritilmoqda'
  | 'tayyor'
  | 'topshirildi';

export type ItemType = 'gilam' | 'korpa' | 'korpacha' | 'adeyol' | 'mebel' | 'parda';

export type LocationType = string;

export interface Employee {
  id: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  type: ItemType;
  quantity: number;
  size: string | null;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  started_at: string;
  finished_at: string | null;
  employee_id: string | null;
  created_at: string;
  employee?: Employee | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  location: LocationType;
  notes: string | null;
  status: OrderStatus;
  price: number | null;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  order_items?: OrderItem[];
  status_history?: StatusHistory[];
  created_by_employee?: Employee | null;
}

export interface OrderInput {
  order_number: string;
  customer_name: string;
  phone: string;
  location: LocationType;
  notes: string | null;
  status: OrderStatus;
  price: number | null;
}

export interface OrderItemInput {
  type: ItemType;
  quantity: number;
  size: string | null;
}
