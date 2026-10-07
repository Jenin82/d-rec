import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function bindingResources(config) {
  const db = config?.d1_databases?.find(binding => binding.binding === 'DB');
  const files = config?.r2_buckets?.find(binding => binding.binding === 'FILES');
  return { database: db?.database_id, migrations: db?.migrations_dir, bucket: files?.bucket_name, ai: config?.ai?.binding };
}
function sameResources(left, right) {
  return JSON.stringify(bindingResources(left)) === JSON.stringify(bindingResources(right));
}
function validateBindings(config, label, issues) {
  const resources = bindingResources(config);
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(resources.database ?? '') || resources.database === '00000000-0000-0000-0000-000000000000' || resources.migrations !== 'migrations') {
    issues.push(`Set ${label} DB to a real D1 UUID with migrations_dir: migrations.`);
  }
  if (!resources.bucket) issues.push(`Set the ${label === 'env.production' ? 'production' : label} FILES R2 bucket.`);
  if (resources.ai !== 'AI') issues.push(`Configure the ${label === 'env.production' ? 'production' : label} AI binding.`);
}

// Fail before dispatch: the runner must never receive placeholders or plaintext vars.
export function validateDeployment(config, target = 'production') {
  const issues = [];
  if (!/^[a-f0-9]{32}$/.test(config.account_id ?? '') || /^0+$/.test(config.account_id)) {
    issues.push('Set wrangler.jsonc account_id to your personal Cloudflare account ID.');
  }
  if (!['production', 'staging'].includes(target)) issues.push('CLOUDFLARE_ENV must be production or staging.');
  const selected = config.env?.[target];
  if (!selected || selected.name !== config.name) issues.push(`env.${target} must use the top-level Worker name.`);
  if (selected?.account_id && selected.account_id !== config.account_id) issues.push(`${target === 'production' ? 'Production' : 'Staging'} must use the same Cloudflare account.`);
  if (config.workers_dev !== true || config.preview_urls !== true || selected?.workers_dev !== true || selected?.preview_urls !== true) {
    issues.push('Enable workers_dev and preview_urls for the central runner.');
  }
  if (Object.keys(config.vars ?? {}).length) issues.push('Top-level vars must be empty; configure application values in Infisical.');
  if (Object.keys(config.previews?.vars ?? {}).length) issues.push('Preview vars must be empty; configure application values in Infisical.');
  for (const [name, environment] of Object.entries(config.env ?? {})) {
    if (Object.keys(environment.vars ?? {}).length) issues.push(`${name === 'production' ? 'Production' : `env.${name}`} vars must be empty; configure application values in Infisical.`);
    if (Object.keys(environment.previews?.vars ?? {}).length) issues.push(`env.${name} preview vars must be empty; configure application values in Infisical.`);
  }
  validateBindings(selected, `env.${target}`, issues);
  if (config.env?.production && !sameResources(config, config.env.production)) {
    issues.push('Production DB, FILES and AI bindings must match the top-level bindings.');
  }
  if (config.previews) {
    const staging = config.env?.staging;
    if (!staging) issues.push('Native previews require env.staging for the runner build.');
    validateBindings(config.previews, 'previews', issues);
    if (staging) {
      validateBindings(staging, 'env.staging', issues);
      if (!sameResources(staging, config.previews)) issues.push('env.staging DB, FILES and AI bindings must match native previews.');
    }
  }
  return [...new Set(issues)];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const issues = validateDeployment(JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')), process.env.CLOUDFLARE_ENV || 'production');
  if (issues.length) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
  }
}
