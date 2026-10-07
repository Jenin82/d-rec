# D-Rec repository notes

- Runtime is vinext + Cloudflare Workers; `wrangler.jsonc` owns DB, FILES, AI and origin configuration. Production account/DB IDs are configured. Dev uses native Preview stg with the same D1/R2 by explicit user choice; staging writes affect production data. Local Wrangler state remains local.
- Fresh setup only: retain Judge0, private R2 bucket `d-rec` (currently avatars) and browser PDF downloads. No Supabase runtime or data import.
- Better Auth is Google-only and requires a secret plus Google OAuth credentials; protected access requires a live verified user with a linked Google account; server APIs enforce organization membership and assigned-classroom teacher management. Never trust selected organization state for authorization.
- Global access comes only from operator-managed `platform_admins` email grants matched to the live verified auth identity. Recheck grants in mutation SQL; target classroom staff still need actual organization membership. Keep profile writes/private fields and avatars owner-only.
- Submission writes require versions; pending/approved work must be explicitly reopened. Assigned teachers and organization owners/admins can approve, and approved algorithms gate final code submission.
- Use Node 24, `pnpm typecheck`, `pnpm test`, and `pnpm build`; local development needs `.dev.vars` and `pnpm db:migrate:local`. See README.md for credentials and deployment checks.
- Use direct `@radix-ui/react-*` imports: the aggregate Radix barrel causes a vinext RSC resolver loop. Keep root Zod aligned with Better Auth (>=4.5.4) for IP validation.
- `pnpm cf:types` generates only environment bindings; runtime declarations come from `@cloudflare/workers-types`. Keep `--include-runtime false` to avoid embedding the full runtime in source.
- Deploy through `.github/workflows/deploy.yml` and `Jenin82/ci-cd`; dev uses native Preview stg/Infisical staging and main uses production/Infisical prod. Keep all config vars empty, real destination IDs source-owned, and `check:deploy` independent of ignored env files. See `docs/deployment.md` for initial Preview deployment.
