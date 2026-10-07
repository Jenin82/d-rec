# Deployment through Jenin82/ci-cd

`.github/workflows/deploy.yml` calls the reusable Vinext deploy trigger in
`Jenin82/ci-cd`, using project slug `d-rec`. Pushes/manual runs on `dev` deploy
native Worker Preview `stg` with Infisical `staging`; `main` deploys production
with Infisical `prod`. The central runner checks and builds the exact commit,
applies D1 migrations and verifies uploaded binding/deployment metadata.
The caller's green dispatch is not proof of deployment: inspect the central run
and `vinext/staging` or `vinext/production` commit status, then smoke-test the app.

By explicit project choice, staging and production share D1 and private R2.
Staging migrations, account/submission writes and avatar changes affect the same
resources as production. Native Preview keeps the active production Worker
version unchanged, but does not isolate shared data. Local development uses
Wrangler's local D1/R2 state and `.dev.vars` settings.

## Source configuration and resources

The personal Cloudflare account is configured as
`5081d6911bf3b21ae1cb615c1b0b28c5`; production inherits this top-level `account_id`.
Production DB is configured with D1 UUID
`0a3b78f5-7384-424e-b514-ecfe8d3cb19d`. These
are source configuration, not Infisical secrets. The top-level and both environment bindings use the same D1 resource; local
development still uses local emulated storage. Confirm/create the private
`d-rec` R2 bucket and the `d-rec` AI Gateway in that same account, or
change their names in production config and Infisical respectively. The central
runner does not provision these resources. The configured D1 is intentionally shared by both deployed environments.

`pnpm check:deploy` validates the selected deployment destination before dispatch.
Workers.dev and Preview URLs must remain enabled for this runner. Custom domains
and DNS are separate account setup; set APP_ORIGIN to the exact URL users visit.

## Infisical application project

Create/select project `d-rec` (already set directly in the workflow) and add
these values in environments `prod` and `staging`, path `/`. Grant the central machine identity read access to that project.

| Key | Value |
| --- | --- |
| `APP_ORIGIN` | Exact deployed HTTPS origin, no trailing slash |
| `BETTER_AUTH_SECRET` | Fresh random secret of at least 32 characters |
| `GOOGLE_CLIENT_ID` | Google OAuth web application client ID |
| `GOOGLE_CLIENT_SECRET` | Its Google OAuth client secret |
| `AI_GATEWAY_ID` | Existing Gateway ID, initially `d-rec` |
| `AI_MODEL` | `@cf/meta/llama-3.2-3b-instruct` |
| `JUDGE0_URL` | `https://judge0-ce.p.rapidapi.com` |
| `JUDGE0_HOST` | `judge0-ce.p.rapidapi.com` |
| `JUDGE0_KEY` | RapidAPI key with access to the Judge0 service |

Register `${APP_ORIGIN}/api/auth/callback/google` as Google's authorized redirect
URI. Generate the auth secret with `openssl rand -base64 48` and store it directly
in Infisical; keep it stable between releases.

All these keys are server-side runtime values. No `NEXT_PUBLIC_*` values are
needed. The runner also imports root-path referenced/imported secrets; every
non-public nonblank value becomes a Worker secret, so keep this project limited
to intended application values. Do not add `DB`, `FILES`, `AI`, or `ASSETS`:
these names are resource bindings. Do not add Supabase, Gemini, Resend, email,
Cloudflare deployment-token or Infisical machine-identity credentials here.
All config plaintext vars must stay empty for native Preview deployment.

## GitHub Actions credentials

In **Jenin82/d-rec**, configure repository secret `CI_CD_DISPATCH_TOKEN`,
a token permitted to dispatch `vinext-deploy` events to `Jenin82/ci-cd`, and the
literal `project_slug` in the workflow described above.

In **Jenin82/ci-cd**, the runner requires Actions secrets:

- `CI_APP_CLIENT_ID` and `CI_APP_PRIVATE_KEY`: GitHub App with source Contents
  read access and commit-status write access, installed for `Jenin82/d-rec`.
- `CLOUDFLARE_API_TOKEN`: scoped to the personal account with the runner's Workers
  deployment permissions and **D1 Edit** for remote migrations.
- `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET` and `INFISICAL_DOMAIN`:
  Universal Auth machine identity with read access to both app environments and the HTTPS Infisical instance URL.

These belong to central Actions, not the application's Infisical project.
Confirm the referenced reusable workflow is available on central `main`.

## First deployment and release checks

Native Worker Preview deployment supports the initial `dev` release without
bootstrapping the production Worker. The central runner applies the shared D1
schema before upload and supplies the app secrets from Infisical. Configure all
nine values in `staging` before dispatching; `APP_ORIGIN` must be the actual
stable `stg` Preview origin, not the production origin. Register its Google
callback separately. Configure the same keys in `prod` for a later main release.

Local accounts, avatars and superuser grants do not populate production. After
migrations, grant production superuser access with the operator command:

```sh
pnpm exec wrangler d1 execute DB --remote --env production --command "INSERT INTO platform_admins(email) VALUES ('jenin8282@gmail.com') ON CONFLICT(email) DO NOTHING;"
```

Then use the central trigger for subsequent releases. Validate an actual Google
callback/session, superuser access, organization boundaries, assigned teacher
reviews, AI guidance, Judge0 execution, avatar uploads and PDF downloads before
opening the service to students. Check the central deployment run for actual remote migration/upload results.
