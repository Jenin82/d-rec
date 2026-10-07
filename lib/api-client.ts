import type { Database } from "@/types/db.types";

export type ApiError = { message: string; code?: string };
export type ApiResult<T> = { data: T | null; error: ApiError | null; count?: number | null };
export async function apiRequest<T>(path: string, body?: unknown, method = "POST"): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method, credentials: "same-origin",
      headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
    const result = await response.json() as ApiResult<T>;
    if (!response.ok) return { data: null, error: typeof result.error === "object" && result.error ? result.error : { message: response.status === 401 ? "Please sign in again." : response.status === 403 ? "You do not have permission for this action." : response.status === 409 ? "This work changed. Reload before saving again." : "Unable to complete this request.", code: String(response.status) } };
    return result;
  } catch {
    return { data: null, error: { message: "Unable to connect. Please try again." } };
  }
}

export type OrganizationAccess = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  role: "superuser" | "owner" | "admin" | "teacher" | "student";
};

/** Effective access comes from the authenticated server, including global superusers. */
export function getAccessibleOrganizations(): Promise<ApiResult<OrganizationAccess[]>> {
  return apiRequest<OrganizationAccess[]>("/api/organizations", undefined, "GET");
}

export async function getOrganizationAccess(orgId: string): Promise<ApiResult<OrganizationAccess>> {
  const result = await getAccessibleOrganizations();
  if (result.error) return { data: null, error: result.error };
  const organization = result.data?.find((item) => item.id === orgId);
  return organization
    ? { data: organization, error: null }
    : { data: null, error: { message: "You do not have access to this organization.", code: "403" } };
}

type Tables = Database["public"]["Tables"];
type Table = keyof Tables;
type Row<T extends Table> = Tables[T]["Row"] & { organizations: Tables["organizations"]["Row"] | null; profiles: Tables["profiles"]["Row"] | null; classrooms: Tables["classrooms"]["Row"] | null; classroom_members: Tables["classroom_members"]["Row"][] };
type Filter = { column: string; operator: "eq" | "in" | "neq" | "is"; value: unknown };
type Query = { operation: "select" | "insert" | "update" | "delete"; columns?: string; filters: Filter[]; order?: { column: string; ascending: boolean }; limit?: number; offset?: number; single?: "single" | "maybeSingle"; count?: boolean; head?: boolean; values?: unknown; returning?: boolean };
/** Same-origin resource DTO builder. Permissions and writable fields are enforced by the server. */
class ResourceQuery<T extends Table, Result = Row<T>[]> implements PromiseLike<ApiResult<Result>> {
  constructor(private table: T, private query: Query = { operation: "select", filters: [] }) {}
  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.query.columns = columns;
    this.query.count = options?.count === "exact";
    this.query.head = options?.head;
    this.query.returning = this.query.operation !== "select";
    return this;
  }
  insert(values: unknown) { this.query.operation = "insert"; this.query.values = values; return this; }
  update(values: unknown) { this.query.operation = "update"; this.query.values = values; return this; }
  delete() { this.query.operation = "delete"; return this; }
  eq(column: string, value: unknown) { this.query.filters.push({ column, operator: "eq", value }); return this; }
  neq(column: string, value: unknown) { this.query.filters.push({ column, operator: "neq", value }); return this; }
  in(column: string, value: unknown[]) { this.query.filters.push({ column, operator: "in", value }); return this; }
  is(column: string, value: unknown) { this.query.filters.push({ column, operator: "is", value }); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.query.order = { column, ascending: options?.ascending ?? true }; return this; }
  limit(limit: number) { this.query.limit = limit; return this; }
  single() { this.query.single = "single"; return this as unknown as ResourceQuery<T, Row<T>>; }
  maybeSingle() { this.query.single = "maybeSingle"; return this as unknown as ResourceQuery<T, Row<T>>; }
  then<TResult1 = ApiResult<Result>, TResult2 = never>(onfulfilled?: ((value: ApiResult<Result>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
  private async execute(): Promise<ApiResult<Result>> {
    const path = `/api/resources/${this.table}`;
    if (this.query.operation !== "select" || this.query.single || this.query.head || this.query.limit !== undefined) return apiRequest<Result>(path, this.query);
    const rows: unknown[] = [];
    for (let offset = 0; offset <= 100000; offset += 500) {
      const page = await apiRequest<unknown[]>(path, { ...this.query, limit: 500, offset });
      if (page.error) return { data: null, error: page.error };
      if (!Array.isArray(page.data)) return { data: null, error: { message: "Invalid resource response." } };
      rows.push(...page.data);
      if (page.data.length < 500) return { data: rows as Result, error: null, count: page.count };
    }
    return { data: null, error: { message: "Too many results. Please narrow your filters." } };
  }
}
export const api = { from: <T extends Table>(table: T) => new ResourceQuery(table) };

export async function organizationProgramIds(orgId: string): Promise<ApiResult<string[]>> {
  const classrooms = await api.from("classrooms").select("id").eq("organization_id", orgId);
  if (classrooms.error) return { data: null, error: classrooms.error };
  const programs = await api.from("programs").select("id").in("classroom_id", (classrooms.data || []).map((item) => item.id));
  return { data: programs.data?.map((item) => item.id) || null, error: programs.error };
}

/** Narrow provider responses before displaying them; shared API errors use an object. */
export async function readIntegrationResponse(response: Response): Promise<{
  error?: string; feedback?: string; stdout?: string | null; stderr?: string | null;
  compile_output?: string | null; details?: string; avatar_url?: string | null;
}> {
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid service response.");
  const source = raw as Record<string, unknown>;
  const result: { [key: string]: string | null | undefined } = {};
  for (const key of ["feedback", "stdout", "stderr", "compile_output", "details", "avatar_url"]) {
    if (typeof source[key] === "string" || source[key] === null) result[key] = source[key] as string | null;
  }
  if (typeof source.error === "string") result.error = source.error;
  else if (source.error && typeof source.error === "object" && "message" in source.error && typeof source.error.message === "string") result.error = source.error.message;
  return result as { error?: string; feedback?: string; stdout?: string | null; stderr?: string | null; compile_output?: string | null; details?: string; avatar_url?: string | null };
}
