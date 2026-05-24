/**
 * Minimal file-system game record store.
 * Each game lives in GAMES_DIR/<id>/meta.json
 */

import fs from 'fs-extra';
import path from 'node:path';

export interface GameRecord {
  id: string;
  prompt: string;
  status: 'running' | 'done' | 'error';
  model: string;
  createdAt: string;
  finishedAt?: string;
  indexHtml?: string; // relative path inside gameDir, e.g. "index.html"
  error?: string;
  thumbnail?: string; // data URL or path
}

const META = 'meta.json';

export async function saveGame(gamesDir: string, record: GameRecord): Promise<void> {
  const dir = path.join(gamesDir, record.id);
  await fs.ensureDir(dir);
  await fs.writeJson(path.join(dir, META), record, { spaces: 2 });
}

export async function loadGame(gamesDir: string, id: string): Promise<GameRecord | null> {
  const metaPath = path.join(gamesDir, id, META);
  if (!(await fs.pathExists(metaPath))) return null;
  return fs.readJson(metaPath) as Promise<GameRecord>;
}

export async function listGames(gamesDir: string): Promise<GameRecord[]> {
  await fs.ensureDir(gamesDir);
  const entries = await fs.readdir(gamesDir, { withFileTypes: true });
  const records: GameRecord[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const record = await loadGame(gamesDir, entry.name);
    if (record) records.push(record);
  }

  // Most recent first
  records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return records;
}

export async function deleteGame(gamesDir: string, id: string): Promise<void> {
  const dir = path.join(gamesDir, id);
  if (await fs.pathExists(dir)) {
    await fs.remove(dir);
  }
}
