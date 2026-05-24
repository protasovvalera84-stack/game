/**
 * Typed API client for the OpenGame backend.
 */

export interface GameRecord {
  id: string;
  prompt: string;
  status: 'running' | 'done' | 'error';
  model: string;
  createdAt: string;
  finishedAt?: string;
  indexHtml?: string;
  error?: string;
  thumbnail?: string;
}

export interface GenerateRequest {
  prompt: string;
  model?: string;
  imageProvider?: string;
}

export interface GenerateResponse {
  id: string;
}

const BASE = '/api';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; version: string }>('GET', '/health'),

  listGames: () => request<GameRecord[]>('GET', '/games'),

  getGame: (id: string) => request<GameRecord>('GET', `/games/${id}`),

  deleteGame: (id: string) =>
    request<{ ok: boolean }>('DELETE', `/games/${id}`),

  generate: (body: GenerateRequest) =>
    request<GenerateResponse>('POST', '/generate', body),
};

/** URL for an embedded game's index.html */
export function gameUrl(game: GameRecord): string | null {
  if (!game.indexHtml) return null;
  return `/games/${game.id}/${game.indexHtml}`;
}
