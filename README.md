# D-Rec

Academic programming record books with organizations, classrooms, assignments,
student algorithm/code drafts, teacher reviews, code execution, and browser PDF
downloads. Runs on **vinext + Cloudflare Workers**, using **D1**, **private R2**,
**Better Auth**, and **Workers AI through AI Gateway**. Existing data is not imported.

## Local setup

Use Node 24 and pnpm. Install dependencies with `pnpm install --frozen-lockfile`.
Copy `.dev.vars.example` to `.dev.vars` and generate a random
`BETTER_AUTH_SECRET` of at least 32 characters. Never commit that file.

Google-only login requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Register
`http://localhost:5173/api/auth/callback/google` as the local OAuth callback.
Judge0 requires `JUDGE0_KEY`. Local runtime settings, including `APP_ORIGIN`, are in `.dev.vars`; deployed
values come from Infisical. Origins must match the URL used for authentication.

```sh
pnpm db:migrate:local
pnpm dev
```

D1/R2 development state is local. AI inference uses Cloudflare's remote service
and requires an authenticated Cloudflare account and an AI Gateway named by
`AI_GATEWAY_ID`; it is not simulated offline. No old Supabase `.env` values are
needed. Avoid placing new credentials in `.env`; use `.dev.vars`.

## Authentication and permissions

Sign in and register using Google through Better Auth. Auth records and sessions
live in D1. The app sends no emails and has no password, OTP or recovery flow.
Google supplies the verified email used for invitations and superuser grants.
Only verified users with a linked Google account can access protected pages/APIs.
Automatic account linking is disabled: existing password-only accounts need
operator-assisted conversion before Google sign-in with the same email. Existing
sessions of accounts already linked to Google remain valid; revoke sessions at
cutover if everyone must reauthenticate.
Create a new organization from `/dashboard` to become its owner. Memberships
control access independently for each organization.

Owners/admins manage organizations. Teachers can see their organization's
classrooms and manage/review classrooms where they are assigned as teachers.
Students can access their assigned programs and their own submissions. API
authorization validates the full resource relationship; route IDs and remembered
organization selection do not grant access.

Global superusers can manage every existing and future organization from the
admin workspace without creating organization memberships. Grants are managed
by a database operator and activate only for a matching verified Better Auth
email. They cannot be changed through the app or a profile role. Private profile
fields and avatar access remain limited to their owner; student submissions still
require enrollment, and organization owners cannot be removed through membership
deletion. When creating a classroom, select a teacher who belongs to that organization.

After applying migrations, grant local superuser access with this idempotent command:

```sh
pnpm exec wrangler d1 execute DB --local --env-file .dev.vars.example --command "INSERT INTO platform_admins(email) VALUES ('jenin8282@gmail.com') ON CONFLICT(email) DO NOTHING;"
```

Sign in using Google with that verified email, then open `/dashboard`. To revoke the local grant:

```sh
pnpm exec wrangler d1 execute DB --local --env-file .dev.vars.example --command "DELETE FROM platform_admins WHERE email='jenin8282@gmail.com';"
```

For a deployed database, apply the migrations and run the same SQL using
`--remote` instead of `--local`, after selecting the correct Cloudflare account
and environment. Local grants do not provision remote access. Revocation is
checked on each server request, including mutations.

Invitations are stored with expiry and claimed using a verified email when users
open the dashboard. The app does **not** currently send invitation notification
emails; share the signup link separately. Invitees must use the Google account
matching the invited email.

Algorithms move from draft to pending teacher review. Only approved algorithms
unlock final code submission; assigned teachers and organization owners/admins can approve/reject work. Approved or
pending work must be explicitly reopened before editing. Reopening clears both
algorithm/code approvals and removes completed-record eligibility. Version
conflicts require reloading before saving. Individual and full record PDFs stay
in the browser; R2 stores only profile avatars.

## AI and execution

Student hints and teacher guidance use `@cf/meta/llama-3.2-3b-instruct` through
`AI.run` with a configured Gateway, a 256-token output cap, caching disabled and
prompt logging disabled. Responses are advisory and cannot approve work. The
app bounds request size and allows 20 guidance requests per user per hour.

[Cloudflare pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
currently lists roughly $0.051 per million input tokens and $0.335 per million
output tokens for this model (checked 6 October 2026). For illustration, 1,000
requests at 1,000 input tokens and 256 output tokens would cost about $0.137 in
model inference before allowances and other service charges. Actual prompt sizes
vary; review account billing and Gateway controls before production use.

Judge0 remains the isolated executor for JavaScript, Python, Java and C++. Code
never runs directly inside the app Worker. Execution is limited to 60 requests
per user per hour with bounded source/input, runtime limits and polling timeout.
Execution output is not a grading result.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

Development and preview use port 5173 with strict port selection so the local
origin matches authentication configuration. Stop development before preview.
Use the preview for browser and API smoke checks. See
`docs/cloudflare-migration-plan.md` for the architecture and acceptance checklist,
and `docs/local-validation.md` for verified checks and remaining release checks.

## Personal Cloudflare deployment

Use the [shared Vinext deployment trigger](docs/deployment.md). Pushes to `dev`
deploy native Preview `stg`; pushes to `main` deploy production. Account and D1
IDs are configured in `wrangler.jsonc`. Staging intentionally shares the production
D1 and R2 resources, so staging writes affect production data. The workflow uses
Infisical project `d-rec` and repository secret `CI_CD_DISPATCH_TOKEN`.
Configure the private R2 bucket and all nine app values in Infisical environments
`staging` and `prod`; register Google's callback for each app origin.
