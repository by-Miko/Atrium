const UNSAFE_CONTROL_AND_BIDI_REGEX =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

export function sanitizeRenderedText(raw: string): string {
  if (typeof raw !== 'string' || !raw) return '';
  return raw.replace(UNSAFE_CONTROL_AND_BIDI_REGEX, '');
}
