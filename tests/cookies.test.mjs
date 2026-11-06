import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  parseCookieHeader,
  serializeCookieHeader,
  parseSetCookie,
  serializeSetCookie,
} from '../dist/esm/index.js';

test('parses request Cookie pairs and keeps the last duplicate value', () => {
  assert.deepEqual(
    [...parseCookieHeader('a=1; b=two; a=3')],
    [
      ['a', '3'],
      ['b', 'two'],
    ],
  );
});
test('parses limited quoted request values and roundtrips safe cookie pairs', () => {
  assert.equal(parseCookieHeader('token="a\\=b"').get('token'), 'a=b');
  const encoded = serializeCookieHeader([
    ['a', 'one'],
    ['b', 'two'],
  ]);
  assert.equal(encoded, 'a=one; b=two');
  assert.deepEqual(
    [...parseCookieHeader(encoded)],
    [
      ['a', 'one'],
      ['b', 'two'],
    ],
  );
});
test('parses and serializes the explicitly supported Set-Cookie attributes', () => {
  const value = parseSetCookie(
    'sid=abc; Path=/app; Domain=example.test; Max-Age=60; SameSite=Lax; Secure; HttpOnly',
  );
  assert.equal(value.maxAge, 60);
  assert.equal(value.sameSite, 'Lax');
  assert.equal(value.secure, true);
  assert.deepEqual(parseSetCookie(serializeSetCookie(value)), value);
});
test('supports valid dates and rejects malformed attribute values or duplicate attributes', () => {
  assert.equal(
    parseSetCookie('x=y; Expires=Wed, 21 Oct 2015 07:28:00 GMT').expires?.toISOString(),
    '2015-10-21T07:28:00.000Z',
  );
  assert.throws(() => parseSetCookie('x=y; SameSite=Invalid'), TypeError);
  assert.throws(() => parseSetCookie('x=y; Expires=1'), TypeError);
  assert.throws(() => parseSetCookie('x=y; Max-Age=1; Max-Age=2'), /Duplicate/);
});
test('rejects injection, invalid cookie tokens, and control characters', () => {
  for (const value of ['x=y\r\nInjected: z', 'x=y\n', 'bad name=x', 'x=bad; Path=/x\r\n'])
    assert.throws(() => parseSetCookie(value));
  assert.throws(() => serializeCookieHeader([['x', 'bad;value']]), TypeError);
});
test('enforces count, length, integer, and serializer attribute limits', () => {
  assert.throws(
    () => parseCookieHeader(Array.from({ length: 201 }, (_, i) => `x${i}=v`).join('; ')),
    RangeError,
  );
  assert.throws(() => parseSetCookie(`x=${'a'.repeat(8_200)}`), TypeError);
  assert.throws(() => serializeSetCookie({ name: 'x', value: 'y', maxAge: 1.5 }), TypeError);
});
test('CommonJS exposes all cookie codecs', () => {
  const api = createRequire(import.meta.url)('../dist/cjs/index.js');
  assert.deepEqual(Object.keys(api).sort(), [
    'parseCookieHeader',
    'parseSetCookie',
    'serializeCookieHeader',
    'serializeSetCookie',
  ]);
});
