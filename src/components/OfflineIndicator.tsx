import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UIStrings } from '../i18n/translations';

interface OfflineIndicatorProps {
  t: UIStrings;
}

export function OfflineIndicator({ t }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400/35 bg-amber-950/85 px-4 py-2 text-xs font-medium text-amber-100 shadow-xl backdrop-blur-xl"
    >
      <WifiOff className="h-3.5 w-3.5 text-amber-300" />
      <span>{t.offlineMessage}</span>
    </div>
  );
}
