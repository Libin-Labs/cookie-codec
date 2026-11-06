import { parseCookieHeader, serializeSetCookie, type SetCookie } from '@lp-labs/cookie-codec';
const cookie: SetCookie = { name: 'sid', value: 'abc', sameSite: 'Lax', secure: true };
const values: Map<string, string> = parseCookieHeader('sid=abc');
const line: string = serializeSetCookie(cookie);
// @ts-expect-error SameSite is a closed supported set.
const bad: SetCookie = { name: 'sid', value: 'abc', sameSite: 'Default' };
void [values, line, bad];
