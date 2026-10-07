import { afterEach, describe, expect, it } from 'vitest';
import { seededDatabase, testDatabase } from './d1-test-helper';
import { isSuperuser, organizationRole, authorizeProgram } from '../lib/server/authorization';
import { createClassroom, listOrganizations } from '../lib/server/organizations';
import { queryResource } from '../lib/server/resources';
import { reopenProgram } from '../lib/server/submissions';
import type { QueryRequest } from '../types/resource';

const fixtures: ReturnType<typeof testDatabase>[] = [];
afterEach(() => { for (const fixture of fixtures.splice(0)) fixture.close(); });
const eq = (column: string, value: string) => ({ column, operator: 'eq' as const, value });
const select = (filters: QueryRequest['filters'] = []): QueryRequest => ({ operation: 'select', columns: '*', filters });
const insert = (values: Record<string, unknown>): QueryRequest => ({ operation: 'insert', columns: '*', filters: [], values, returning: true, single: 'single' });
const update = (id: string, values: Record<string, unknown>): QueryRequest => ({ operation: 'update', columns: '*', filters: [eq('id', id)], values, returning: true, single: 'single' });
async function setup() {
  const fixture = await seededDatabase(); fixtures.push(fixture);
  await fixture.db.prepare("INSERT INTO platform_admins(email) VALUES('outsider@example.com')").run();
  return fixture.db;
}
function revokeBeforeBatch(db: D1Database): D1Database {
  let intercepted = false;
  return { prepare: db.prepare.bind(db), batch: async (statements: D1PreparedStatement[]) => {
    if (!intercepted) { intercepted = true; await db.prepare("DELETE FROM platform_admins WHERE email='outsider@example.com'").run(); }
    return db.batch(statements);
  } } as D1Database;
}
async function pendingAlgorithm(db: D1Database) {
  const result = await queryResource(db, 'student', 'algorithm_submissions', insert({ program_id: 'program', content: 'Plan the solution', status: 'pending' }));
  return result.data as { id: string; version: number };
}

describe('Operator-managed global superusers', () => {
  it('activates a pregrant only for a matching verified database identity and revokes on identity changes', async () => {
    const fixture = testDatabase(); fixtures.push(fixture); const db = fixture.db;
    await db.prepare("INSERT INTO platform_admins(email) VALUES('jenin8282@gmail.com')").run();
    expect(await isSuperuser(db, 'jenin')).toBe(false);
    await db.prepare("INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES('jenin','Jenin',' JENIN8282@GMAIL.COM ',0,0,0)").run();
    expect(await isSuperuser(db, 'jenin')).toBe(false);
    await db.prepare("UPDATE user SET emailVerified=1 WHERE id='jenin'").run();
    expect(await isSuperuser(db, 'jenin')).toBe(true);
    await db.prepare("UPDATE user SET email='changed@example.com' WHERE id='jenin'").run();
    expect(await isSuperuser(db, 'jenin')).toBe(false);
    await expect(db.prepare("INSERT INTO platform_admins(email) VALUES(' UPPER@EXAMPLE.COM ')").run()).rejects.toThrow();
  });

  it('lists every existing and future organization with a superuser role without fabricating memberships', async () => {
    const db = await setup();
    await db.prepare("INSERT INTO organizations(id,name) VALUES('future','Future organization')").run();
    const result = await listOrganizations(db, 'outsider');
    expect(result.data.map(row => row.id).sort()).toEqual(['future', 'org', 'other']);
    expect(result.data.every(row => row.role === 'superuser')).toBe(true);
    expect(await organizationRole(db, 'outsider', 'org')).toBe('owner');
    await expect(organizationRole(db, 'outsider', 'missing')).rejects.toMatchObject({ status: 403 });
    expect(await db.prepare("SELECT id FROM organization_members WHERE organization_id='org' AND user_id='outsider'").first()).toBeNull();
    const ordinary = await listOrganizations(db, 'teacher');
    expect(ordinary.data.map(row => [row.id, row.role])).toEqual([['org', 'teacher']]);
  });

  it('allows global draft reads and management while honoring requested resource filters', async () => {
    const db = await setup();
    expect((await authorizeProgram(db, 'outsider', 'draftprogram', 'read')).id).toBe('draftprogram');
    expect((await authorizeProgram(db, 'outsider', 'program2', 'manage')).id).toBe('program2');
    const result = await queryResource(db, 'outsider', 'programs', select([eq('id', 'program2')]));
    expect((result.data as { id: string }[]).map(row => row.id)).toEqual(['program2']);
    await queryResource(db, 'outsider', 'programs', update('program2', { title: 'Global edit' }));
    expect(await db.prepare("SELECT title FROM programs WHERE id='program2'").first('title')).toBe('Global edit');
    expect(await db.prepare("SELECT title FROM programs WHERE id='program'").first('title')).toBe('Question');
    await expect(authorizeProgram(db, 'teacher', 'program2', 'manage')).rejects.toMatchObject({ status: 403 });
  });

  it('keeps profile privacy, profile writes and grant storage protected even from a superuser', async () => {
    const db = await setup();
    const result = await queryResource(db, 'outsider', 'profiles', select([eq('id', 'student')]));
    expect((result.data as Record<string, unknown>[])[0]).toMatchObject({ full_name: 'student', phone: null, bio: null, metadata: null, avatar_url: null });
    await expect(queryResource(db, 'outsider', 'profiles', update('student', { full_name: 'Impersonation' }))).rejects.toMatchObject({ status: 403 });
    await expect(queryResource(db, 'outsider', 'platform_admins', select())).rejects.toMatchObject({ status: 400 });
    await expect(queryResource(db, 'teacher', 'platform_admins', insert({ email: 'teacher@example.com' }))).rejects.toMatchObject({ status: 400 });
    await expect(queryResource(db, 'teacher', 'profiles', update('teacher', { is_superuser: true }))).rejects.toMatchObject({ status: 400 });
    expect(await isSuperuser(db, 'teacher')).toBe(false);
  });

  it('allows admin invitations and removal but retains protected organization owners', async () => {
    const db = await setup();
    await queryResource(db, 'outsider', 'org_invites', insert({ organization_id: 'org', email: 'new@example.com', role: 'admin' }));
    expect(await db.prepare("SELECT role FROM org_invites WHERE email='new@example.com'").first('role')).toBe('admin');
    const remove = (user: string): QueryRequest => ({ operation: 'delete', columns: '*', filters: [eq('organization_id', 'org'), eq('user_id', user)] });
    await expect(queryResource(db, 'outsider', 'organization_members', remove('owner'))).rejects.toMatchObject({ status: 403 });
    await queryResource(db, 'outsider', 'organization_members', remove('admin'));
    expect(await db.prepare("SELECT id FROM organization_members WHERE user_id='admin' AND organization_id='org'").first()).toBeNull();
    expect(await db.prepare("SELECT role FROM organization_members WHERE user_id='owner' AND organization_id='org'").first('role')).toBe('owner');
  });

  it('requires actual organization membership for classroom teacher and member targets', async () => {
    const db = await setup();
    await expect(createClassroom(db, 'outsider', 'org', { name: 'Invalid default' })).rejects.toMatchObject({ status: 403 });
    await expect(createClassroom(db, 'outsider', 'missing', { name: 'Missing', teacherId: 'teacher' })).rejects.toMatchObject({ status: 403 });
    const room = await createClassroom(db, 'outsider', 'org', { name: 'Global creation', teacherId: 'teacher' });
    expect(await db.prepare('SELECT user_id FROM classroom_members WHERE classroom_id=?').bind(room.data.id).first('user_id')).toBe('teacher');
    await queryResource(db, 'outsider', 'classroom_members', insert({ classroom_id: 'class', user_id: 'student2', role: 'student' }));
    await expect(queryResource(db, 'outsider', 'classroom_members', insert({ classroom_id: 'class', user_id: 'outsider', role: 'teacher' }))).rejects.toMatchObject({ status: 403 });
  });

  it('can review and reopen another student while retaining versions, algorithm gates and self-enrollment requirements', async () => {
    const db = await setup(); const algorithm = await pendingAlgorithm(db);
    await expect(queryResource(db, 'outsider', 'algorithm_submissions', update(algorithm.id, { status: 'approved', expectedVersion: 0 }))).rejects.toMatchObject({ status: 409 });
    await queryResource(db, 'outsider', 'algorithm_submissions', update(algorithm.id, { status: 'approved', expectedVersion: 1 }));
    const code = (await queryResource(db, 'student', 'code_submissions', insert({ program_id: 'program', code: 'print(1)', language: 'python', status: 'pending' }))).data as { id: string };
    await queryResource(db, 'outsider', 'code_submissions', update(code.id, { status: 'approved', expectedVersion: 1 }));
    await expect(reopenProgram(db, 'outsider', 'program', { studentId: 'student', algorithmVersion: 1, codeVersion: 2 })).rejects.toMatchObject({ status: 409 });
    await reopenProgram(db, 'outsider', 'program', { studentId: 'student', algorithmVersion: 2, codeVersion: 2 });
    expect(await db.prepare('SELECT status FROM algorithm_submissions WHERE id=?').bind(algorithm.id).first('status')).toBe('draft');
    expect(await db.prepare('SELECT status FROM code_submissions WHERE id=?').bind(code.id).first('status')).toBe('draft');
    await expect(queryResource(db, 'student', 'code_submissions', update(code.id, { status: 'pending', expectedVersion: 3 }))).rejects.toMatchObject({ status: 409 });
    await expect(queryResource(db, 'outsider', 'algorithm_submissions', insert({ program_id: 'program', content: 'Unenrolled', status: 'pending' }))).rejects.toMatchObject({ status: 403 });
    await expect(authorizeProgram(db, 'outsider', 'program', 'submit')).rejects.toMatchObject({ status: 403 });
  });

  it.each(['classroom', 'program', 'organization invite', 'classroom invite', 'member assignment'] as const)('denies %s writes when the grant is revoked immediately before the atomic mutation', async operation => {
    const db = await setup(); const racing = revokeBeforeBatch(db);
    if (operation === 'classroom') {
      await expect(createClassroom(racing, 'outsider', 'org', { name: 'Revoked', teacherId: 'teacher' })).rejects.toMatchObject({ status: 403 });
      expect(await db.prepare("SELECT id FROM classrooms WHERE name='Revoked'").first()).toBeNull();
    } else {
      const [table, values] = operation === 'program' ? ['programs', { classroom_id: 'class', title: 'Revoked' }]
        : operation === 'organization invite' ? ['org_invites', { organization_id: 'org', email: 'revoked@example.com', role: 'admin' }]
        : operation === 'classroom invite' ? ['classroom_invites', { classroom_id: 'class', email: 'revoked@example.com' }]
        : ['classroom_members', { classroom_id: 'class', user_id: 'student2', role: 'student' }];
      await expect(queryResource(racing, 'outsider', table as string, insert(values as Record<string, unknown>))).rejects.toMatchObject({ status: 403 });
      expect(await db.prepare('SELECT count(*) n FROM mutation_guards').first('n')).toBe(0);
      if (operation.includes('invite')) expect(await db.prepare(`SELECT count(*) n FROM ${table}`).first('n')).toBe(0);
      if (operation === 'program') expect(await db.prepare("SELECT id FROM programs WHERE title='Revoked'").first()).toBeNull();
      if (operation === 'member assignment') expect(await db.prepare("SELECT id FROM classroom_members WHERE classroom_id='class' AND user_id='student2'").first()).toBeNull();
    }
    expect(await db.prepare('SELECT count(*) n FROM audit_events').first('n')).toBe(0);
  });

  it('denies reviews and reopens after grant revocation without modifying submission state', async () => {
    const db = await setup(); const row = await pendingAlgorithm(db);
    await expect(queryResource(revokeBeforeBatch(db), 'outsider', 'algorithm_submissions', update(row.id, { status: 'approved', expectedVersion: 1 }))).rejects.toMatchObject({ status: 409 });
    expect(await db.prepare('SELECT status FROM algorithm_submissions WHERE id=?').bind(row.id).first('status')).toBe('pending');
    await db.prepare("INSERT INTO platform_admins(email) VALUES('outsider@example.com')").run();
    await expect(reopenProgram(revokeBeforeBatch(db), 'outsider', 'program', { studentId: 'student', algorithmVersion: 1, codeVersion: 0 })).rejects.toMatchObject({ status: 409 });
    expect(await db.prepare('SELECT status FROM algorithm_submissions WHERE id=?').bind(row.id).first('status')).toBe('pending');
    expect(await db.prepare('SELECT count(*) n FROM mutation_guards').first('n')).toBe(0);
  });
});
