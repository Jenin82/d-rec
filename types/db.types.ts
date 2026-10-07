/** Application DTOs for the fresh D1 schema in migrations/0002_application.sql.
 * JSON metadata is decoded by the server; timestamps are ISO strings.
 * These types describe data, not API write permissions or authorization.
 */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type Metadata = { [key: string]: Json };
export type OrganizationRole = "owner" | "admin" | "teacher" | "student";
export type ClassroomRole = "teacher" | "student";
export type InviteRole = Exclude<OrganizationRole, "owner">;
export type SubmissionStatus = "draft" | "pending" | "approved" | "rejected";

type Created = { id: string; created_at: string };
type Timestamped = Created & { updated_at: string };

export type ProfileRow = Timestamped & {
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  // This legacy display field is not an authorization role; memberships grant access.
  role: string;
  metadata: Metadata | null;
};
export type OrganizationRow = Timestamped & {
  name: string;
  description: string | null;
  code: string | null;
  metadata: Metadata;
};
export type OrganizationMemberRow = Created & {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
};
export type ClassroomRow = Timestamped & {
  organization_id: string;
  name: string;
  term: string | null;
  metadata: Metadata;
};
export type ClassroomMemberRow = Created & {
  classroom_id: string;
  user_id: string;
  role: ClassroomRole;
};
export type ProgramRow = Timestamped & {
  classroom_id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  metadata: Metadata;
};
type InvitationRow = Created & {
  email: string;
  invited_by: string;
  expires_at: string;
};
export type OrganizationInviteRow = InvitationRow & {
  organization_id: string;
  role: InviteRole;
};
export type ClassroomInviteRow = InvitationRow & { classroom_id: string };
type SubmissionRow = Timestamped & {
  program_id: string;
  student_id: string;
  status: SubmissionStatus;
  feedback: string | null;
  version: number;
  metadata: Metadata;
};
export type AlgorithmSubmissionRow = SubmissionRow & { content: string };
export type CodeSubmissionRow = SubmissionRow & {
  code: string;
  language: string | null;
  output: string | null;
};

/** Retain the table lookup shape used by the application client. Server-assigned
 * IDs/defaults are optional on creation; APIs enforce narrower writable fields.
 * Auth, auditing and quota tables are intentionally not browser resources.
 */
type TableDefinition<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
};
export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow, "id">;
      organizations: TableDefinition<OrganizationRow, "name">;
      organization_members: TableDefinition<OrganizationMemberRow, "organization_id" | "user_id" | "role">;
      classrooms: TableDefinition<ClassroomRow, "organization_id" | "name">;
      classroom_members: TableDefinition<ClassroomMemberRow, "classroom_id" | "user_id" | "role">;
      programs: TableDefinition<ProgramRow, "classroom_id" | "title">;
      org_invites: TableDefinition<OrganizationInviteRow, "organization_id" | "email" | "role" | "invited_by" | "expires_at">;
      classroom_invites: TableDefinition<ClassroomInviteRow, "classroom_id" | "email" | "invited_by" | "expires_at">;
      algorithm_submissions: TableDefinition<AlgorithmSubmissionRow, "program_id" | "student_id">;
      code_submissions: TableDefinition<CodeSubmissionRow, "program_id" | "student_id">;
    };
  };
};
