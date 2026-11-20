export const env: Record<string, string | undefined> = new Proxy(
  {},
  { get: (_, key) => (typeof key === 'string' ? process.env[key] : undefined) },
);
