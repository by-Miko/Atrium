import { MOBILE_LINK_TOKEN_SESSION_KEY } from './mobileSync';

function safeGetSessionItem(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function isElectronDesktop(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean((window as unknown as { electronAPI?: unknown }).electronAPI)
  );
}

export function isMobileLinkSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.location.search.includes('ml_token=') ||
    Boolean(safeGetSessionItem('atrium_ml_token')) ||
    Boolean(safeGetSessionItem(MOBILE_LINK_TOKEN_SESSION_KEY))
  );
}

export function isWebEdition(): boolean {
  if (isElectronDesktop() || isMobileLinkSession()) {
    return false;
  }

  if (import.meta.env.VITE_WEB_DEMO === 'true') {
    return true;
  }

  if (typeof window !== 'undefined') {
    return (
      window.location.protocol === 'http:' ||
      window.location.protocol === 'https:'
    );
  }

  return false;
}

export function getBaseAssetUrl(relativePath: string): string {
  const rawBase = import.meta.env.BASE_URL || './';
  const normalizedBase = rawBase.replace(/\/+$/, '');
  const cleanRelative = relativePath.replace(/^\/+/, '');

  if (!cleanRelative) {
    return normalizedBase ? `${normalizedBase}/` : '/';
  }

  return `${normalizedBase}/${cleanRelative}`;
}
