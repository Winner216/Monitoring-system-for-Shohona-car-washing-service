import type { ItemType, OrderStatus } from './types';

export const STATUS_ORDER: OrderStatus[] = [
  'qabul_qilindi',
  'yuvishda',
  'tozalanmoqda',
  'quritilmoqda',
  'tayyor',
  'topshirildi',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  qabul_qilindi: 'Qabul qilindi',
  yuvishda: 'Yuvishda',
  tozalanmoqda: "Tozalanmoqda",
  quritilmoqda: 'Quritilmoqda',
  tayyor: 'Tayyor',
  topshirildi: 'Topshirildi',
};

export const STATUS_COLORS: Record<
  OrderStatus,
  { text: string; bg: string; border: string; ring: string; dot: string; hex: string }
> = {
  qabul_qilindi: {
    text: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-700/40',
    border: 'border-slate-300 dark:border-slate-600',
    ring: 'ring-slate-400/30',
    dot: 'bg-slate-400',
    hex: '#64748b',
  },
  yuvishda: {
    text: 'text-blue-600 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-300 dark:border-blue-500/40',
    ring: 'ring-blue-400/30',
    dot: 'bg-blue-500',
    hex: '#3b82f6',
  },
  tozalanmoqda: {
    text: 'text-cyan-600 dark:text-cyan-300',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-300 dark:border-cyan-500/40',
    ring: 'ring-cyan-400/30',
    dot: 'bg-cyan-500',
    hex: '#06b6d4',
  },
  quritilmoqda: {
    text: 'text-orange-600 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-300 dark:border-orange-500/40',
    ring: 'ring-orange-400/30',
    dot: 'bg-orange-500',
    hex: '#f97316',
  },
  tayyor: {
    text: 'text-green-600 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-500/10',
    border: 'border-green-300 dark:border-green-500/40',
    ring: 'ring-green-400/30',
    dot: 'bg-green-500',
    hex: '#22c55e',
  },
  topshirildi: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-500/15',
    border: 'border-emerald-400 dark:border-emerald-500/50',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-700',
    hex: '#047857',
  },
};

export const ITEM_LABELS: Record<ItemType, string> = {
  gilam: 'Gilam',
  korpa: "Ko'rpa",
  korpacha: "Ko'rpacha",
  adeyol: 'Adeyol',
  mebel: 'Mebel',
  parda: 'Parda',
};

export const ITEM_ICONS: Record<ItemType, string> = {
  gilam: '🧶',
  korpa: '🛏️',
  korpacha: '🧸',
  adeyol: '🧥',
  mebel: '🛋️',
  parda: '🪟',
};

export const ITEM_TYPES: ItemType[] = ['gilam', 'korpa', 'korpacha', 'adeyol', 'mebel', 'parda'];

export const ROLE_LABELS = {
  admin: 'Administrator',
  xodim: 'Xodim',
} as const;

export const DRYING_ALERT_HOURS = 24;
