import { lookup } from 'node:dns/promises';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  '0.0.0.0',
]);

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1').replace(/\.$/, '');
}

export function isPrivateOrReservedIp(address: string): boolean {
  const normalized = normalizeHostname(address);

  if (IPV4_PATTERN.test(normalized)) {
    const parts = normalized.split('.').map((part) => Number(part));
    if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return true;
    }

    const [a, b, c, d] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && b === 18) ||
      (a === 198 && b === 19) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224 ||
      (a === 255 && b === 255 && c === 255 && d === 255)
    );
  }

  const compact = normalized.replace(/^0:0:0:0:0:0:0:1$/, '::1');
  return (
    compact === '::1' ||
    compact === '::' ||
    compact.startsWith('fe80:') ||
    compact.startsWith('fc') ||
    compact.startsWith('fd') ||
    compact.startsWith('ff')
  );
}

function isIpLiteral(hostname: string) {
  const normalized = normalizeHostname(hostname);
  return IPV4_PATTERN.test(normalized) || normalized.includes(':');
}

export async function validateLinkPreviewUrl(
  parsedUrl: URL,
  resolveHostname: (hostname: string) => Promise<Array<{ address: string }>> = async (hostname) =>
    lookup(hostname, { all: true })
): Promise<{ allowed: boolean; reason?: string }> {
  const { protocol, hostname } = parsedUrl;
  const normalizedHost = normalizeHostname(hostname);

  if (protocol !== 'http:' && protocol !== 'https:') {
    return { allowed: false, reason: 'Only http and https URLs are supported.' };
  }

  if (BLOCKED_HOSTNAMES.has(normalizedHost)) {
    return { allowed: false, reason: 'URL is not allowed.' };
  }

  if (isIpLiteral(normalizedHost)) {
    return {
      allowed: !isPrivateOrReservedIp(normalizedHost),
      reason: isPrivateOrReservedIp(normalizedHost) ? 'URL is not allowed.' : undefined,
    };
  }

  let resolvedAddresses: Array<{ address: string }>;
  try {
    resolvedAddresses = await resolveHostname(normalizedHost);
  } catch {
    return { allowed: false, reason: 'Unable to resolve URL hostname.' };
  }

  if (
    resolvedAddresses.length === 0 ||
    resolvedAddresses.some(({ address }) => isPrivateOrReservedIp(address))
  ) {
    return { allowed: false, reason: 'URL is not allowed.' };
  }

  return { allowed: true };
}
