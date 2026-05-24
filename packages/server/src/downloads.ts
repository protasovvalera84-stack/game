/**
 * Downloads route — lists and serves pre-built Electron installers.
 *
 * Installers are built by the `installer-builder` Docker service and placed
 * in INSTALLERS_DIR (default /data/installers). This module scans that
 * directory and exposes:
 *
 *   GET  /api/downloads           → metadata array (name, platform, arch, size, url)
 *   GET  /api/downloads/:file     → file download with Content-Disposition header
 */

import express, { Router } from 'express';
import fsExtra from 'fs-extra';
import path from 'node:path';

export interface InstallerFile {
  filename: string;
  /** windows | linux | android | source */
  platform: 'windows' | 'linux' | 'android' | 'source';
  /** exe | deb | AppImage | tar.gz | apk | pwahint */
  ext: string;
  arch: string;
  size: number;     // bytes
  sizeHuman: string;
  url: string;
  label: string;
  description: string;
}

const KNOWN: Record<string, Omit<InstallerFile, 'filename' | 'size' | 'sizeHuman' | 'url'>> = {
  '.exe': {
    platform: 'windows',
    ext: 'exe',
    arch: 'x64',
    label: 'Windows Installer (.exe)',
    description: 'NSIS installer for Windows 10/11 (64-bit)',
  },
  '.AppImage': {
    platform: 'linux',
    ext: 'AppImage',
    arch: 'x64',
    label: 'Linux AppImage',
    description: 'Universal Linux app — mark as executable and run',
  },
  '.deb': {
    platform: 'linux',
    ext: 'deb',
    arch: 'x64',
    label: 'Debian / Ubuntu (.deb)',
    description: 'For Debian, Ubuntu, Pop!_OS, Mint and other .deb distros',
  },
  '.tar.gz': {
    platform: 'source',
    ext: 'tar.gz',
    arch: 'x64',
    label: 'Linux (tar.gz)',
    description: 'Portable archive — extract and run the binary',
  },
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function scanInstallers(dir: string): Promise<InstallerFile[]> {
  await fsExtra.ensureDir(dir);
  const files = await fsExtra.readdir(dir);
  const result: InstallerFile[] = [];

  for (const filename of files) {
    const fullPath = path.join(dir, filename);
    const stat = await fsExtra.stat(fullPath);
    if (!stat.isFile()) continue;

    // Match by extension
    const matchedExt = Object.keys(KNOWN).find((ext) => filename.endsWith(ext));
    if (!matchedExt) continue;

    const meta = KNOWN[matchedExt];
    result.push({
      filename,
      ...meta,
      size: stat.size,
      sizeHuman: humanSize(stat.size),
      url: `/api/downloads/${encodeURIComponent(filename)}`,
    });
  }

  // Sort: Windows first, then Linux .deb, .AppImage, others
  const order: InstallerFile['platform'][] = ['windows', 'linux', 'android', 'source'];
  result.sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));

  return result;
}

export function createDownloadsRouter(installersDir: string): Router {
  const router = express.Router();

  // List available installers
  router.get('/', async (_req, res) => {
    try {
      const files = await scanInstallers(installersDir);
      res.json({ files, buildStatus: await getBuildStatus(installersDir) });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Download a specific installer
  router.get('/:filename', async (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    // Safety: no path traversal
    if (filename.includes('/') || filename.includes('..')) {
      return void res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(installersDir, filename);
    if (!(await fsExtra.pathExists(filePath))) {
      return void res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  });

  return router;
}

/** Returns build status metadata from the build log file, if present */
async function getBuildStatus(
  dir: string,
): Promise<{ builtAt?: string; log?: string; building?: boolean }> {
  const logPath = path.join(dir, 'build.log');
  const stampPath = path.join(dir, 'build-complete.txt');
  const buildingPath = path.join(dir, 'building.lock');

  const building = await fsExtra.pathExists(buildingPath);
  const builtAt = (await fsExtra.pathExists(stampPath))
    ? (await fsExtra.readFile(stampPath, 'utf8')).trim()
    : undefined;
  const log = (await fsExtra.pathExists(logPath))
    ? (await fsExtra.readFile(logPath, 'utf8')).slice(-3000)
    : undefined;

  return { builtAt, log, building };
}
