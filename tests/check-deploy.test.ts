import { describe, expect, it } from 'vitest';

// Use a runtime path so TypeScript does not require declarations for this CLI module.
const validatorPath = '../scripts/check-deploy.mjs';
const { validateDeployment } = await import(validatorPath) as {
  validateDeployment: (config: unknown, target?: string) => string[];
};

function deployment() {
  const bindings = {
    d1_databases: [{ binding: 'DB', database_id: '12345678-abcd-1234-5678-123456789abc', migrations_dir: 'migrations' }],
    r2_buckets: [{ binding: 'FILES', bucket_name: 'd-rec-avatars' }],
    ai: { binding: 'AI' },
  };
  return {
    name: 'd-rec',
    account_id: '123456789abcdef0123456789abcdef0',
    workers_dev: true,
    preview_urls: true,
    ...structuredClone(bindings),
    env: {
      production: {
        name: 'd-rec',
        account_id: '123456789abcdef0123456789abcdef0',
        workers_dev: true,
        preview_urls: true,
        vars: {} as Record<string, string>,
        ...structuredClone(bindings),
      },
    },
  };
}

describe('central runner deployment validation', () => {
  it('accepts production bindings, personal account, and empty Infisical-managed vars', () => {
    expect(validateDeployment(deployment())).toEqual([]);
  });

  it.each(['', '00000000000000000000000000000000', 'YOUR_ACCOUNT_ID', '1234', 'ABCDEF0123456789ABCDEF0123456789'])('rejects account placeholder %s before dispatch', (account) => {
    const config = deployment();
    config.account_id = account;
    config.env.production.account_id = account;
    expect(validateDeployment(config)).toContain('Set wrangler.jsonc account_id to your personal Cloudflare account ID.');
  });

  it.each(['', '00000000-0000-0000-0000-000000000000', 'YOUR_D1_DATABASE_ID', '12345678-abcd-1234-5678-123456789abz'])('rejects D1 placeholder or malformed UUID %s', (id) => {
    const config = deployment();
    config.env.production.d1_databases[0].database_id = id;
    expect(validateDeployment(config)).toContain('Set env.production DB to a real D1 UUID with migrations_dir: migrations.');
  });

  it('requires an explicit production environment using the same Worker name', () => {
    const withoutProduction = { ...deployment(), env: undefined };
    expect(validateDeployment(withoutProduction)).toContain('env.production must use the top-level Worker name.');
    const config = deployment();
    config.env.production.name = 'another-worker';
    expect(validateDeployment(config)).toContain('env.production must use the top-level Worker name.');
  });

  it('requires repeated production bindings even when top-level bindings are present', () => {
    const config = deployment();
    config.env.production.d1_databases = [];
    config.env.production.r2_buckets = [];
    config.env.production.ai.binding = 'WRONG_AI';
    expect(validateDeployment(config)).toEqual(expect.arrayContaining([
      'Set env.production DB to a real D1 UUID with migrations_dir: migrations.',
      'Set the production FILES R2 bucket.',
      'Configure the production AI binding.',
    ]));
  });

  it('requires correct binding names, a bucket name, and the migration directory', () => {
    const config = deployment();
    config.env.production.d1_databases[0].binding = 'DATABASE';
    config.env.production.r2_buckets[0].binding = 'AVATARS';
    expect(validateDeployment(config)).toEqual(expect.arrayContaining(['Set env.production DB to a real D1 UUID with migrations_dir: migrations.', 'Set the production FILES R2 bucket.']));
    config.env.production.d1_databases[0].binding = 'DB';
    config.env.production.d1_databases[0].migrations_dir = 'old-migrations';
    config.env.production.r2_buckets[0].binding = 'FILES';
    config.env.production.r2_buckets[0].bucket_name = '';
    expect(validateDeployment(config)).toEqual(expect.arrayContaining(['Set env.production DB to a real D1 UUID with migrations_dir: migrations.', 'Set the production FILES R2 bucket.']));
  });

  it('rejects a production account different from the selected personal account', () => {
    const config = deployment();
    config.env.production.account_id = 'abcdef0123456789abcdef0123456789';
    expect(validateDeployment(config)).toContain('Production must use the same Cloudflare account.');
  });

  it.each(['BETTER_AUTH_SECRET', 'APP_ORIGIN'])('rejects source-owned production var %s instead of Infisical values', (key) => {
    const config = deployment();
    config.env.production.vars[key] = 'synthetic-test-value';
    expect(validateDeployment(config)).toContain('Production vars must be empty; configure application values in Infisical.');
  });

  it.each([
    ['top-level', 'workers_dev'], ['top-level', 'preview_urls'],
    ['production', 'workers_dev'], ['production', 'preview_urls'],
  ] as const)('requires %s %s for runner preview access', (scope, key) => {
    const config = deployment();
    const target = scope === 'production' ? config.env.production : config;
    target[key] = false;
    expect(validateDeployment(config)).toContain('Enable workers_dev and preview_urls for the central runner.');
  });
});

function nativeDeployment() {
  const config = deployment();
  return {
    ...config,
    previews: {
      d1_databases: structuredClone(config.d1_databases),
      r2_buckets: structuredClone(config.r2_buckets),
      ai: structuredClone(config.ai),
      vars: {} as Record<string, string>,
    },
    vars: {} as Record<string, string>,
    env: { ...config.env, staging: structuredClone(config.env.production) },
  };
}

describe('native preview deployment contract', () => {
  it('allows explicitly shared production D1 and R2 resources in native previews and staging', () => {
    const config = nativeDeployment();
    expect(validateDeployment(config)).toEqual([]);
    expect(validateDeployment(config, 'staging')).toEqual([]);
  });

  it.each(['root', 'previews', 'production', 'staging'] as const)('rejects plaintext variables in %s regardless of selected environment', (scope) => {
    const config = nativeDeployment();
    const target = scope === 'root' ? config : scope === 'previews' ? config.previews : config.env[scope];
    target.vars.BETTER_AUTH_SECRET = 'synthetic-test-only';
    expect(validateDeployment(config).some(issue => issue.includes('vars must be empty'))).toBe(true);
    expect(validateDeployment(config, 'staging').some(issue => issue.includes('vars must be empty'))).toBe(true);
  });

  it('requires a staging build environment even when production is selected', () => {
    const config = nativeDeployment();
    const missingStage = { ...config, env: { production: config.env.production } };
    expect(validateDeployment(missingStage)).toContain('Native previews require env.staging for the runner build.');
    expect(validateDeployment(missingStage, 'staging')).toContain('env.staging must use the top-level Worker name.');
  });

  it.each(['database', 'bucket', 'ai'] as const)('rejects native preview/staging %s mismatch', (kind) => {
    const config = nativeDeployment();
    if (kind === 'database') config.previews.d1_databases[0].database_id = '87654321-abcd-1234-5678-123456789abc';
    if (kind === 'bucket') config.previews.r2_buckets[0].bucket_name = 'another-avatars-bucket';
    if (kind === 'ai') config.previews.ai.binding = 'ANOTHER_AI';
    expect(validateDeployment(config)).toContain('env.staging DB, FILES and AI bindings must match native previews.');
  });

  it('rejects mismatched production/top-level bindings', () => {
    const config = nativeDeployment();
    config.d1_databases[0].database_id = '87654321-abcd-1234-5678-123456789abc';
    expect(validateDeployment(config)).toContain('Production DB, FILES and AI bindings must match the top-level bindings.');
  });

  it('validates the selected staging account and preview flags', () => {
    const config = nativeDeployment();
    config.env.staging.account_id = 'abcdef0123456789abcdef0123456789';
    config.env.staging.preview_urls = false;
    expect(validateDeployment(config, 'staging')).toEqual(expect.arrayContaining([
      'Staging must use the same Cloudflare account.',
      'Enable workers_dev and preview_urls for the central runner.',
    ]));
  });

  it('rejects unsupported runner environment names', () => {
    expect(validateDeployment(nativeDeployment(), 'test')).toContain('CLOUDFLARE_ENV must be production or staging.');
  });
});
