/**
 * Generation runner — spawns the OpenGame CLI (opengame) as a child process,
 * captures stdout/stderr line-by-line, and calls the provided callbacks.
 *
 * Per-request provider overrides (baseUrl, apiKey, imageProvider, …) are
 * injected as environment variables so the CLI picks them up automatically.
 * Server-level env vars serve as fallback defaults.
 */

import { spawn } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';

export interface GenerateOptions {
  id: string;
  prompt: string;
  gameDir: string;
  model?: string;
  /** OpenAI-compatible base URL, e.g. http://localhost:11434/v1 */
  baseUrl?: string;
  /** API key — forwarded only to the spawned child, never logged */
  apiKey?: string;
  imageProvider?: string;
  imageBaseUrl?: string;
  imageApiKey?: string;
  imageModel?: string;
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
    baseUrl,
    apiKey,
    imageProvider,
    imageBaseUrl,
    imageApiKey,
    imageModel,
    onLog,
    onDone,
    onError,
  } = opts;

  // ── Build child environment ───────────────────────────────────────────────
  // Per-request overrides take priority over server-level env vars.
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,

    // LLM provider
    ...(baseUrl    ? { OPENAI_BASE_URL:  baseUrl  } : {}),
    ...(apiKey     ? { OPENAI_API_KEY:   apiKey   } : {}),
    ...(model      ? { OPENAI_MODEL:     model    } : {}),

    // Image generation
    ...(imageProvider ? { OPENGAME_IMAGE_PROVIDER: imageProvider } : {}),
    ...(imageBaseUrl  ? { OPENGAME_IMAGE_BASE_URL:  imageBaseUrl  } : {}),
    ...(imageApiKey   ? { OPENGAME_IMAGE_API_KEY:   imageApiKey   } : {}),
    ...(imageModel    ? { OPENGAME_IMAGE_MODEL:      imageModel    } : {}),

    OPENGAME_OUTPUT_DIR: gameDir,
  };

  // opengame CLI flags (see packages/cli/src/config/config.ts):
  //   --prompt / -p   : non-interactive prompt
  //   --yolo          : auto-approve ALL tool calls (equivalent to --approval-mode=yolo)
  //   --no-sandbox    : disable sandbox (we are already inside Docker)
  // Output goes to cwd (gameDir) — the CLI does not have --output-dir flag.
  const args = [
    '--prompt', prompt,
    '--yolo',
    '--no-sandbox',
  ];

  const providerLabel = baseUrl
    ? baseUrl.replace(/^https?:\/\//, '').replace(/\/v1\/?$/, '')
    : (process.env.OPENAI_BASE_URL ?? 'default');

  onLog(`[server] Starting generation…`);
  onLog(`[server] Provider: ${providerLabel}`);
  onLog(`[server] Model: ${model ?? process.env.OPENAI_MODEL ?? 'default'}`);
  onLog(`[server] Output: ${gameDir}`);
  if (imageProvider) {
    onLog(`[server] Image provider: ${imageProvider} (${imageModel ?? 'default model'})`);
  }

  const child = spawn('opengame', args, {
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

  child.stdout?.on('data', (chunk: Buffer) => {
    chunk.toString('utf8').split('\n').filter(Boolean).forEach(handleLine);
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    chunk.toString('utf8').split('\n').filter(Boolean).forEach((l) => handleLine(`[stderr] ${l}`));
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
