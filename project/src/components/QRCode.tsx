import { useEffect, useRef, useState } from 'react';
import QRCodeImpl from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 160, className }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(false);
    QRCodeImpl.toCanvas(
      canvas,
      value,
      {
        width: size,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) setError(true);
      },
    );
  }, [value, size]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-slate-100 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        {value}
      </div>
    );
  }

  return <canvas ref={canvasRef} className={className} style={{ width: size, height: size }} />;
}
