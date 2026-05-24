/**
 * Generation runner — spawns the OpenGame CLI (opengame) as a child process,
 * captures stdout/stderr line-by-line, and calls the provided callbacks.
 *
 * Environment variables forwarded to the child:
 *   OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, and all OPENGAME_* vars.
 */

import { spawn } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';

export interface GenerateOptions {
  id: string;
  prompt: string;
  gameDir: string;
  model?: string;
  imageProvider?: string;
  onLog: (line: string) => void;
  onDone: (indexHtml: string) => Promise<void>;
  onError: (err: string) => Promise<void>;
}

/**
 * Finds the index.html file produced by the generation run inside gameDir.
 */
async function findIndexHtml(gameDir: string): Promise<string | null> {
  const candidates = ['index.html', 'game/index.html', 'dist/index.html'];
  for (const candidate of candidates) {
    if (await fs.pathExists(path.join(gameDir, candidate))) {
      return candidate;
    }
  }
  // Recursive search (max depth 3)
  const walk = async (dir: string, depth: number): Promise<string | null> => {
    if (depth > 3) return null;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name === 'index.html') {
        return path.relative(gameDir, path.join(dir, entry.name));
      }
      if (entry.isDirectory()) {
        const found = await walk(path.join(dir, entry.name), depth + 1);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(gameDir, 0);
}

export async function generateGame(opts: GenerateOptions): Promise<void> {
  const {
    prompt,
    gameDir,
    model,
    imageProvider,
    onLog,
    onDone,
    onError,
  } = opts;

  // Build the env passed to the child process
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    // Override model if specified
    ...(model ? { OPENAI_MODEL: model } : {}),
    ...(imageProvider ? { OPENGAME_IMAGE_PROVIDER: imageProvider } : {}),
    // Non-interactive mode — use the current working dir as the output dir
    OPENGAME_OUTPUT_DIR: gameDir,
  };

  // Resolve the opengame binary: prefer the workspace dist, fall back to PATH
  const args = [
    // Non-interactive: single prompt, then exit
    '--prompt',
    prompt,
    '--output-dir',
    gameDir,
    '--yes', // auto-approve all prompts
  ];

  // Try to find opengame in PATH or workspace dist
  const opengameBin = 'opengame';

  onLog(`[server] Starting generation…`);
  onLog(`[server] Output directory: ${gameDir}`);
  onLog(`[server] Model: ${model ?? process.env.OPENAI_MODEL ?? 'default'}`);

  const child = spawn(opengameBin, args, {
    cwd: gameDir,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let lastLines: string[] = [];

  const handleLine = (line: string): void => {
    onLog(line);
    lastLines.push(line);
    if (lastLines.length > 50) lastLines = lastLines.slice(-50);
  };

  // Stream stdout/stderr
  child.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf8');
    for (const line of text.split('\n')) {
      if (line.trim()) handleLine(line);
    }
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf8');
    for (const line of text.split('\n')) {
      if (line.trim()) handleLine(`[stderr] ${line}`);
    }
  });

  await new Promise<void>((resolve) => {
    child.on('close', async (code) => {
      if (code === 0) {
        const indexHtml = await findIndexHtml(gameDir);
        if (indexHtml) {
          await onDone(indexHtml);
        } else {
          await onError('Generation finished but no index.html was found.');
        }
      } else {
        await onError(
          `Generation process exited with code ${code}. Last output:\n${lastLines.slice(-10).join('\n')}`,
        );
      }
      resolve();
    });

    child.on('error', async (err) => {
      await onError(
        `Failed to start OpenGame CLI: ${err.message}\n` +
          `Make sure 'opengame' is installed (npm install -g @opengame/opengame).`,
      );
      resolve();
    });
  });
}
