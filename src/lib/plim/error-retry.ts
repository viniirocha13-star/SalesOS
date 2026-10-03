export type PlimErrorRetryHandler = (payload: unknown) => Promise<void>;

const handlers = new Map<string, PlimErrorRetryHandler>();

export function registerPlimErrorHandler(key: string, handler: PlimErrorRetryHandler) {
  handlers.set(key, handler);
}

export function getPlimErrorHandler(key: string | null | undefined): PlimErrorRetryHandler | null {
  if (!key) return null;
  return handlers.get(key) ?? null;
}

export function hasPlimErrorHandler(key: string | null | undefined): boolean {
  return Boolean(key && handlers.has(key));
}
