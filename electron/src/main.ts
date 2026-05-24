/**
 * OpenGame Studio — Electron main process
 *
 * Starts an embedded Express + Socket.io server (port 4000 by default),
 * then opens a BrowserWindow loading the local web UI.
 *
 * The web-ui/dist folder is included as an extraResource by electron-builder
 * and available at process.resourcesPath/web-ui/dist at runtime.
 */

import cors from 'cors';
import {
  app,
  BrowserWindow,
  Menu,
  nativeImage,
  shell,
  Tray,
} from 'electron';
import express from 'express';
import fsExtra from 'fs-extra';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// ── Constants ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.SERVER_PORT ?? '4000', 10);
const GAMES_DIR = process.env.GAMES_DIR ?? path.join(app.getPath('userData'), 'games');
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverStarted = false;

// ── Types (minimal, mirroring packages/server/src/store.ts) ──────────────────
interface GameRecord {
  id: string;
  prompt: string;
  status: 'running' | 'done' | 'error';
  model: string;
  createdAt: string;
  finishedAt?: string;
  indexHtml?: string;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function saveGame(record: GameRecord): Promise<void> {
  const dir = path.join(GAMES_DIR, record.id);
  await fsExtra.ensureDir(dir);
  await fsExtra.writeJson(path.join(dir, 'meta.json'), record, { spaces: 2 });
}

async function loadGame(id: string): Promise<GameRecord | null> {
  const p = path.join(GAMES_DIR, id, 'meta.json');
  if (!(await fsExtra.pathExists(p))) return null;
  return fsExtra.readJson(p) as Promise<GameRecord>;
}

async function listGames(): Promise<GameRecord[]> {
  await fsExtra.ensureDir(GAMES_DIR);
  const entries = await fsExtra.readdir(GAMES_DIR, { withFileTypes: true });
  const records: GameRecord[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const r = await loadGame(e.name);
    if (r) records.push(r);
  }
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return records;
}

// ── Embedded server ──────────────────────────────────────────────────────────
async function startEmbeddedServer(): Promise<void> {
  if (serverStarted) return;
  serverStarted = true;

  await fsExtra.ensureDir(GAMES_DIR);

  const expressApp = express();
  const httpServer = createServer(expressApp);
  const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

  expressApp.use(cors());
  expressApp.use(express.json({ limit: '1mb' }));

  // Serve static web UI
  const webUiDist = isDev
    ? path.resolve(__dirname, '../../web-ui/dist')
    : path.join(process.resourcesPath, 'web-ui', 'dist');

  if (await fsExtra.pathExists(webUiDist)) {
    expressApp.use(express.static(webUiDist));
  }

  // Serve generated game files
  expressApp.use('/games', express.static(GAMES_DIR));

  // Health
  expressApp.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.6.0', platform: 'electron' });
  });

  // List games
  expressApp.get('/api/games', async (_req, res) => {
    try { res.json(await listGames()); }
    catch (err) { res.status(500).json({ error: String(err) }); }
  });

  // Get game
  expressApp.get('/api/games/:id', async (req, res) => {
    const g = await loadGame(req.params.id);
    if (!g) return void res.status(404).json({ error: 'Not found' });
    res.json(g);
  });

  // Delete game
  expressApp.delete('/api/games/:id', async (req, res) => {
    const dir = path.join(GAMES_DIR, req.params.id);
    if (await fsExtra.pathExists(dir)) await fsExtra.remove(dir);
    res.json({ ok: true });
  });

  // Start generation
  expressApp.post('/api/generate', async (req, res) => {
    const { prompt, model } = req.body as { prompt?: string; model?: string };
    if (!prompt?.trim()) return void res.status(400).json({ error: 'prompt required' });

    const id = uuidv4();
    const gameDir = path.join(GAMES_DIR, id);
    await fsExtra.ensureDir(gameDir);

    const record: GameRecord = {
      id,
      prompt: prompt.trim(),
      status: 'running',
      model: model ?? process.env.OPENAI_MODEL ?? 'qwen2.5-coder:7b',
      createdAt: new Date().toISOString(),
    };
    await saveGame(record);
    res.json({ id });

    // Spawn opengame CLI
    const { spawn } = await import('node:child_process');
    const child = spawn('opengame', ['--prompt', prompt.trim(), '--output-dir', gameDir, '--yes'], {
      cwd: gameDir,
      env: {
        ...process.env,
        OPENAI_MODEL: record.model,
        OPENGAME_OUTPUT_DIR: gameDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const emit = (line: string) => io.to(id).emit('log', { id, line });

    child.stdout?.on('data', (c: Buffer) =>
      c.toString().split('\n').filter(Boolean).forEach(emit),
    );
    child.stderr?.on('data', (c: Buffer) =>
      c.toString().split('\n').filter(Boolean).forEach((l) => emit(`[stderr] ${l}`)),
    );

    child.on('close', async (code) => {
      if (code === 0) {
        const indexHtml = (await fsExtra.pathExists(path.join(gameDir, 'index.html')))
          ? 'index.html'
          : null;
        record.status = 'done';
        record.indexHtml = indexHtml ?? undefined;
        record.finishedAt = new Date().toISOString();
        await saveGame(record);
        io.to(id).emit('done', { id, indexHtml });
      } else {
        record.status = 'error';
        record.error = `Process exited with code ${code}`;
        record.finishedAt = new Date().toISOString();
        await saveGame(record);
        io.to(id).emit('error', { id, error: record.error });
      }
    });

    child.on('error', async (err) => {
      record.status = 'error';
      record.error = err.message;
      record.finishedAt = new Date().toISOString();
      await saveGame(record);
      io.to(id).emit('error', { id, error: err.message });
    });
  });

  // Socket.io rooms
  io.on('connection', (socket) => {
    socket.on('subscribe',   (id: string) => socket.join(id));
    socket.on('unsubscribe', (id: string) => socket.leave(id));
  });

  // SPA fallback
  if (await fsExtra.pathExists(webUiDist)) {
    expressApp.get('*', (_req, res) =>
      res.sendFile(path.join(webUiDist, 'index.html')),
    );
  }

  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, '127.0.0.1', () => resolve());
  });

  console.log(`[electron] Embedded server on http://127.0.0.1:${PORT}`);
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'OpenGame Studio',
    backgroundColor: '#0d0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Frameless for modern look on all platforms
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Tray icon ─────────────────────────────────────────────────────────────────
function createTray(): void {
  // Use a 16×16 data-URI icon so we don't depend on external icon files in dev
  const iconDataUri =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAV0lEQVQ4jWP8z8BQz0ABYBo1gIFKgJGBgYGBgYH+DAAAAP//AwD9/f0AAAAA/v7+AAAAAN7e3gAAAAD09PQAAAAAgYGBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3gAAAABJRU5ErkJggg==';
  const icon = nativeImage.createFromDataURL(iconDataUri);

  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Open OpenGame Studio', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('OpenGame Studio');
  tray.setContextMenu(menu);
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    await startEmbeddedServer();
  } catch (err) {
    console.error('[electron] Failed to start embedded server:', err);
  }
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // On macOS keep the process alive until the user explicitly quits
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Ignore unused OS hostname (avoids lint warning)
const _host = os.hostname();
void _host;
