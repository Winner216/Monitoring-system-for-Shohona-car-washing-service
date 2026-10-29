import { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewOrderPage } from '@/pages/NewOrderPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderDetailsPage } from '@/pages/OrderDetailsPage';
import { ReadyOrdersPage } from '@/pages/ReadyOrdersPage';
import { IncomePage } from '@/pages/IncomePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { BottomNav } from '@/components/BottomNav';
import { Loader2 } from 'lucide-react';
import { fetchOrders } from '@/lib/orders';

export type Page = 'dashboard' | 'neworder' | 'orders' | 'ready' | 'income' | 'reports' | 'settings' | 'details';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);

  const navigate = useCallback((p: Page) => {
    setPage(p);
    if (p !== 'details') setOrderId(null);
    window.scrollTo({ top: 0 });
  }, []);

  const openOrder = useCallback((id: string) => {
    setOrderId(id);
    setPage('details');
    window.scrollTo({ top: 0 });
  }, []);

  // Keep the ready-orders badge fresh
  useEffect(() => {
    if (!session) return;
    let active = true;
    const update = async () => {
      try {
        const ords = await fetchOrders({ status: ['tayyor'] });
        if (active) setReadyCount(ords.length);
      } catch {
        // ignore
      }
    };
    update();
    const interval = setInterval(update, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session, page]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const showBottomNav = page !== 'details' && page !== 'neworder';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="min-h-screen">
        {page === 'dashboard' && <DashboardPage onNavigate={navigate} onOpenOrder={openOrder} />}
        {page === 'neworder' && (
          <NewOrderPage onBack={() => navigate('dashboard')} onCreated={(p) => navigate(p)} />
        )}
        {page === 'orders' && <OrdersPage onOpenOrder={openOrder} />}
        {page === 'details' && orderId && (
          <OrderDetailsPage
            orderId={orderId}
            onBack={() => navigate('orders')}
            onDeleted={() => navigate('orders')}
          />
        )}
        {page === 'ready' && <ReadyOrdersPage onOpenOrder={openOrder} />}
        {page === 'income' && <IncomePage />}
        {page === 'reports' && <ReportsPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
      {showBottomNav && <BottomNav current={page} onNavigate={navigate} readyCount={readyCount} />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
