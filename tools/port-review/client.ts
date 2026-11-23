import { Jev } from 'jev-lint/client';

export const OPENROUTER_DECISIONS = 'https://openrouter.ai/api/alpha/decisions';
export const FREE_DECIDER = 'perplexity/pplx-decider-v1.3:free';
export const FREE_INTERVAL_MS = 3_300;

export function pacedTransport(
  intervalMs: number,
  send: (url: string, init?: RequestInit) => Promise<Response>,
): (url: string | URL | Request, init?: RequestInit) => Promise<Response> {
  let next = 0;
  return async (_url, init) => {
    const at = Math.max(Date.now(), next);
    next = at + intervalMs;
    const wait = at - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return send(OPENROUTER_DECISIONS, init);
  };
}

export function openRouterClient(apiKey: string, model = FREE_DECIDER, intervalMs = FREE_INTERVAL_MS): Jev {
  const transport = pacedTransport(intervalMs, (url, init) => fetch(url, init));
  return new Jev({ apiKey, model, fetch: transport as typeof fetch });
}
