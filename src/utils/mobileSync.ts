import type {
  Character,
  ChatMessage,
  MeshVpnProvider,
  MobileLinkInfoResponse,
  MobilePairingProfile,
  MobileSyncPreferences,
  MobileSyncStatePayload,
  OllamaSettings,
  SmartRouteType,
  StoryMemoryEntry,
} from '../types/chat';
import { sanitizeImageUrl } from './imageUpload';

export const MOBILE_LINK_TOKEN_SESSION_KEY = 'atrium.mobileLink.token.v1';
export const MOBILE_LINK_DEVICE_ID_KEY = 'atrium_ml_device_id';
export const MOBILE_PAIRING_PROFILE_STORAGE_KEY =
  'atrium.mobileLink.pairingProfile.v1';
export const SMART_ROUTE_TIMEOUT_MS = 450;

let mobileLinkClientActive = false;
let ephemeralDeviceIdFallback: string | null = null;
let activeMobileLinkOrigin = '';

function generateDeviceUuid(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      ''
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `ml-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getMobileLinkDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.sessionStorage.getItem(MOBILE_LINK_DEVICE_ID_KEY);
    if (existing && existing.trim()) {
      return existing.trim();
    }
    const created = generateDeviceUuid();
    window.sessionStorage.setItem(MOBILE_LINK_DEVICE_ID_KEY, created);
    return created;
  } catch {
    if (!ephemeralDeviceIdFallback) {
      ephemeralDeviceIdFallback = generateDeviceUuid();
    }
    return ephemeralDeviceIdFallback;
  }
}

export function getActiveMobileLinkOrigin(): string {
  return activeMobileLinkOrigin;
}

export function setActiveMobileLinkOrigin(origin: string): void {
  activeMobileLinkOrigin = origin.trim().replace(/\/+$/, '');
}

export function getMobileLinkEventsUrl(): string {
  const prefix = activeMobileLinkOrigin;
  return `${prefix}/api/mobile-link/events?deviceId=${encodeURIComponent(
    getMobileLinkDeviceId()
  )}`;
}

export function setMobileLinkClientActive(active: boolean): void {
  mobileLinkClientActive = Boolean(active);
}

export function isMobileLinkClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.electronAPI?.isElectron) return false;
  if (mobileLinkClientActive) return true;
  if (getMobileLinkSessionToken()) return true;
  try {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('ml_token')) {
      return true;
    }
  } catch {
    // ignore malformed URL
  }
  return false;
}

function parseIpv4Octets(hostname: string): number[] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;
  if (!parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) {
    return null;
  }
  return parts.map(Number);
}

/**
 * Strictly validates Smart Dual-Route URLs:
 * - https:// is allowed (excluding link-local/metadata/0.0.0.0)
 * - Unencrypted http:// is ONLY permitted for private LAN/VPN IPv4 ranges:
 *   127.0.0.1 (loopback), 192.168.x.x, 10.x.x.x, 172.16-31.x.x, 100.64-127.x.x
 * - Public IPs or arbitrary hostnames over plain http:// are rejected.
 */
export function isSafeMobileLinkRouteUrl(rawUrl?: string | null): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.username || parsed.password) return false;
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === '0.0.0.0' ||
    host === 'metadata' ||
    host.endsWith('.internal') ||
    host.startsWith('fe80:')
  ) {
    return false;
  }

  const octets = parseIpv4Octets(host);
  if (octets && octets[0] === 169 && octets[1] === 254) {
    return false;
  }

  if (parsed.protocol === 'https:') {
    return true;
  }

  // Plain http:// MUST be strictly one of the private LAN/VPN IPv4 ranges
  if (!octets) {
    return false;
  }
  const [a, b, c, d] = octets;
  if (a === 127 && b === 0 && c === 0 && d === 1) return true; // 127.0.0.1
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (Tailscale/CGNAT)
  return false;
}

export function classifyMobileLinkRouteType(rawUrl: string): SmartRouteType {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const octets = parseIpv4Octets(host);
    if (octets && octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
      return 'vpn';
    }
  } catch {
    // ignore
  }
  return 'lan';
}

export function normalizeMobileLinkOrigin(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  return `${parsed.protocol}//${parsed.host}`;
}

export function loadMobilePairingProfile(): MobilePairingProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MOBILE_PAIRING_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MobilePairingProfile>;
    if (!parsed || typeof parsed !== 'object') return null;

    const lanUrl =
      parsed.lanUrl && isSafeMobileLinkRouteUrl(parsed.lanUrl)
        ? normalizeMobileLinkOrigin(parsed.lanUrl)
        : undefined;
    const vpnUrl =
      parsed.vpnUrl && isSafeMobileLinkRouteUrl(parsed.vpnUrl)
        ? normalizeMobileLinkOrigin(parsed.vpnUrl)
        : undefined;
    const activeOrigin =
      parsed.activeOrigin && isSafeMobileLinkRouteUrl(parsed.activeOrigin)
        ? normalizeMobileLinkOrigin(parsed.activeOrigin)
        : undefined;

    if (!lanUrl && !vpnUrl && !activeOrigin) return null;

    return {
      lanUrl,
      vpnUrl,
      vpnProvider: parsed.vpnProvider ?? null,
      hostLabel:
        typeof parsed.hostLabel === 'string' ? parsed.hostLabel : undefined,
      activeRouteType:
        parsed.activeRouteType === 'vpn' || parsed.activeRouteType === 'lan'
          ? parsed.activeRouteType
          : undefined,
      activeOrigin,
      lastLatencyMs:
        typeof parsed.lastLatencyMs === 'number' ? parsed.lastLatencyMs : null,
      updatedAt:
        typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveMobilePairingProfile(profile: MobilePairingProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!profile) {
      window.localStorage.removeItem(MOBILE_PAIRING_PROFILE_STORAGE_KEY);
      return;
    }
    const sanitized: MobilePairingProfile = {
      ...(profile.lanUrl && isSafeMobileLinkRouteUrl(profile.lanUrl)
        ? { lanUrl: normalizeMobileLinkOrigin(profile.lanUrl) }
        : {}),
      ...(profile.vpnUrl && isSafeMobileLinkRouteUrl(profile.vpnUrl)
        ? { vpnUrl: normalizeMobileLinkOrigin(profile.vpnUrl) }
        : {}),
      vpnProvider: profile.vpnProvider ?? null,
      ...(profile.hostLabel ? { hostLabel: profile.hostLabel } : {}),
      ...(profile.activeRouteType
        ? { activeRouteType: profile.activeRouteType }
        : {}),
      ...(profile.activeOrigin &&
      isSafeMobileLinkRouteUrl(profile.activeOrigin)
        ? { activeOrigin: normalizeMobileLinkOrigin(profile.activeOrigin) }
        : {}),
      lastLatencyMs:
        typeof profile.lastLatencyMs === 'number'
          ? profile.lastLatencyMs
          : null,
      updatedAt: profile.updatedAt || Date.now(),
    };
    window.localStorage.setItem(
      MOBILE_PAIRING_PROFILE_STORAGE_KEY,
      JSON.stringify(sanitized)
    );
  } catch {
    // ignore quota errors
  }
}

export function parseMobileLinkPairingInput(
  rawInput: string,
  tokenOverride?: string
): { origin: string; token: string | null; routeType: SmartRouteType } {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Enter a Desktop QR URL or private IP address.');
  }

  let candidateUrl = trimmed;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidateUrl)) {
    const hasPort = /:\d{1,5}(?:\/|$)/.test(candidateUrl);
    candidateUrl = hasPort
      ? `http://${candidateUrl}`
      : `http://${candidateUrl.replace(/\/+$/, '')}:41730`;
  }

  if (!isSafeMobileLinkRouteUrl(candidateUrl)) {
    throw new Error(
      'Blocked insecure route: unencrypted http:// is strictly limited to private LAN/VPN IPv4 ranges (127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16-31.x.x, 100.64-127.x.x).'
    );
  }

  const parsed = new URL(candidateUrl);
  const urlToken = parsed.searchParams.get('ml_token')?.trim() || null;
  const resolvedToken = tokenOverride?.trim() || urlToken;
  const origin = normalizeMobileLinkOrigin(candidateUrl);

  return {
    origin,
    token: resolvedToken,
    routeType: classifyMobileLinkRouteType(origin),
  };
}

export async function fetchMobileLinkInfo(
  baseOrigin: string,
  token?: string | null,
  signal?: AbortSignal
): Promise<MobileLinkInfoResponse | null> {
  const cleanOrigin = baseOrigin.trim().replace(/\/+$/, '');
  if (cleanOrigin && !isSafeMobileLinkRouteUrl(cleanOrigin)) {
    return null;
  }

  const resolvedToken = token ?? getMobileLinkSessionToken();
  const headers: Record<string, string> = {
    'X-Atrium-Device-Id': getMobileLinkDeviceId(),
  };
  if (resolvedToken) {
    headers['X-Atrium-Token'] = resolvedToken;
  }

  const isSameOrigin =
    !cleanOrigin ||
    (typeof window !== 'undefined' && cleanOrigin === window.location.origin);

  const res = await fetch(`${cleanOrigin}/api/mobile-link/info`, {
    method: 'GET',
    ...(isSameOrigin ? { credentials: 'same-origin' as const } : {}),
    headers,
    signal,
  });

  if (!res.ok) return null;
  const ct = res.headers.get('content-type')?.toLowerCase() ?? '';
  if (!ct.includes('application/json')) return null;

  const data = (await res.json()) as MobileLinkInfoResponse;
  if (!data || typeof data !== 'object' || !data.active) return null;
  return data;
}

export interface SmartRouteResolution {
  origin: string;
  routeType: SmartRouteType;
  vpnProvider: MeshVpnProvider | null;
  latencyMs: number;
  info: MobileLinkInfoResponse;
  profile: MobilePairingProfile;
}

/**
 * Smart Dual-Route: Races LAN vs Encrypted Mesh VPN simultaneously via Promise.any
 * with a strict 450ms timeout per route and selects the fastest reachable origin.
 */
export async function resolveBestMobileLinkRoute(
  profile: MobilePairingProfile,
  tokenOverride?: string | null,
  timeoutMs = SMART_ROUTE_TIMEOUT_MS
): Promise<SmartRouteResolution | null> {
  const token = tokenOverride ?? getMobileLinkSessionToken();
  const candidates: Array<{ origin: string; routeType: SmartRouteType }> = [];

  if (profile.lanUrl && isSafeMobileLinkRouteUrl(profile.lanUrl)) {
    candidates.push({
      origin: normalizeMobileLinkOrigin(profile.lanUrl),
      routeType: 'lan',
    });
  }
  if (profile.vpnUrl && isSafeMobileLinkRouteUrl(profile.vpnUrl)) {
    const vpnOrigin = normalizeMobileLinkOrigin(profile.vpnUrl);
    if (!candidates.some((c) => c.origin === vpnOrigin)) {
      candidates.push({
        origin: vpnOrigin,
        routeType: 'vpn',
      });
    }
  }
  if (
    candidates.length === 0 &&
    profile.activeOrigin &&
    isSafeMobileLinkRouteUrl(profile.activeOrigin)
  ) {
    const fallbackOrigin = normalizeMobileLinkOrigin(profile.activeOrigin);
    candidates.push({
      origin: fallbackOrigin,
      routeType: classifyMobileLinkRouteType(fallbackOrigin),
    });
  }

  if (candidates.length === 0) return null;

  const probeCandidate = async (candidate: {
    origin: string;
    routeType: SmartRouteType;
  }): Promise<SmartRouteResolution> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();

    try {
      const info = await fetchMobileLinkInfo(
        candidate.origin,
        token,
        controller.signal
      );
      if (!info) {
        throw new Error(`Route ${candidate.origin} unreachable or unauthorized`);
      }

      const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
      const discoveredLan =
        info.lanUrl && isSafeMobileLinkRouteUrl(info.lanUrl)
          ? normalizeMobileLinkOrigin(info.lanUrl)
          : info.urls?.lan?.[0] && isSafeMobileLinkRouteUrl(info.urls.lan[0])
            ? normalizeMobileLinkOrigin(info.urls.lan[0])
            : profile.lanUrl;
      const discoveredVpn =
        info.vpnUrl && isSafeMobileLinkRouteUrl(info.vpnUrl)
          ? normalizeMobileLinkOrigin(info.vpnUrl)
          : info.urls?.tailscale?.[0] &&
              isSafeMobileLinkRouteUrl(info.urls.tailscale[0])
            ? normalizeMobileLinkOrigin(info.urls.tailscale[0])
            : profile.vpnUrl;

      const nextProfile: MobilePairingProfile = {
        lanUrl: discoveredLan,
        vpnUrl: discoveredVpn,
        vpnProvider: info.vpnProvider ?? profile.vpnProvider ?? null,
        hostLabel: new URL(candidate.origin).host,
        activeRouteType: candidate.routeType,
        activeOrigin: candidate.origin,
        lastLatencyMs: latencyMs,
        updatedAt: Date.now(),
      };

      saveMobilePairingProfile(nextProfile);
      setActiveMobileLinkOrigin(candidate.origin);
      setMobileLinkClientActive(true);

      return {
        origin: candidate.origin,
        routeType: candidate.routeType,
        vpnProvider: nextProfile.vpnProvider ?? null,
        latencyMs,
        info,
        profile: nextProfile,
      };
    } finally {
      window.clearTimeout(timer);
    }
  };

  try {
    return await Promise.any(candidates.map(probeCandidate));
  } catch {
    return null;
  }
}

export async function pairWithMobileLinkDesktop(
  rawInput: string,
  tokenOverride?: string
): Promise<SmartRouteResolution> {
  const parsed = parseMobileLinkPairingInput(rawInput, tokenOverride);
  if (!parsed.token) {
    throw new Error(
      'Missing Mobile Link pairing token. Scan the Desktop QR or paste the full pairing URL.'
    );
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3000);
  const startedAt = performance.now();

  try {
    const info = await fetchMobileLinkInfo(
      parsed.origin,
      parsed.token,
      controller.signal
    );
    if (!info) {
      throw new Error(
        'Could not verify Desktop Mobile Link host. Check that Desktop Mobile Link is active and the token is current.'
      );
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    setMobileLinkSessionToken(parsed.token);
    setActiveMobileLinkOrigin(parsed.origin);
    setMobileLinkClientActive(true);

    const lanCandidate =
      info.lanUrl && isSafeMobileLinkRouteUrl(info.lanUrl)
        ? normalizeMobileLinkOrigin(info.lanUrl)
        : info.urls?.lan?.[0] && isSafeMobileLinkRouteUrl(info.urls.lan[0])
          ? normalizeMobileLinkOrigin(info.urls.lan[0])
          : parsed.routeType === 'lan'
            ? parsed.origin
            : undefined;

    const vpnCandidate =
      info.vpnUrl && isSafeMobileLinkRouteUrl(info.vpnUrl)
        ? normalizeMobileLinkOrigin(info.vpnUrl)
        : info.urls?.tailscale?.[0] &&
            isSafeMobileLinkRouteUrl(info.urls.tailscale[0])
          ? normalizeMobileLinkOrigin(info.urls.tailscale[0])
          : parsed.routeType === 'vpn'
            ? parsed.origin
            : undefined;

    const profile: MobilePairingProfile = {
      lanUrl: lanCandidate,
      vpnUrl: vpnCandidate,
      vpnProvider: info.vpnProvider ?? null,
      hostLabel: new URL(parsed.origin).host,
      activeRouteType: parsed.routeType,
      activeOrigin: parsed.origin,
      lastLatencyMs: latencyMs,
      updatedAt: Date.now(),
    };
    saveMobilePairingProfile(profile);

    return {
      origin: parsed.origin,
      routeType: parsed.routeType,
      vpnProvider: profile.vpnProvider ?? null,
      latencyMs,
      info,
      profile,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function scanNativeAndroidQrCode(): Promise<string> {
  if (typeof window === 'undefined' || !window.Capacitor) {
    throw new Error('NATIVE_SCANNER_UNAVAILABLE');
  }
  const plugins = window.Capacitor.Plugins;
  const scanner =
    plugins?.MLKitBarcodeScanning ??
    plugins?.BarcodeScanning ??
    plugins?.BarcodeScanner;

  if (!scanner) {
    throw new Error('NATIVE_SCANNER_UNAVAILABLE');
  }

  if (
    'requestPermissions' in scanner &&
    typeof scanner.requestPermissions === 'function'
  ) {
    const perm = await scanner.requestPermissions();
    if (perm?.camera === 'denied') {
      throw new Error('CAMERA_PERMISSION_DENIED');
    }
  }

  const scanFn =
    scanner.scan ??
    ('startScan' in scanner ? scanner.startScan : undefined);
  if (typeof scanFn !== 'function') {
    throw new Error('NATIVE_SCANNER_UNAVAILABLE');
  }

  const result = await scanFn.call(scanner);
  const rawValue =
    result?.content ||
    result?.rawValue ||
    result?.barcodes?.[0]?.rawValue ||
    result?.barcodes?.[0]?.displayValue ||
    '';

  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error('QR_SCAN_CANCELLED');
  }
  return trimmed;
}

export function isLocalLoopbackUrl(rawUrl?: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed === '/api' || trimmed === '/v1' || trimmed === '/v1/') {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export function isLocalLmStudioUrl(rawUrl?: string): boolean {
  if (!isLocalLoopbackUrl(rawUrl)) return false;
  const trimmed = rawUrl!.trim();
  if (trimmed === '/v1' || trimmed === '/v1/') return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.port === '1234';
  } catch {
    return false;
  }
}

export function isPublicHttpsApiUrl(rawUrl?: string): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('/')) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      !host ||
      host === '0.0.0.0' ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === 'metadata' ||
      host === '::1' ||
      host.startsWith('fe80:')
    ) {
      return false;
    }
    const parts = host.split('.');
    if (
      parts.length === 4 &&
      parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
    ) {
      const [a, b] = parts.map(Number);
      if (
        a === 127 ||
        a === 10 ||
        a === 100 ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function resolveSafeSyncedOpenAiBaseUrl(
  settings?: Partial<Pick<OllamaSettings, 'provider' | 'baseUrl' | 'openaiBaseUrl'>>
): string | undefined {
  if (!settings) return undefined;
  const candidate =
    settings.provider === 'openai' &&
    settings.baseUrl &&
    settings.baseUrl !== '/v1'
      ? settings.baseUrl
      : settings.openaiBaseUrl ||
        (settings.baseUrl === '/v1' ? 'http://127.0.0.1:1234/v1' : undefined);
  if (!candidate) return undefined;
  if (isLocalLoopbackUrl(candidate)) {
    const trimmed = candidate.trim().replace(/\/+$/, '');
    return trimmed === '/v1' ? 'http://127.0.0.1:1234/v1' : trimmed;
  }
  if (isPublicHttpsApiUrl(candidate)) {
    return candidate.trim().replace(/\/+$/, '');
  }
  return undefined;
}

export function getMobileLinkSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.sessionStorage.getItem(MOBILE_LINK_TOKEN_SESSION_KEY);
    return token && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

export function setMobileLinkSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = token.trim();
  if (!trimmed) return;
  try {
    window.sessionStorage.setItem(MOBILE_LINK_TOKEN_SESSION_KEY, trimmed);
  } catch {
    // ignore sessionStorage errors in restricted browsing contexts
  }
}

export function clearMobileLinkSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(MOBILE_LINK_TOKEN_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Captures `?ml_token=...` into tab-scoped sessionStorage (never localStorage)
 * and strips the query parameter immediately from the address bar.
 */
export function bootstrapMobileLinkSession(): {
  hadUrlToken: boolean;
  token: string | null;
} {
  if (typeof window === 'undefined') {
    return { hadUrlToken: false, token: null };
  }

  try {
    const currentUrl = new URL(window.location.href);
    const urlToken = currentUrl.searchParams.get('ml_token')?.trim();
    if (urlToken) {
      setMobileLinkSessionToken(urlToken);
      setMobileLinkClientActive(true);
      currentUrl.searchParams.delete('ml_token');
      const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      window.history.replaceState(window.history.state, '', nextUrl || '/');
      return { hadUrlToken: true, token: urlToken };
    }
  } catch {
    // ignore malformed URL
  }

  const existingToken = getMobileLinkSessionToken();
  if (existingToken) {
    setMobileLinkClientActive(true);
  }

  return {
    hadUrlToken: false,
    token: existingToken,
  };
}

function stableFnvHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(36)}:${(h2 >>> 0).toString(36)}:${input.length}`;
}

function canonicalizeSyncValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(canonicalizeSyncValue);
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      out[key] = canonicalizeSyncValue(val);
    }
  }
  return out;
}

export function serializeNormalizedSyncPayload(
  payload: Pick<
    MobileSyncStatePayload,
    'characters' | 'chats' | 'storyMemory' | 'preferences'
  >
): string {
  const cleanedChats: Record<string, ChatMessage[]> = {};
  for (const [charId, msgs] of Object.entries(payload.chats ?? {})) {
    if (!Array.isArray(msgs)) continue;
    cleanedChats[charId] = msgs.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false } : m
    );
  }

  const rawSettings = payload.preferences?.settings;
  const safeNormalizedOpenaiUrl = resolveSafeSyncedOpenAiBaseUrl(rawSettings);
  const normalizedPreferences = payload.preferences
    ? {
        ...payload.preferences,
        ...(rawSettings
          ? {
              settings: {
                provider: rawSettings.provider === 'openai' ? 'openai' : 'ollama',
                ...(safeNormalizedOpenaiUrl
                  ? { openaiBaseUrl: safeNormalizedOpenaiUrl }
                  : {}),
                selectedModel: rawSettings.selectedModel ?? '',
                availableModels: Array.isArray(rawSettings.availableModels)
                  ? rawSettings.availableModels
                  : [],
                temperature: rawSettings.temperature,
                numPredict: rawSettings.numPredict,
                numCtx: rawSettings.numCtx,
                storyMemoryEnabled: rawSettings.storyMemoryEnabled !== false,
              },
            }
          : {}),
      }
    : {};

  const canonical = canonicalizeSyncValue({
    characters: sanitizeCharactersForSync(payload.characters ?? []),
    chats: cleanedChats,
    storyMemory: payload.storyMemory ?? {},
    preferences: normalizedPreferences,
  });

  return JSON.stringify(canonical);
}

export function computeMobileSyncStateHash(
  payload: Pick<
    MobileSyncStatePayload,
    'characters' | 'chats' | 'storyMemory' | 'preferences'
  >
): string {
  return stableFnvHash(serializeNormalizedSyncPayload(payload));
}

export function computeMobileSyncSignature(
  payload: MobileSyncStatePayload
): string {
  return `${payload.updatedAt}:${computeMobileSyncStateHash(payload)}`;
}

export function computeMobileSyncContentFingerprint(
  payload: Pick<
    MobileSyncStatePayload,
    'characters' | 'chats' | 'storyMemory' | 'preferences'
  >,
  options?: { ignoreSettingsAndPersona?: boolean }
): string {
  const normalizedChars = sanitizeCharactersForSync(payload.characters ?? []).map(
    (char) => ({
      id: char.id,
      name: char.name,
      role: char.role,
      bioLen: char.bio.length,
      bioHash: stableFnvHash(char.bio),
      greetingLen: char.greeting.length,
      greetingHash: stableFnvHash(char.greeting),
      promptLen: char.systemPrompt.length,
      promptHash: stableFnvHash(char.systemPrompt),
      imageUrl: char.imageUrl ?? '',
      stageBackground: char.stageBackground ?? '',
      wallpaperUrl: char.wallpaperUrl ?? '',
      tags: Array.isArray(char.tags) ? char.tags : [],
      icon: char.icon,
      tone: char.tone,
    })
  );

  const chatEntries: Record<
    string,
    {
      count: number;
      lastId: string;
      messages: Array<[string, string, number, number, number, string]>;
    }
  > = {};

  const chatKeys = Object.keys(payload.chats ?? {}).sort();
  for (const charId of chatKeys) {
    const msgs = payload.chats?.[charId];
    if (!Array.isArray(msgs)) continue;
    const lastMsg = msgs[msgs.length - 1];
    chatEntries[charId] = {
      count: msgs.length,
      lastId: lastMsg?.id ?? '',
      messages: msgs.map((m) => [
        m.id,
        m.role,
        m.content.length,
        m.activeSwipeIndex ?? 0,
        Array.isArray(m.swipes) ? m.swipes.length : 0,
        stableFnvHash(m.content),
      ]),
    };
  }

  const prefs = payload.preferences ?? {};
  const rawSettings = prefs.settings;
  const normalizedPrefs: Record<string, unknown> = {
    activeCharacterId: prefs.activeCharacterId ?? '',
    characterOrder: Array.isArray(prefs.characterOrder)
      ? prefs.characterOrder
      : [],
    themeId: prefs.themeId ?? '',
    bubbleSchemeId: prefs.bubbleSchemeId ?? '',
    language: prefs.language ?? '',
    wallpaperFit: prefs.wallpaperFit ?? '',
    parallaxEnabled:
      typeof prefs.parallaxEnabled === 'boolean' ? prefs.parallaxEnabled : null,
    visualSettings: prefs.visualSettings ?? null,
  };

  if (!options?.ignoreSettingsAndPersona) {
    const safeFingerprintOpenaiUrl =
      resolveSafeSyncedOpenAiBaseUrl(rawSettings);
    normalizedPrefs.userPersona = prefs.userPersona ?? null;
    normalizedPrefs.selectedModel = rawSettings?.selectedModel ?? '';
    normalizedPrefs.settings = rawSettings
      ? {
          provider: rawSettings.provider === 'openai' ? 'openai' : 'ollama',
          ...(safeFingerprintOpenaiUrl
            ? { openaiBaseUrl: safeFingerprintOpenaiUrl }
            : {}),
          selectedModel: rawSettings.selectedModel ?? '',
          modelNames: Array.isArray(rawSettings.availableModels)
            ? rawSettings.availableModels.map((m) => m.name)
            : [],
          temperature: rawSettings.temperature,
          numPredict: rawSettings.numPredict,
          numCtx: rawSettings.numCtx,
          storyMemoryEnabled: rawSettings.storyMemoryEnabled !== false,
        }
      : null;
  }

  const canonical = canonicalizeSyncValue({
    characters: normalizedChars,
    chats: chatEntries,
    storyMemory: payload.storyMemory ?? {},
    preferences: normalizedPrefs,
  });

  return stableFnvHash(JSON.stringify(canonical));
}

export function normalizeAssetUrlForSync(
  rawUrl: string | undefined
): string | undefined {
  const safe = sanitizeImageUrl(rawUrl);
  if (!safe) return undefined;

  if (safe.startsWith('file:')) {
    const assetsIdx = safe.lastIndexOf('/assets/');
    if (assetsIdx !== -1) {
      return `.${safe.slice(assetsIdx)}`;
    }
    return undefined;
  }

  return safe;
}

export function sanitizeCharactersForSync(characters: Character[]): Character[] {
  return characters.map((char) => ({
    ...char,
    imageUrl: normalizeAssetUrlForSync(char.imageUrl),
    stageBackground: normalizeAssetUrlForSync(char.stageBackground),
    wallpaperUrl: normalizeAssetUrlForSync(char.wallpaperUrl),
  }));
}

export function buildMobileSyncPayload(params: {
  updatedAt: number;
  characters: Character[];
  conversations: Record<string, ChatMessage[]>;
  storyMemories: Record<string, StoryMemoryEntry>;
  preferences: Omit<MobileSyncPreferences, 'settings'> & {
    settings?: OllamaSettings;
  };
}): MobileSyncStatePayload {
  const cleanedChats: Record<string, ChatMessage[]> = {};
  for (const [charId, msgs] of Object.entries(params.conversations)) {
    if (!Array.isArray(msgs)) continue;
    cleanedChats[charId] = msgs.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false } : m
    );
  }

  // Strictly omit apiKey, device-local baseUrl, and any non-local external URLs from sync relay
  const rawSettings = params.preferences.settings;
  const safeOpenaiUrl = resolveSafeSyncedOpenAiBaseUrl(rawSettings);
  const safeSettingsPrefs: MobileSyncPreferences['settings'] = rawSettings
    ? {
        provider: rawSettings.provider === 'openai' ? 'openai' : 'ollama',
        ...(safeOpenaiUrl ? { openaiBaseUrl: safeOpenaiUrl } : {}),
        selectedModel: rawSettings.selectedModel,
        availableModels: Array.isArray(rawSettings.availableModels)
          ? rawSettings.availableModels
          : [],
        temperature: rawSettings.temperature,
        numPredict: rawSettings.numPredict,
        numCtx: rawSettings.numCtx,
        storyMemoryEnabled: rawSettings.storyMemoryEnabled !== false,
      }
    : undefined;

  const { settings: _ignoredSettings, ...restPrefs } = params.preferences;

  return {
    updatedAt: params.updatedAt,
    characters: sanitizeCharactersForSync(params.characters),
    chats: cleanedChats,
    storyMemory: params.storyMemories,
    preferences: {
      ...restPrefs,
      ...(safeSettingsPrefs ? { settings: safeSettingsPrefs } : {}),
    },
  };
}

export async function fetchMobileSyncState(
  baseOrigin = '',
  token?: string | null,
  signal?: AbortSignal
): Promise<MobileSyncStatePayload | null> {
  const resolvedOrigin = (baseOrigin || activeMobileLinkOrigin).replace(
    /\/+$/,
    ''
  );
  const resolvedToken = token ?? getMobileLinkSessionToken();
  const deviceId = getMobileLinkDeviceId();
  const headers: Record<string, string> = {
    'X-Atrium-Device-Id': deviceId,
  };
  if (resolvedToken) {
    headers['X-Atrium-Token'] = resolvedToken;
  }

  const deviceQuery =
    !resolvedOrigin || isMobileLinkClient()
      ? `?deviceId=${encodeURIComponent(deviceId)}`
      : '';
  const endpoint = `${resolvedOrigin}/api/mobile-sync/state${deviceQuery}`;
  const isSameOrigin =
    !resolvedOrigin ||
    (typeof window !== 'undefined' &&
      resolvedOrigin === window.location.origin);

  const response = await fetch(endpoint, {
    method: 'GET',
    ...(isSameOrigin ? { credentials: 'same-origin' as const } : {}),
    headers,
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  const data = (await response.json()) as Partial<MobileSyncStatePayload>;
  if (!data || typeof data !== 'object' || typeof data.updatedAt !== 'number') {
    return null;
  }

  return {
    updatedAt: data.updatedAt,
    characters: Array.isArray(data.characters) ? data.characters : [],
    chats:
      data.chats && typeof data.chats === 'object' && !Array.isArray(data.chats)
        ? data.chats
        : {},
    storyMemory:
      data.storyMemory &&
      typeof data.storyMemory === 'object' &&
      !Array.isArray(data.storyMemory)
        ? data.storyMemory
        : {},
    preferences:
      data.preferences &&
      typeof data.preferences === 'object' &&
      !Array.isArray(data.preferences)
        ? data.preferences
        : {},
  };
}

export async function postMobileSyncState(
  payload: MobileSyncStatePayload,
  baseOrigin = '',
  token?: string | null,
  signal?: AbortSignal
): Promise<{ ok: boolean; updatedAt: number } | null> {
  const resolvedOrigin = (baseOrigin || activeMobileLinkOrigin).replace(
    /\/+$/,
    ''
  );
  const resolvedToken = token ?? getMobileLinkSessionToken();
  const deviceId = getMobileLinkDeviceId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Atrium-Device-Id': deviceId,
  };
  if (resolvedToken) {
    headers['X-Atrium-Token'] = resolvedToken;
  }

  const deviceQuery =
    !resolvedOrigin || isMobileLinkClient()
      ? `?deviceId=${encodeURIComponent(deviceId)}`
      : '';
  const endpoint = `${resolvedOrigin}/api/mobile-sync/state${deviceQuery}`;
  const isSameOrigin =
    !resolvedOrigin ||
    (typeof window !== 'undefined' &&
      resolvedOrigin === window.location.origin);

  const response = await fetch(endpoint, {
    method: 'POST',
    ...(isSameOrigin ? { credentials: 'same-origin' as const } : {}),
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { ok?: boolean; updatedAt?: number };
  if (typeof data?.updatedAt !== 'number') {
    return null;
  }
  return {
    ok: Boolean(data.ok),
    updatedAt: data.updatedAt,
  };
}

/**
 * Cross-origin SSE subscription using fetch() streaming so native Capacitor Android
 * (origin http://localhost or capacitor://localhost) can send X-Atrium-Token and
 * X-Atrium-Device-Id headers across LAN and Mesh VPN routes.
 */
export function subscribeMobileLinkEvents(params: {
  baseOrigin?: string;
  token?: string | null;
  onSync: (data: { updatedAt?: number }) => void;
  onConnected?: (data: { updatedAt?: number }) => void;
}): () => void {
  const resolvedOrigin = (params.baseOrigin ?? activeMobileLinkOrigin)
    .trim()
    .replace(/\/+$/, '');
  const resolvedToken = params.token ?? getMobileLinkSessionToken();
  if (!resolvedOrigin || !resolvedToken) {
    return () => {};
  }

  let closed = false;
  let activeController: AbortController | null = null;
  let reconnectTimer: number | null = null;

  const dispatchFrame = (rawFrame: string) => {
    const lines = rawFrame.split(/\r?\n/);
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (!line || line.startsWith(':')) continue;
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length === 0) return;
    let parsed: { updatedAt?: number };
    try {
      parsed = JSON.parse(dataLines.join('\n')) as { updatedAt?: number };
    } catch {
      return;
    }
    if (eventName === 'sync') {
      params.onSync(parsed);
    } else if (eventName === 'connected') {
      params.onConnected?.(parsed);
    }
  };

  const connect = async () => {
    if (closed) return;
    activeController = new AbortController();
    const deviceId = getMobileLinkDeviceId();
    const url = `${resolvedOrigin}/api/mobile-link/events?deviceId=${encodeURIComponent(deviceId)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'X-Atrium-Token': resolvedToken,
          'X-Atrium-Device-Id': deviceId,
        },
        signal: activeController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let separatorIndex = buffer.search(/\r?\n\r?\n/);
        while (separatorIndex !== -1) {
          const frame = buffer.slice(0, separatorIndex);
          const match = buffer.slice(separatorIndex).match(/^\r?\n\r?\n/);
          buffer = buffer.slice(separatorIndex + (match ? match[0].length : 2));
          dispatchFrame(frame);
          separatorIndex = buffer.search(/\r?\n\r?\n/);
        }
      }
    } catch {
      // Transient drop or abort; reconnect below unless closed
    } finally {
      activeController = null;
      if (!closed) {
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          void connect();
        }, 3000);
      }
    }
  };

  void connect();

  return () => {
    closed = true;
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    activeController?.abort();
    activeController = null;
  };
}
