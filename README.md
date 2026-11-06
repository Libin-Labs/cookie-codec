# @lp-labs/cookie-codec

Small strict codecs for request `Cookie` pairs and response `Set-Cookie`. These are deliberately
separate wire formats; this package has no cookie jar, browser storage, or implicit state.
Independent, with zero runtime or peer dependencies.

## Install and quickstart

```bash
npm install @lp-labs/cookie-codec
```

```js
import { parseCookieHeader, serializeSetCookie } from '@lp-labs/cookie-codec';

const requestCookies = parseCookieHeader('session=abc; theme=dark');
if (requestCookies.get('theme') !== 'dark') throw new Error('Cookie lookup failed');
const response = serializeSetCookie({
  name: 'session',
  value: 'abc',
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
});
if (!response.includes('HttpOnly')) throw new Error('Set-Cookie serialization failed');
```

## API and supported subset

- `parseCookieHeader(header): Map<string, string>` parses semicolon-separated request pairs;
  duplicate names use the last value (the map retains the first insertion position).
- `serializeCookieHeader(pairs): string` writes request pairs as `name=value; ...`.
- `parseSetCookie(header): SetCookie` parses one response cookie and supported attributes.
- `serializeSetCookie(cookie): string` writes one response cookie.
- `SetCookie` has required `name` and `value`, plus optional `path`, `domain`, `maxAge` (safe
  integer seconds), `expires` (`Date`), `sameSite` (`Strict | Lax | None`), `secure`, and `httpOnly`.

Names follow HTTP token syntax; values use the unquoted cookie-octet subset. Request values may
also use a restricted quoted-string form with quoted-pair unescaping. Set-Cookie recognizes
`Path`, `Domain`, `Max-Age`, `Expires`, `SameSite`, `Secure`, and `HttpOnly`; duplicate attributes
are rejected. Unknown attributes are ignored. CR, LF and NUL are rejected, as are malformed dates,
integers, quotes and attribute values. Input and output are limited to 8,192 characters and
request cookie lists to 200 pairs. Failures are `TypeError` or `RangeError`.

Encoding/decoding a list is O(n) in its input size with O(n) output storage. No percent decoding,
domain/path matching, expiry policy, prefix enforcement, SameSite defaults, or persistence is
performed. Attribute parsing is a documented subset, not a browser cookie implementation; this
codec does not sanitize paths or domains for application policy.

Runtime exports: `parseCookieHeader`, `serializeCookieHeader`, `parseSetCookie`,
`serializeSetCookie`. Type export: `SetCookie`. ESM/CommonJS with declarations; Node.js 18+,
ES2022, no browser globals.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
