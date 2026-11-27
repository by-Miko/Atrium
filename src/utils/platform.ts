export function isElectronDesktop(): boolean {
  return (
    typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron)
  );
}

export function isNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cap = window.Capacitor;
    return Boolean(
      cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'android'
    );
  } catch {
    return false;
  }
}

export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

export function isMobileOrAndroidRuntime(): boolean {
  if (isElectronDesktop()) return false;
  return isNativeAndroid() || isMobileUserAgent();
}
