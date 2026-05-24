/**
 * OpenGame Self-Hosted Backend Server
 *
 * Express + Socket.io server that wraps the OpenGame CLI and exposes:
 *  - REST   /api/games        – list generated games
 *  - REST   /api/generate     – kick off a new generation (SSE stream)
 *  - REST   /api/games/:id    – get game metadata
 *  - REST   /api/games/:id/delete – delete a game
 *  - REST   /api/downloads    – list + serve pre-built Electron installers
 *  - WS     socket.io         – real-time generation progress
 *  - Static /games/:id        – serve the generated game HTML
 */

import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import fs from 'fs-extra';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { createDownloadsRouter } from './downloads.js';
import { generateGame } from './generate.js';
import { GameRecord, listGames, loadGame, saveGame, deleteGame } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.SERVER_PORT ?? '4000', 10);
const GAMES_DIR = process.env.GAMES_DIR ?? path.join(os.homedir(), '.opengame', 'games');
const INSTALLERS_DIR =
  process.env.INSTALLERS_DIR ?? path.join(os.homedir(), '.opengame', 'installers');

await fs.ensureDir(GAMES_DIR);

const app = express();
const httpServer = createServer(app);

// ── Socket.io ──────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── Static: serve built web-ui (production) ────────────────────────────────
// In Docker: /app/dist/server.js → __dirname = /app/dist → ../web-ui/dist = /app/web-ui/dist
// In dev:    packages/server/dist/server.js → ../../web-ui/dist = web-ui/dist (monorepo root)
const webUiDist = process.env.WEB_UI_DIST
  ? path.resolve(process.env.WEB_UI_DIST)
  : fs.pathExistsSync(path.resolve(__dirname, '../web-ui/dist'))
    ? path.resolve(__dirname, '../web-ui/dist')
    : path.resolve(__dirname, '../../web-ui/dist');
if (await fs.pathExists(webUiDist)) {
  app.use(express.static(webUiDist));
}

// ── Static: serve generated game files ────────────────────────────────────
app.use('/games', express.static(GAMES_DIR));

// ── REST: health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.6.0', gamesDir: GAMES_DIR, installersDir: INSTALLERS_DIR });
});

// ── REST: list games ──────────────────────────────────────────────────────
app.get('/api/games', async (_req, res) => {
  try {
    const games = await listGames(GAMES_DIR);
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── REST: get single game ─────────────────────────────────────────────────
app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await loadGame(GAMES_DIR, req.params.id);
    if (!game) return void res.status(404).json({ error: 'Not found' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── REST: delete game ─────────────────────────────────────────────────────
app.delete('/api/games/:id', async (req, res) => {
  try {
    await deleteGame(GAMES_DIR, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── REST: start generation (SSE) ──────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const {
    prompt,
    model,
    baseUrl,
    apiKey,
    imageProvider,
    imageBaseUrl,
    imageApiKey,
    imageModel,
  } = req.body as {
    prompt?: string;
    model?: string;
    baseUrl?: string;
    apiKey?: string;
    imageProvider?: string;
    imageBaseUrl?: string;
    imageApiKey?: string;
    imageModel?: string;
  };

  if (!prompt?.trim()) {
    return void res.status(400).json({ error: 'prompt is required' });
  }

  const id = uuidv4();
  const gameDir = path.join(GAMES_DIR, id);
  await fs.ensureDir(gameDir);

  const resolvedBaseUrl = baseUrl || process.env.OPENAI_BASE_URL;
  const resolvedModel   = model   || process.env.OPENAI_MODEL || 'qwen2.5-coder:7b';

  const record: GameRecord = {
    id,
    prompt: prompt.trim(),
    status: 'running',
    createdAt: new Date().toISOString(),
    model: resolvedModel,
  };
  await saveGame(GAMES_DIR, record);

  // Respond immediately; client subscribes for updates via socket.io
  res.json({ id });

  generateGame({
    id,
    prompt: prompt.trim(),
    gameDir,
    model:         resolvedModel,
    baseUrl:       resolvedBaseUrl,
    apiKey:        apiKey || process.env.OPENAI_API_KEY,
    imageProvider: imageProvider || process.env.OPENGAME_IMAGE_PROVIDER,
    imageBaseUrl:  imageBaseUrl  || process.env.OPENGAME_IMAGE_BASE_URL,
    imageApiKey:   imageApiKey   || process.env.OPENGAME_IMAGE_API_KEY,
    imageModel:    imageModel    || process.env.OPENGAME_IMAGE_MODEL,
    onLog: (line) => io.to(id).emit('log', { id, line }),
    onDone: async (indexHtml) => {
      record.status = 'done';
      record.indexHtml = indexHtml;
      record.finishedAt = new Date().toISOString();
      await saveGame(GAMES_DIR, record);
      io.to(id).emit('done', { id, indexHtml });
    },
    onError: async (err) => {
      record.status = 'error';
      record.error = err;
      record.finishedAt = new Date().toISOString();
      await saveGame(GAMES_DIR, record);
      io.to(id).emit('error', { id, error: err });
    },
  }).catch(console.error);
});

// ── REST: downloads (pre-built installers) ────────────────────────────────
app.use('/api/downloads', createDownloadsRouter(INSTALLERS_DIR));

// ── Socket.io: join generation room ───────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('subscribe', (id: string) => {
    socket.join(id);
  });
  socket.on('unsubscribe', (id: string) => {
    socket.leave(id);
  });
});

// ── SPA fallback ──────────────────────────────────────────────────────────
if (await fs.pathExists(webUiDist)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webUiDist, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`OpenGame server running at http://localhost:${PORT}`);
  console.log(`Games stored in: ${GAMES_DIR}`);
});

export { io };
