import { Plus, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export function PullToRefresh({ onRefresh, children, threshold = 70 }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      } else {
        startY.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        setPull(Math.min(diff * 0.5, threshold * 1.5));
      }
    };

    const onTouchEnd = async () => {
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pull, refreshing, onRefresh, threshold]);

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center overflow-hidden transition-transform"
        style={{ height: `${Math.max(pull, refreshing ? threshold : 0)}px` }}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 transition-transform ${
            refreshing ? 'animate-spin' : ''
          }`}
          style={{ transform: `rotate(${pull * 2}deg)` }}
        >
          {refreshing ? <RotateCw className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </div>
      </div>
      <div
        style={{ transform: `translateY(${pull}px)` }}
        className={pull > 0 || refreshing ? 'transition-transform' : ''}
      >
        {children}
      </div>
    </div>
  );
}
