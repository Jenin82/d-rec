# D-Rec: fresh Cloudflare setup plan

Prepared 6 October 2026 from the repository and current official documentation. The implementation follows this plan; current setup and operation instructions are in README.md. Remote deployment and live external integrations require account resources and credentials.

## Scope and confirmed choices

- Start with new users, organizations, classrooms, submissions, and files. No Supabase data export, import, user/password migration, or storage copy.
- Host in the user's personal Cloudflare account using a full-stack Worker with native D1 and R2 bindings.
- Convert the existing Next.js app to vinext for Cloudflare hosting (confirmed); do not use OpenNext.
- Route AI features through Cloudflare AI Gateway.
- Keep Judge0 for code execution in the first release (confirmed).
- Use R2 for profile avatars; keep individual and full record PDFs as browser downloads (confirmed).
- Preserve App Router pages, UI and organization behavior; use Google-only authentication with verified provider email. No password/OTP/recovery or outbound email service.
- Do not provision resources, change DNS, retire Supabase, or deploy as part of this planning task.

Fresh data still requires versioned **schema migrations** to create and evolve D1 tables. These contain no old data.

## Original repository assessment (before implementation)

The app uses Next.js 16.1.3, React 19, Tailwind/shadcn components, Zustand, Monaco, and jsPDF. There are 39 source files referencing Supabase. Most data access runs directly from browser components/stores, with Supabase RLS providing the database boundary.

| Feature | Current implementation | Target |
| --- | --- | --- |
| Authentication | Supabase email/password, signup verification OTP, resend, Google OAuth, session listener and cookie-refresh proxy | Better Auth on the Worker with D1-backed users/accounts/sessions/verification |
| Profiles | Name, display name, phone, bio, avatar URL | D1 profile; managed avatar upload/read/delete through R2 |
| Organizations | Create organization and owner membership; organization switcher and role-specific routes | Atomic server operation; D1 organizations and scoped memberships |
| Administration | Users, teachers, students, classrooms, pending invitations, admin settings | Organization-authorized API operations |
| Teaching | Classroom creation, teacher assignment, student invitations, published programming questions, dashboards and review queues | D1 services and aggregate read APIs |
| Student work | Assigned questions, algorithm/code drafts, submissions, status, custom input, output and teacher feedback | Authenticated submission APIs with one defined state machine |
| Editor/execution | Monaco and Judge0; classroom editor supports JavaScript, Python, Java and C++ | Keep browser editor and external Judge0; Worker controls access and usage |
| AI feedback | Student algorithm/code hints and teacher review help through `/api/ai/assist`; direct Gemini `gemini-2.5-flash` call | Same feature contract, low-cost Workers AI Llama 3.2 3B through AI Gateway |
| Digital records | Completed record views, single/full record PDF downloads using `lib/record-pdf.ts` | D1-backed authorized reads; retain browser PDF generation |

No Supabase Storage calls, Realtime subscriptions, or Edge Function usage were found in the checked source. `RESEND_API_KEY` appears in the sample configuration, but outbound email sending is not implemented in the inspected app. Invitations insert database rows and are claimed on signup/dashboard access; UI wording that says an invite was sent is not evidence of email delivery.

The standalone `components/ai-assistant.tsx` contains mock responses; live AI is the algorithm/code assistance endpoint. Preserve the teacher algorithm/code-review compatibility redirects to the unified review queue. Question creation currently publishes immediately; a question draft/publishing editor is not part of this plan.

Key source areas: `app/[orgId]/**`, `app/dashboard/page.tsx`, `app/profile/page.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`, `components/providers.tsx`, `stores/*`, `lib/supabase/*`, `proxy.ts`, `types/db.types.ts`, and `supabase/migrations/*`.

## Recommended architecture

```text
Browser: existing React UI, Monaco, Zustand, jsPDF
    |
    | same-origin HTTPS, session cookie
    v
Cloudflare Worker: pages + auth routes + application APIs
    |-- DB binding --> D1: auth, memberships, assignments, submissions
    |-- FILES binding --> private R2: profile avatars
    |-- AI binding / AI Gateway --> Workers AI Llama 3.2 3B: concise guidance
    |-- HTTPS --> Judge0: isolated code execution
    `-- HTTPS --> Google OAuth: verified identity
```

Use one Worker initially. Keep D1/R2 access entirely on the server; the browser calls application APIs instead of an exposed generic database API. No separate backend deployment is necessary for this scope. Sessions live in D1; no KV, Durable Objects, Queues, Vectorize, or Workflows are required initially. Add another service only if measured needs justify it.

### Hosting decision

Cloudflare's current [Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) recommends **vinext**, including support for App Router, route handlers, and `proxy.ts`, but identifies it as beta. Start with a small compatibility spike to find the adaptations needed for this app. Check proxy behavior, authentication cookies, Google callbacks, fonts, Monaco loading, hydration, and PDF downloads in the Worker runtime.

Vinext is the required hosting target. Convert the build/dev/deploy configuration to Vite + vinext and the Cloudflare Vite plugin, add typed Worker bindings, and adapt unsupported Next.js behavior while preserving App Router URLs and the current UI. Validate the precise pinned versions and generated configuration in the spike; `next build` alone is not acceptance evidence. If a required feature is incompatible, document the blocker and a vinext-compatible implementation rather than switching to OpenNext. Isolate binding access in a small server-only module.

### Authentication decision

Recommend **Better Auth + Drizzle's D1 driver**, with authentication and application tables in the same D1 database. Better Auth supports a [SQLite Drizzle adapter](https://better-auth.com/docs/adapters/drizzle) and [Google authentication](https://better-auth.com/docs/authentication/google). [Drizzle supports D1 through the Worker binding](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1).

Updated decision (6 October 2026): use Google-only sign-in. Remove password/OTP/recovery routes and the outbound email service; retain verified Google email matching for invitations and global grants. Use secure HttpOnly session cookies, explicit trusted origins, validated internal return URLs, logout/revocation, and server-side session validation. Do not expose password hashes, provider tokens, or session secrets in profile responses or Zustand.

**D1 integration gate:** test the pinned Better Auth/adapter versions against actual D1. D1 does not offer ordinary interactive ORM transactions; use the adapter's supported non-transactional mode where necessary. Exercise Google registration/sign-in, verified-identity enforcement, rejection of implicit account linking, session creation/deletion, partial failures and retries. Do not adopt plugins requiring unsupported native transactions. Repair profile creation idempotently if an auth hook fails. Auth-library support does not automatically provide atomic application writes.

Alternative: **Auth.js / NextAuth**, which has an official [D1 adapter](https://authjs.dev/getting-started/adapters/d1). Better Auth was selected and validated with the D1 adapter; switching auth libraries is outside this implementation.

Cloudflare does provide [Access](https://developers.cloudflare.com/learning-paths/clientless-access/access-application/create-access-app/) and can act as an [identity provider for Access](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/cloudflare/). Access protects applications using identity policies; it is a possible choice for a closed institutional portal. For this app, Better Auth handles Google sign-in and D1 sessions. Access can optionally protect operator tooling later. Turnstile is bot protection, not an auth provider.

No email sender is needed. Google supplies the verified identity; users claim database invitations from the dashboard using that email. Share signup links separately. Legacy password-only accounts require explicit operator-assisted conversion; automatic linking is disabled and password-only sessions cannot access the app.

## D1 schema and authorization

Create a clean SQLite schema rather than translating the existing PostgreSQL migrations mechanically:

- Auth-managed user, account, session, and verification tables generated from the selected auth configuration.
- `profiles`, `organizations`, `organization_members`, `classrooms`, `classroom_members`, `programs`, `org_invites`, `classroom_invites`, `algorithm_submissions`, and `code_submissions`.
- Avatar object key on the profile, with optional file metadata if needed; an audit table for invitations, role changes and submission reviews.
- Do not carry forward the `wake-up-supabsae` keepalive table.

Use text IDs and explicit timestamp conventions; JSON metadata becomes validated JSON text; PostgreSQL enums become SQLite constraints. Add foreign keys and documented deletion behavior. Auth user email is globally unique; invitations are unique per `(organization_id, normalized_email)` or `(classroom_id, normalized_email)` so one person can be invited to multiple organizations/classrooms. Add unique organization/classroom memberships and indexes for membership lookups, classroom programs, student records, and review queues. Prefer typed columns for feedback, custom input, reviewer and review time rather than relying entirely on unstructured metadata.

Provisional submission design: one current algorithm and one current code submission per `(program_id, student_id)`, enforced by unique constraints, with a version number for stale-write protection. Review decisions record the reviewed version. Recommend freezing approved work until an explicit reopen/resubmission action; that action clears the relevant approvals and completed-record eligibility before edits, so an approved PDF cannot silently reflect unreviewed changes. This does not retain old approved editions: if that is required, add a minimal immutable reviewed-content snapshot in D1 instead. Confirm this choice with the review workflow before implementation. Full submission-history UX is not included unless requested.

The checked Supabase migrations do not contain the complete base schema or a definition for the called `accept_my_invites` RPC. The generated types and observed queries are design inputs, not proof of all deployed constraints/policies. No remote Supabase introspection is needed for the requested fresh setup.

Replace RLS and database RPCs with shared server authorization helpers:

- A session identifies the actor. Organization membership grants the organization role; profile role and localStorage never grant access.
- Every classroom/program/submission/file lookup validates its complete organization relationship, including mismatched IDs supplied in a URL/body.
- Owners/admins manage organization resources. Protect owner assignment and the last owner; preserve owner-only admin-removal rules.
- Teachers manage permitted classrooms/programs and review students in their scope. Explicitly define whether teachers may browse all organization classrooms but manage/review only assigned classrooms (confirmed).
- Students read assigned published programs and their own work; they cannot change membership, review status, reviewer, another student's content, or program publication state.
- Profile reads expose self-edit fields or minimal member display fields appropriate to the viewer. Do not reproduce blanket authenticated-user access to all profiles.
- API failures return JSON `401`, `403`/`404`, validation errors, conflicts, and rate-limit errors; page navigation may redirect to login. Auth routes must remain reachable without a session.

Organization creation plus owner membership, classroom creation plus teacher assignment, invite claims, and combined record submissions need transactional [D1 batches](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch). Pre-generate IDs, use constrained/conditional SQL, and prevent stale authorization decisions from authorizing a mutation after membership removal. A zero-row conditional write is not a SQL error; account for that explicitly instead of assuming a batch rolled back. Use versions/idempotency for retry-sensitive writes; no interactive `BEGIN`/`COMMIT` assumptions.

Invitation claiming must require a verified email, normalize it consistently, scope to the target organization/classroom, be idempotent, and preserve an existing stronger role when adding a student classroom membership. Existing users must be able to claim new invites after verification/login, not only at account creation. Design expiry/revocation and safe role precedence; do not turn an invite into global admin access.

## Server API surface and frontend replacement

Suggested route groups (exact endpoints finalized with DTOs):

| API group | Responsibility |
| --- | --- |
| `/api/auth/*`, `/api/me` | Auth library routes and minimal current-user/session DTO |
| `/api/profile`, `/api/profile/avatar` | Own profile edits and bounded avatar upload/replacement/deletion |
| `/api/organizations` | List own memberships; create organization + owner atomically |
| `/api/organizations/:orgId/members`, `/invites`, `/classrooms` | Authorized administration and class creation/listing |
| `/api/classrooms/:id/members`, `/invites`, `/programs` | Classroom-scoped teacher/member operations |
| `/api/programs/:id`, `/algorithm`, `/code`, `/submit` | Assignment details, drafts, versioned submission transitions |
| `/api/reviews/*`, `/api/records/*` | Review queues/decisions and authorized completed-record reads |
| `/api/ai/assist`, `/api/execute` | Existing integrations with explicit session/resource checks |

Use validated inputs and typed DTOs. Build aggregate dashboard/record/review reads rather than repeating browser N+1 queries. Add bounded pagination. Zustand remains UI state; replace its Supabase calls with a shared typed fetch client. Replace all page-local Supabase access too, not only the four stores. Preserve organization-prefixed URLs, logout behavior and selected-organization convenience state; clear cached tenant/user data on switch/logout.

## AI Gateway, Judge0 and R2

**AI:** Use `@cf/meta/llama-3.2-3b-instruct` through the [Workers AI binding and AI Gateway](https://developers.cloudflare.com/ai-gateway/usage/worker-binding-methods/), with a 256-token response cap. The server uses `AI.run` and an explicit gateway ID; no Gemini SDK/provider secret is needed. The user requested inexpensive simple student guidance rather than Gemini 2.5 Flash. [Current pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) is approximately $0.051 per million input tokens and $0.335 per million output tokens (checked 6 October 2026).

Make model/provider configuration server-owned. Check session, program access, mode and bounded input lengths; fetch assignment context server-side. Give students hints and teachers review help without treating AI text such as `APPROVED` as a teacher decision. Add per-user/organization limits, global spend controls, timeouts, bounded retries and safe failures. Define logging retention; avoid raw student code/PII in general logs and disable response caching initially. Gateway limits do not replace application authorization or per-user quotas.

**Execution:** Keep Judge0 isolated behind `/api/execute`; Workers must never directly execute uploaded student code. Add session/program checks, allowed language IDs, source/stdin limits, a server-owned destination URL and request timeout. Evaluate whether the current `wait=true` contract is sufficiently reliable; use submit-and-poll if needed. Decode outputs with Worker-compatible APIs or validated `nodejs_compat` support. Do not leak raw provider errors or keys. Execution output is not teacher approval; browser-provided output must not be presented as a verified grading result.

**Avatars:** Access private R2 through the [`FILES` binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/). Use authenticated, bounded multipart upload with allowed MIME types and verified file signatures; reject SVG/HTML and oversized images. Generate object keys on the server, record the current key in D1, and serve authorized reads with safe content headers. Do not use user-supplied arbitrary object paths. Handle failed D1 updates and old-object cleanup explicitly because R2 and D1 do not share a transaction. Keep Google/default avatar presentation without granting arbitrary external URL imports. No attachments, PDF archives, or submission blobs are planned for R2.

## Implementation order and acceptance gates

1. **Vinext conversion and auth compatibility spike.** Add Vite + vinext + Cloudflare plugin configuration, Wrangler configuration, typed binding access, revised package scripts and isolated local resources. Test a representative page, route handler, D1 query, R2 operation, Better Auth Google OAuth/session lifecycle, Workers AI Gateway call, Monaco and jsPDF on Workers. Pin compatible vinext/auth versions and adapt Next.js APIs as needed. Gate: real vinext Worker behavior works; document unresolved compatibility blockers without changing the required hosting target.
2. **Fresh D1 schema and backend foundations.** Commit schema migrations, auth configuration, authorization helpers, validation/DTOs and transactional membership/invite services. Seed only development fixtures; production starts empty and users create organizations. Gate: fresh database initialization and isolation/atomicity tests pass.
3. **Auth, organization and administration flows.** Replace Supabase session providers/proxy/login/signup/callback and organization/admin data access. Wire Google-only sign-in and registration. Gate: verified Google signup/login/logout, callback, organization switching, creation, invitations, role enforcement, owner protection and membership removal work.
4. **Teaching, submissions and records.** Replace remaining browser queries and stores. Adopt one approved state machine across both legacy question routes and classroom routes. Gate: drafts, submission/review, resubmission, stale edits, assigned access, dashboards and completed PDF records work without cross-tenant leakage.
5. **AI, execution and avatars.** Wire authenticated Gateway, bounded Judge0 service and R2 avatar lifecycle. Gate: real permitted requests work; unauthorized/cross-org requests fail, quota/timeouts are handled, and replacement/deletion failure paths are covered.
6. **Cleanup and deployment.** Remove Supabase packages/clients/types/env variables once no live code depends on them. Replace generic README/build guide with actual setup and URLs; evaluate removing Vercel Analytics or replacing it with Cloudflare Web Analytics. Add scoped CI checks and staging deployment. Confirm personal account and domain, provision distinct staging/production D1/R2/gateways, apply schema before app deployment, smoke staging, then deploy production when authorized.

For each coherent implementation phase: focused implementation review; a subagent writes/updates meaningful tests, another runs the appropriate checks; main agent resolves failures; final independent review before handoff. This planning task requires document review only and does not add placeholder tests.

### Validation to run during implementation

- Typecheck, lint, production vinext build, and Workers preview checks using the pinned package/tool versions.
- Fresh D1 schema, foreign keys, indexes, duplicate memberships/submissions, transactional failure/retry and concurrent stale-write checks.
- Google OAuth callback/state and disabled password/OTP/recovery endpoint tests, unverified-email invite rejection, repeated invite claiming and role precedence.
- API authorization matrix: owner/admin/assigned teacher/student/nonmember, two organizations, mismatched nested IDs, removed memberships, forged review states, stale versions, and last-owner protection.
- Integration tests for AI/execute limits and failures; real preview Workers AI Gateway and Judge0 smoke tests with test accounts, plus gateway routing evidence.
- R2 avatar upload/read/replace/delete, invalid types/sizes, unauthorized keys and partial failure cleanup.
- Browser smoke: Google signup/login, create/select organization, invite users, classroom/program creation, student draft and submit, teacher approval/rejection, resubmit, code execution/AI hints, profile avatar, single/full PDF download, logout, direct URL reload and mobile navigation.
- Final repository scan for Supabase runtime references and browser-exposed secrets; deployed metadata/bindings and remote schema ledger verification.

## Decisions and deployment inputs still needed

Confirmed behavior and remaining deployment inputs:

- **Review workflow:** recommend `draft -> pending -> approved/rejected`, approval by assigned teachers or organization owners/admins, and algorithm approval required before final code submission. The repository has demo auto-approval in legacy question pages and a combined classroom submission path; this is a behavior decision, not a mechanical database replacement. This canonical flow was approved and is implemented.
- **Teacher scope:** confirmed organization-wide visibility, assigned-classroom management and review.
- **Identity/invitations:** Google-only authentication; no email delivery service. Preserve verified Google-email dashboard claiming.
- **Deployment:** personal Cloudflare account ID, resource naming, chosen domain, Google OAuth app/callback URLs, Judge0 credentials and AI Gateway configuration. Do not copy existing secrets into documentation or logs.
- **Auth compatibility:** Better Auth is implemented; real D1 auth lifecycle and vinext Worker checks are part of implementation validation. Live Google OAuth requires provider credentials.

Configuration should remain source-owned in `wrangler.jsonc`: `DB` D1 binding, `FILES` R2 binding, `AI` binding, public application origin, gateway ID/model and server-only Judge0 destination settings. Store auth, Google and Judge0 secrets using Worker secrets. Keep staging and production resources/secrets distinct. Do not infer the deployment domain from the existing Open Graph URL.

## Original planning-stage limitations

At the planning stage, reviewed local source, generated database types, checked SQL migrations and official platform/auth documentation. No remote databases/accounts were inspected; no resources were created; no application build, browser smoke, integration request or runtime compatibility spike was run. The repository has no test script in `package.json`, and dependencies were not installed during this planning task. Existing staged `.gitignore` changes are unrelated and must be preserved.
