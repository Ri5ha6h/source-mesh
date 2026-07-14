import { describe, expect, it } from 'vitest';
import {
  computeMembershipCapabilities,
  computePlatformCapabilities,
  type MembershipRole,
  type PlatformRole,
} from '../src/index.js';

describe('capability matrix', () => {
  it.each<readonly [readonly PlatformRole[], readonly string[], readonly string[]]>([
    [['platform_admin'], ['tenant:manage', 'catalog:manage', 'audit:read'], ['mapping:publish']],
    [['platform_approver'], ['mapping:review', 'mapping:publish'], ['tenant:manage']],
    [['platform_admin', 'platform_approver'], ['tenant:manage', 'mapping:publish'], []],
  ])('computes platform capabilities for %j', (roles, allowed, denied) => {
    const capabilities = computePlatformCapabilities(roles);
    allowed.forEach((capability) => expect(capabilities).toContain(capability));
    denied.forEach((capability) => expect(capabilities).not.toContain(capability));
  });

  it.each<readonly [MembershipRole, readonly string[], readonly string[]]>([
    ['tenant_admin', ['workspace:configure', 'member:manage'], []],
    ['tenant_operator', ['reference:create', 'crawl:retry'], ['workspace:configure']],
    ['tenant_viewer', ['workspace:read', 'evidence:read'], ['reference:create']],
  ])('computes workspace capabilities for %s', (role, allowed, denied) => {
    const capabilities = computeMembershipCapabilities([role]);
    allowed.forEach((capability) => expect(capabilities).toContain(capability));
    denied.forEach((capability) => expect(capabilities).not.toContain(capability));
  });
});
