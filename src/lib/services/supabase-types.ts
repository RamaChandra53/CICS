export type SupabaseQueryResult<T = unknown> = {
  data: T | null;
  error: { message?: string; code?: string } | null;
};

export type SupabaseQueryChain<T = unknown> = PromiseLike<SupabaseQueryResult<T>> & {
  select: (columns: string) => SupabaseQueryChain<T>;
  eq: (column: string, value: unknown) => SupabaseQueryChain<T>;
  in: (column: string, values: unknown[]) => SupabaseQueryChain<T>;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryChain<T>;
  range: (from: number, to: number) => SupabaseQueryChain<T>;
  insert: (value: unknown) => SupabaseQueryChain<T>;
  update: (value: unknown) => SupabaseQueryChain<T>;
  delete: () => SupabaseQueryChain<T>;
  single: () => Promise<SupabaseQueryResult<T>>;
  maybeSingle: () => Promise<SupabaseQueryResult<T>>;
  abortSignal?: (signal: AbortSignal) => unknown;
};

export type SupabaseClientLike = {
  from: (table: string) => SupabaseQueryChain;
};
