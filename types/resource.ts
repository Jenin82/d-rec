export interface QueryFilter { column: string; operator: 'eq' | 'in' | 'neq' | 'is'; value: unknown }
export interface QueryRequest {
  operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete'; columns: string;
  filters: QueryFilter[]; order?: { column: string; ascending?: boolean }; limit?: number;
  single?: 'single' | 'maybeSingle'; count?: boolean; head?: boolean;
  values?: Record<string, unknown> | Record<string, unknown>[]; returning?: boolean;
  expectedVersion?: number;
  offset?: number;
}
export interface QueryResponse<T = unknown> { data: T | null; error: { message: string; code?: string } | null; count?: number }
