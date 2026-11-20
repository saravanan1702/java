import { describe, expect, it } from 'vitest';
import { assignableRoles, checkMemberChange, hasPermission } from './roles.js';

describe('hasPermission', () => {
  it('grants managers write access and agents read access', () => {
    expect(hasPermission('OWNER', 'workspace:delete')).toBe(true);
    expect(hasPermission('ADMIN', 'workspace:delete')).toBe(false);
    expect(hasPermission('ADMIN', 'members:invite')).toBe(true);
    expect(hasPermission('AGENT', 'members:invite')).toBe(false);
    expect(hasPermission('AGENT', 'inbox:reply')).toBe(true);
  });

  it('denies when there is no role', () => {
    expect(hasPermission(null, 'workspace:read')).toBe(false);
    expect(hasPermission(undefined, 'workspace:read')).toBe(false);
  });
});

describe('assignableRoles', () => {
  it('limits what each role may grant', () => {
    expect(assignableRoles('OWNER')).toEqual(['OWNER', 'ADMIN', 'AGENT']);
    expect(assignableRoles('ADMIN')).toEqual(['ADMIN', 'AGENT']);
    expect(assignableRoles('AGENT')).toEqual([]);
  });
});

describe('checkMemberChange', () => {
  const base = { actorIsTarget: false, ownerCount: 2 } as const;

  it('blocks self changes', () => {
    expect(checkMemberChange({ ...base, actorIsTarget: true, actorRole: 'OWNER', targetRole: 'OWNER', newRole: 'ADMIN' }).ok).toBe(false);
  });

  it('blocks agents from managing anyone', () => {
    expect(checkMemberChange({ ...base, actorRole: 'AGENT', targetRole: 'AGENT', newRole: 'ADMIN' }).ok).toBe(false);
  });

  it('lets admins manage agents only and never grant owner', () => {
    expect(checkMemberChange({ ...base, actorRole: 'ADMIN', targetRole: 'AGENT', newRole: 'ADMIN' }).ok).toBe(true);
    expect(checkMemberChange({ ...base, actorRole: 'ADMIN', targetRole: 'AGENT' }).ok).toBe(true);
    expect(checkMemberChange({ ...base, actorRole: 'ADMIN', targetRole: 'AGENT', newRole: 'OWNER' }).ok).toBe(false);
    expect(checkMemberChange({ ...base, actorRole: 'ADMIN', targetRole: 'ADMIN', newRole: 'AGENT' }).ok).toBe(false);
    expect(checkMemberChange({ ...base, actorRole: 'ADMIN', targetRole: 'OWNER' }).ok).toBe(false);
  });

  it('protects the last owner', () => {
    expect(checkMemberChange({ ...base, ownerCount: 1, actorRole: 'OWNER', targetRole: 'OWNER', newRole: 'ADMIN' }).ok).toBe(false);
    expect(checkMemberChange({ ...base, ownerCount: 1, actorRole: 'OWNER', targetRole: 'OWNER' }).ok).toBe(false);
    expect(checkMemberChange({ ...base, ownerCount: 2, actorRole: 'OWNER', targetRole: 'OWNER' }).ok).toBe(true);
  });
});
