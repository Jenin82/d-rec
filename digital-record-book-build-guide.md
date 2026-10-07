# Digital Record: flows and routes

See [README.md](README.md) for the Cloudflare runtime, fresh D1 setup, credentials and deployment instructions.

Users sign up at `/signup` with email/password and a six-digit verification code, or use Google login. `/login` and `/forgot-password` handle sign-in and recovery. Better Auth handles provider callbacks at `/api/auth/callback/google`; `/auth/callback` preserves the application return flow.

The `/dashboard` lists organizations and creates a new organization with an owner membership atomically. `/profile` edits the current profile and manages private R2 avatars. Membership roles belong to individual organizations; the selected organization is only a UI convenience.

All role workspaces include the organization ID:

- `/{orgId}/admin`: users, teachers, students, classrooms and settings.
- `/{orgId}/teacher`: classroom visibility across the organization, assignment creation and review management for assigned classrooms. `/teacher/reviews` is the review queue; legacy algorithm/code review routes redirect there.
- `/{orgId}/student`: assigned classrooms, questions, progress and completed records. The canonical editor is `/{orgId}/student/classrooms/{classroomId}/programs/{programId}`; legacy question editors redirect there.

Student algorithms move from draft to pending teacher review. Only an approved algorithm permits final code submission. Pending/approved work is frozen until explicit reopening, which clears both reviews and completed-record eligibility. Version checks prevent stale overwrites. AI provides hints only; Judge0 executes supported code, and teacher decisions determine approval.

Invitations have expiry and are claimed on the dashboard using the user's verified email. Invitations do not send notification emails; share the signup link separately. Verification and recovery email use the configured sender.

Server operations use `/api/resources/{table}` with allowlisted DTOs, filters and server authorization; organization creation and invitation claiming use `/api/organizations` and `/api/invites/accept`. Reopening uses `/api/programs/{programId}/reopen`. `/api/ai/assist`, `/api/execute` and `/api/profile/avatar` enforce sessions, resource access and bounded usage. The browser has no D1 or R2 credentials.

Single and full record PDFs are generated and downloaded in the browser. R2 stores profile avatars only.
