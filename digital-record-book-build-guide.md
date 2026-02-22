# Digital Record - Flow & Path Documentation

This document outlines the high-level role-based access control (RBAC), the authentication flow, and lists all available paths in the Digital Record application.

## 1. Authentication & Organization Selection Flow

1. **Sign Up / Login** (`/signup` or `/login`):
   - Users authenticate via Email/Password (with OTP verification) or Google OAuth.
   - Upon successful authentication, all users are redirected to `/dashboard`.
   - **Note**: The global `role` field in the `profiles` table is now treated as a default fallback. True access control is managed per-organization.

2. **Dashboard** (`/dashboard`):
   - Displays a list of all organizations the user belongs to.
   - Users can see their specific role (`owner`, `admin`, `teacher`, or `student`) for each organization.
   - If a user has no organizations, they can create a new one (becoming the `owner`).
   - Clicking an organization saves the context (e.g., in localStorage `selected_org_id`) and routes the user to the appropriate workspace based on their role in *that* organization:
     - `owner` or `admin` -> `/admin`
     - `teacher` -> `/teacher`
     - `student` -> `/student`

3. **Proxy / Middleware** (`/proxy.ts`):
   - Protects all authenticated routes.
   - Redirects unauthenticated users to `/login`.
   - Ensures authenticated users trying to access root `/` or role-specific paths directly without an active session are routed to `/dashboard` to select their organization context.

---

## 2. Role Capabilities (Per Organization)

### Owner & Admin
- Have full control over the organization.
- Can invite/remove teachers via the Admin Dashboard.
- **Path**: `/admin/*`

### Teacher
- Can view classrooms within the selected organization.
- Can create new classrooms.
- Can bulk invite students to specific classrooms.
- Can create and post programming questions (Algorithms/Code assignments).
- Can review student submissions (Algorithms and Code).
- **Path**: `/teacher/*`

### Student
- Automatically added to classrooms upon signup if invited.
- Can view assigned questions.
- Must submit an algorithm step for approval first.
- Can use an AI assistant for hints on their algorithm.
- Upon algorithm approval, can access the Monaco-based code editor.
- Can write, compile, test, and submit code using the Judge0 API.
- **Path**: `/student/*`

---

## 3. Application Paths

### Public / Authentication
- `/` - Landing page (redirects to dashboard if logged in)
- `/login` - Login page
- `/signup` - Signup page with OTP verification
- `/auth/callback` - OAuth callback handler

### Shared Authenticated
- `/dashboard` - Central hub for Organization selection and creation
- `/profile` - User profile management

### Admin Workspace
- `/admin` - Admin overview/dashboard
- `/admin/teachers` - Manage organization teachers (invite/remove)
- `/admin/classrooms` - View all classrooms (Admin view)
- `/admin/students` - View all students (Admin view)

### Teacher Workspace
- `/teacher` - Teacher overview/dashboard
- `/teacher/classrooms` - Manage classrooms and invite students
- `/teacher/questions` - View posted questions
- `/teacher/questions/new` - Create a new programming question
- `/teacher/algorithms` - Review student algorithm submissions
- `/teacher/code-review` - Review student code submissions

### Student Workspace
- `/student` - Student overview/dashboard
- `/student/classrooms` - View enrolled classrooms
- `/student/questions` - View assigned questions
- `/student/questions/[id]` - View question details and progress
- `/student/questions/[id]/algorithm` - Write and submit algorithm (with AI help)
- `/student/questions/[id]/code` - Write, compile, and submit code (Monaco + Judge0)
- `/student/progress` - Overall student progress
- `/student/records` - List of completed digital records
- `/student/records/[id]` - View a specific completed digital record

### API Routes
- `/api/execute` - Handles secure code compilation and execution via Judge0 API.
