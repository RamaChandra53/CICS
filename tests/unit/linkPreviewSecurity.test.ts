import { test, expect } from '@playwright/test';
import {
  isPrivateOrReservedIp,
  validateLinkPreviewUrl,
} from '../../src/lib/linkPreviewSecurity';

test.describe('link preview SSRF protection', () => {
  test('blocks localhost hostnames', async () => {
    const result = await validateLinkPreviewUrl(new URL('http://localhost:3000'));
    expect(result.allowed).toBe(false);
  });

  test('blocks private IPv4 literals', async () => {
    const result = await validateLinkPreviewUrl(new URL('http://192.168.1.10/page'));
    expect(result.allowed).toBe(false);
  });

  test('blocks metadata service addresses', async () => {
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
  });

  test('blocks hostnames that resolve to private addresses', async () => {
    const result = await validateLinkPreviewUrl(
      new URL('https://campus.example.test'),
      async () => [{ address: '10.0.0.5' }]
    );
    expect(result.allowed).toBe(false);
  });

  test('allows public http and https hostnames with public DNS results', async () => {
    const result = await validateLinkPreviewUrl(
      new URL('https://example.com/article'),
      async () => [{ address: '93.184.216.34' }]
    );
    expect(result.allowed).toBe(true);
  });

  test('rejects non-http protocols', async () => {
    const result = await validateLinkPreviewUrl(new URL('file:///etc/passwd'));
    expect(result.allowed).toBe(false);
  });
});
