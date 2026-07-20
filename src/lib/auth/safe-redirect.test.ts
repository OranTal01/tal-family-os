import { describe, expect, it } from 'vitest';
import { sanitizeRedirectTarget } from '@/lib/auth/safe-redirect';

describe('sanitizeRedirectTarget (open-redirect protection)', () => {
  it('accepts a plain internal path', () => {
    expect(sanitizeRedirectTarget('/budget')).toBe('/budget');
  });

  it('accepts an internal path with a query string', () => {
    expect(sanitizeRedirectTarget('/transactions?month=2026-07')).toBe(
      '/transactions?month=2026-07',
    );
  });

  it('falls back to /dashboard for an absolute external URL', () => {
    expect(sanitizeRedirectTarget('https://evil.example')).toBe('/dashboard');
  });

  it('falls back to /dashboard for a protocol-relative URL', () => {
    expect(sanitizeRedirectTarget('//evil.example')).toBe('/dashboard');
  });

  it('falls back to /dashboard for a backslash protocol-relative trick', () => {
    expect(sanitizeRedirectTarget('/\\evil.example')).toBe('/dashboard');
  });

  it('falls back to /dashboard for a javascript: URI', () => {
    expect(sanitizeRedirectTarget('javascript:alert(1)')).toBe('/dashboard');
  });

  it('falls back to /dashboard for the login route itself', () => {
    expect(sanitizeRedirectTarget('/login')).toBe('/dashboard');
    expect(sanitizeRedirectTarget('/login?redirectedFrom=/budget')).toBe('/dashboard');
  });

  it('falls back to /dashboard for an empty or missing value', () => {
    expect(sanitizeRedirectTarget('')).toBe('/dashboard');
    expect(sanitizeRedirectTarget(null)).toBe('/dashboard');
    expect(sanitizeRedirectTarget(undefined)).toBe('/dashboard');
  });

  it('falls back to /dashboard for a path containing an embedded origin', () => {
    expect(sanitizeRedirectTarget('/redirect?to=https://evil.example')).toBe('/dashboard');
  });
});
