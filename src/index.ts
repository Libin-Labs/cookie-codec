const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$(?![\s\S])/;
const COOKIE_VALUE = /^[\x21-\x3A\x3C-\x7E]*$(?![\s\S])/;
const MAX_LENGTH = 8_192;

export interface SetCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
  httpOnly?: boolean;
}

function safe(input: string): void {
  if (typeof input !== 'string' || input.length > MAX_LENGTH || /[\r\n\0]/.test(input))
    throw new TypeError('Invalid or overlong cookie input.');
}

function validPair(name: string, value: string): void {
  if (!TOKEN.test(name) || !COOKIE_VALUE.test(value))
    throw new TypeError('Invalid cookie name or value.');
}

function unquote(value: string): string {
  if (!value.startsWith('"')) return value;
  if (!value.endsWith('"') || value.length < 2)
    throw new TypeError('Malformed quoted cookie value.');
  const inner = value.slice(1, -1);
  if (!/^(?:[\x20-\x21\x23-\x5B\x5D-\x7E]|\\[\x20-\x7E])*$(?![\s\S])/.test(inner))
    throw new TypeError('Malformed quoted cookie value.');
  return inner.replace(/\\(.)/g, '$1');
}

export function parseCookieHeader(header: string): Map<string, string> {
  safe(header);
  const result = new Map<string, string>();
  const parts = header.split(';');
  if (parts.length > 200) throw new RangeError('Cookie count limit exceeded.');
  for (const part of parts) {
    const text = part.trim();
    if (!text) continue;
    const equals = text.indexOf('=');
    if (equals <= 0) throw new TypeError('Cookie pair must contain a name and value.');
    const name = text.slice(0, equals).trim();
    const value = unquote(text.slice(equals + 1).trim());
    validPair(name, value);
    result.set(name, value);
  }
  return result;
}

export function serializeCookieHeader(cookies: Iterable<readonly [string, string]>): string {
  const parts: string[] = [];
  for (const [name, value] of cookies) {
    validPair(name, value);
    parts.push(`${name}=${value}`);
    if (parts.length > 200) throw new RangeError('Cookie count limit exceeded.');
  }
  const result = parts.join('; ');
  safe(result);
  return result;
}

export function parseSetCookie(header: string): SetCookie {
  safe(header);
  const parts = header.split(';');
  const first = parts.shift()!.trim();
  const equals = first.indexOf('=');
  if (equals <= 0) throw new TypeError('Set-Cookie requires a name-value pair.');
  const name = first.slice(0, equals).trim();
  const value = unquote(first.slice(equals + 1).trim());
  validPair(name, value);
  const cookie: SetCookie = { name, value };
  const seen = new Set<string>();
  for (const raw of parts) {
    const attr = raw.trim();
    if (!attr) continue;
    const index = attr.indexOf('=');
    const key = (index < 0 ? attr : attr.slice(0, index)).toLowerCase();
    const content = index < 0 ? '' : attr.slice(index + 1).trim();
    if (!TOKEN.test(key)) throw new TypeError('Invalid Set-Cookie attribute.');
    if (seen.has(key)) throw new TypeError(`Duplicate Set-Cookie attribute: ${key}`);
    seen.add(key);
    if (key === 'secure' || key === 'httponly') {
      if (index >= 0) throw new TypeError(`${key} does not take a value.`);
      if (key === 'secure') cookie.secure = true;
      else cookie.httpOnly = true;
    } else if (key === 'path' || key === 'domain') {
      if (index < 0 || !content || /[\x00-\x20\x7f;]/.test(content))
        throw new TypeError(`Invalid ${key} attribute.`);
      if (key === 'path') cookie.path = content;
      else cookie.domain = content;
    } else if (key === 'max-age') {
      if (!/^-?(?:0|[1-9]\d*)$(?![\s\S])/.test(content)) throw new TypeError('Invalid Max-Age.');
      const age = Number(content);
      if (!Number.isSafeInteger(age))
        throw new RangeError('Max-Age is outside the safe integer range.');
      cookie.maxAge = age;
    } else if (key === 'expires') {
      const date = new Date(content);
      if (
        !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$(?![\s\S])/.test(
          content,
        ) ||
        Number.isNaN(date.getTime()) ||
        date.toUTCString() !== content
      )
        throw new TypeError('Invalid Expires date.');
      cookie.expires = date;
    } else if (key === 'samesite') {
      const mode = content.toLowerCase();
      if (mode === 'strict') cookie.sameSite = 'Strict';
      else if (mode === 'lax') cookie.sameSite = 'Lax';
      else if (mode === 'none') cookie.sameSite = 'None';
      else throw new TypeError('Invalid SameSite value.');
    }
  }
  return cookie;
}

export function serializeSetCookie(cookie: SetCookie): string {
  if (!cookie || typeof cookie !== 'object') throw new TypeError('Expected a Set-Cookie object.');
  validPair(cookie.name, cookie.value);
  if (
    (cookie.secure !== undefined && typeof cookie.secure !== 'boolean') ||
    (cookie.httpOnly !== undefined && typeof cookie.httpOnly !== 'boolean')
  )
    throw new TypeError('Cookie flags must be booleans.');
  const parts = [`${cookie.name}=${cookie.value}`];
  if (cookie.path !== undefined) parts.push(`Path=${attribute(cookie.path)}`);
  if (cookie.domain !== undefined) parts.push(`Domain=${attribute(cookie.domain)}`);
  if (cookie.maxAge !== undefined) {
    if (!Number.isSafeInteger(cookie.maxAge))
      throw new TypeError('Max-Age must be a safe integer.');
    parts.push(`Max-Age=${cookie.maxAge}`);
  }
  if (cookie.expires !== undefined) {
    if (!(cookie.expires instanceof Date) || Number.isNaN(cookie.expires.getTime()))
      throw new TypeError('Expires must be a valid Date.');
    parts.push(`Expires=${cookie.expires.toUTCString()}`);
  }
  if (cookie.sameSite !== undefined) {
    if (!['Strict', 'Lax', 'None'].includes(cookie.sameSite))
      throw new TypeError('Invalid SameSite value.');
    parts.push(`SameSite=${cookie.sameSite}`);
  }
  if (cookie.secure) parts.push('Secure');
  if (cookie.httpOnly) parts.push('HttpOnly');
  const result = parts.join('; ');
  safe(result);
  return result;
}

function attribute(value: string): string {
  if (!value || /[\x00-\x20\x7f;]/.test(value))
    throw new TypeError('Invalid cookie attribute value.');
  return value;
}
