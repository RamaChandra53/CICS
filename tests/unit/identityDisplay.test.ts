import { expect, test } from '@playwright/test';
import {
  getDefaultPublishingIdentity,
  getPostIdentityDisplay,
  getPublicProfileHref,
  PUBLISHING_IDENTITIES,
} from '../../src/lib/identityDisplay';

test.describe('identity display privacy', () => {
  const profile = {
    pseudo_username: 'EchoCircuit',
    real_display_name: 'Rahul',
    full_name: 'Rahul Kumar',
    branch: 'CSE',
    year: '2nd',
  };

  test('exposes exactly the three publishing identities', () => {
    expect(PUBLISHING_IDENTITIES).toEqual(['pseudo', 'full', 'anonymous']);
  });

  test('renders pseudo and full identities distinctly', () => {
    expect(getPostIdentityDisplay(profile, 'pseudo').displayName).toBe('EchoCircuit');
    expect(getPostIdentityDisplay(profile, 'full').displayName).toBe('Rahul');
  });

  test('anonymous display never leaks profile identity', () => {
    const anonymous = getPostIdentityDisplay(profile, 'anonymous');
    expect(anonymous.displayName).toBe('Anonymous');
    expect(anonymous.displayName).not.toContain('EchoCircuit');
    expect(anonymous.displayName).not.toContain('Rahul');
  });

  test('public profile links use the pseudo slug and anonymous has no profile object', () => {
    expect(getPublicProfileHref(profile)).toBe('/user/EchoCircuit');
    expect(getPublicProfileHref(null)).toBeNull();
  });

  test('anonymous is never persisted as a profile default', () => {
    expect(getDefaultPublishingIdentity({ default_identity: 'full' })).toBe('full');
    expect(getDefaultPublishingIdentity({ default_identity: 'pseudo' })).toBe('pseudo');
    expect(getDefaultPublishingIdentity(undefined)).toBe('pseudo');
  });
});
