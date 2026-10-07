import { afterEach, describe, expect, it, vi } from 'vitest';
import { seededDatabase } from './d1-test-helper';
import { avatarContentType } from '@/lib/server/avatar';
import { boundedJson, consumeQuota, integrationFailure, readBoundedBody } from '@/lib/server/integration-utils';
import { handleError } from '@/lib/server/http';
import { z } from 'zod';

const runtime = vi.hoisted(() => ({ env: {} as Record<string, unknown>, actorId: 'student' }));
vi.mock('@/lib/server/runtime', () => ({ getEnv: () => runtime.env }));
vi.mock('@/lib/server/session', () => ({ requireActor: async () => ({ id: runtime.actorId, emailVerified: true }) }));
import { POST as execute } from '@/app/api/execute/route';
import { POST as assist } from '@/app/api/ai/assist/route';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); runtime.actorId = 'student'; });
const request = (body: unknown) => new Request('http://localhost:3000/api/test', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

function stream(parts: string[], onCancel?: () => void) {
  let index = 0;
  return new ReadableStream<Uint8Array>({ pull(controller) { if (index < parts.length) controller.enqueue(new TextEncoder().encode(parts[index++])); else controller.close(); }, cancel() { onCancel?.(); } });
}

describe('bounded request/provider bodies', () => {
  it('joins chunked bytes and allows the exact byte budget', async () => {
    expect(new TextDecoder().decode(await readBoundedBody(stream(['ab', 'cd']), 4))).toBe('abcd');
    expect(await boundedJson(new Response(stream(['{"v":', '1}'])), 7)).toEqual({ v: 1 });
  });
  it('rejects and cancels chunked overflow without trusting content-length', async () => {
    const cancelled = vi.fn();
    await expect(readBoundedBody(stream(['123', '456', '789'], cancelled), 5)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toHaveBeenCalledOnce();
  });
  it('reports invalid JSON as a client error', async () => {
    await expect(boundedJson(new Response('{broken'))).rejects.toMatchObject({ status: 400 });
    expect(handleError(new z.ZodError([])).status).toBe(400);
  });
});

describe('application quotas', () => {
  it('caps simultaneous requests and keeps actor/feature windows independent', async () => {
    const fixture = await seededDatabase();
    try {
      const outcomes = await Promise.allSettled(Array.from({ length: 15 }, () => consumeQuota(fixture.db, 'student', 'ai', 3)));
      expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(3);
      for (const result of outcomes) if (result.status === 'rejected') expect(result.reason).toMatchObject({ status: 429 });
      expect(await fixture.db.prepare("SELECT count FROM api_usage WHERE actor_id='student' AND feature='ai'").first('count')).toBe(3);
      await expect(consumeQuota(fixture.db, 'student2', 'ai', 3)).resolves.toBeUndefined();
      await expect(consumeQuota(fixture.db, 'student', 'execute', 3)).resolves.toBeUndefined();
    } finally { fixture.close(); }
  });
});

describe('avatar signatures and integration failures', () => {
  it.each([
    ['image/png', [137, 80, 78, 71, 13, 10, 26, 10]],
    ['image/jpeg', [255, 216, 255, 224]],
    ['image/webp', [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
  ])('recognizes %s with matching signature', (type, bytes) => expect(avatarContentType(new Uint8Array(bytes), type)).toBe(type));
  it('rejects HTML/SVG, truncated signatures and MIME spoofing', () => {
    for (const [bytes, type] of [[new TextEncoder().encode('<svg/>'), 'image/svg+xml'], [new Uint8Array([137, 80]), 'image/png'], [new Uint8Array([255,216,255]), 'image/png']] as const) {
      expect(() => avatarContentType(bytes, type)).toThrow();
    }
  });
  it('maps timeouts to safe errors without exposing provider details', () => {
    expect(() => integrationFailure(new DOMException('private destination', 'TimeoutError'))).toThrow(expect.objectContaining({ status: 504 }));
    expect(() => integrationFailure(new Error('private key'))).toThrow(expect.objectContaining({ status: 502, message: expect.not.stringContaining('private key') }));
  });
});

describe('AI and execution route boundary', () => {
  it('rejects malformed DTOs and cross-classroom access before calling providers', async () => {
    const fixture = await seededDatabase();
    const provider = vi.fn();
    vi.stubGlobal('fetch', provider);
    runtime.env = { DB: fixture.db, AI_GATEWAY_ID: 'test-gateway', AI_MODEL: '@cf/meta/llama-3.2-3b-instruct', AI: { run: provider }, JUDGE0_KEY: 'test-key', JUDGE0_URL: 'https://judge.example', JUDGE0_HOST: 'judge.example' };
    try {
      expect((await execute(request({ programId: 'program', source_code: 'print(1)', language_id: 50 }))).status).toBe(400);
      expect((await assist(request({ mode: 'algorithm', algorithm: 'Start' }))).status).toBe(400);
      expect((await execute(request({ programId: 'program2', source_code: 'print(1)', language_id: 71 }))).status).toBe(403);
      expect((await assist(request({ programId: 'privateprogram', mode: 'algorithm', algorithm: 'Start' }))).status).toBe(403);
      expect(provider).not.toHaveBeenCalled();
    } finally { fixture.close(); }
  });
  it('routes short student hints through the configured Gateway with bounded generation', async () => {
    const fixture = await seededDatabase();
    const run = vi.fn().mockResolvedValue({ response: 'Check the loop boundary.' });
    runtime.env = { DB: fixture.db, AI_GATEWAY_ID: 'test-gateway', AI_MODEL: '@cf/meta/llama-3.2-3b-instruct', AI: { run } };
    try {
      const response = await assist(request({ programId: 'program', mode: 'algorithm', algorithm: 'Loop through every item.' }));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ feedback: 'Check the loop boundary.' });
      expect(run).toHaveBeenCalledWith('@cf/meta/llama-3.2-3b-instruct', expect.objectContaining({ max_tokens: 256 }), expect.objectContaining({ gateway: { id: 'test-gateway', skipCache: true, collectLog: false } }));
    } finally { fixture.close(); }
  });
});
