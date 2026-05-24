import { AnimatePresence, motion } from 'framer-motion';
import {
  Apple,
  CheckCircle,
  ChevronDown,
  Download,
  Loader,
  Monitor,
  Package,
  RefreshCw,
  Smartphone,
  Terminal,
  TriangleAlert,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Page } from '../App.js';
import { api, type DownloadsResponse, type InstallerFile } from '../api/client.js';

interface Props {
  navigate: (p: Page) => void;
}

// ── OS detection ──────────────────────────────────────────────────────────────
type OsHint = 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'unknown';

function detectOs(): OsHint {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/windows/.test(ua)) return 'windows';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/linux/.test(ua)) return 'linux';
  return 'unknown';
}

// ── PWA install support ───────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function usePwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
  }, [prompt]);

  return { prompt, installed, install };
}

// ── Platform icons ────────────────────────────────────────────────────────────
const PLATFORM_ICONS: Record<InstallerFile['platform'] | 'android' | 'ios' | 'macos', React.ReactNode> = {
  windows: <Monitor size={20} />,
  linux:   <Terminal size={20} />,
  android: <Smartphone size={20} />,
  ios:     <Apple size={20} />,
  macos:   <Apple size={20} />,
  source:  <Package size={20} />,
};

const PLATFORM_COLORS: Record<InstallerFile['platform'], string> = {
  windows: 'text-sky-400    bg-sky-400/10    border-sky-400/20',
  linux:   'text-amber-400  bg-amber-400/10  border-amber-400/20',
  android: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  source:  'text-white/40   bg-white/5       border-white/10',
};

// ── Log accordion ─────────────────────────────────────────────────────────────
function BuildLog({ log }: { log: string }) {
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, log]);

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/50 hover:text-white/70 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Terminal size={13} />
          Build log
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 240 }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <pre className="font-mono text-[11px] leading-5 p-4 h-60 overflow-y-auto text-white/50 bg-black/30">
              {log || '(empty)'}
              <div ref={bottomRef} />
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Single installer card ─────────────────────────────────────────────────────
function InstallerCard({ file, highlight }: { file: InstallerFile; highlight: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const colorClass = PLATFORM_COLORS[file.platform];

  const handleDownload = () => {
    setDownloading(true);
    // Trigger download via anchor
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => { setDownloading(false); setDone(true); }, 1500);
    setTimeout(() => setDone(false), 5000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative card flex items-center gap-4 transition-all duration-300
        ${highlight ? 'border-aurora-purple/30 bg-aurora-purple/[0.04]' : ''}`}
    >
      {highlight && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-aurora-purple px-2.5 py-0.5 text-[10px] font-semibold text-white">
          Recommended for your OS
        </span>
      )}

      {/* Platform icon */}
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}>
        {PLATFORM_ICONS[file.platform]}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{file.label}</p>
        <p className="text-xs text-white/40 mt-0.5">{file.description}</p>
        <p className="text-[11px] text-white/25 mt-1 font-mono">
          {file.filename} · {file.sizeHuman}
        </p>
      </div>

      {/* Download button */}
      <button
        className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
          ${highlight
            ? 'btn-primary'
            : 'btn-ghost hover:border-aurora-purple/30'
          }`}
        onClick={handleDownload}
        disabled={downloading}
      >
        {done ? (
          <><CheckCircle size={14} className="text-emerald-400" /> Saved</>
        ) : downloading ? (
          <><Loader size={14} className="animate-spin" /> Downloading…</>
        ) : (
          <><Download size={14} /> Download</>
        )}
      </button>
    </motion.div>
  );
}

// ── PWA install card ──────────────────────────────────────────────────────────
function AndroidPwaCard({ os }: { os: OsHint }) {
  const { prompt, installed, install } = usePwaInstall();
  const highlight = os === 'android' || os === 'ios';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative card flex items-center gap-4 transition-all duration-300
        ${highlight ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : ''}`}
    >
      {highlight && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-semibold text-white">
          Recommended for your device
        </span>
      )}

      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
        <Smartphone size={20} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">Android / iOS — Web App (PWA)</p>
        <p className="text-xs text-white/40 mt-0.5">
          Install directly from your browser — no app store needed. Works offline.
        </p>
        <p className="text-[11px] text-white/25 mt-1">
          Chrome → menu → &quot;Add to Home Screen&quot; · Safari → Share → &quot;Add to Home Screen&quot;
        </p>
      </div>

      {installed ? (
        <span className="shrink-0 flex items-center gap-1.5 text-sm text-emerald-400">
          <CheckCircle size={14} /> Installed
        </span>
      ) : prompt ? (
        <button
          className="shrink-0 btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
          onClick={() => void install()}
        >
          <Download size={14} />
          Install
        </button>
      ) : (
        <span className="shrink-0 text-xs text-white/30 max-w-[140px] text-right leading-tight">
          Open in Chrome/Safari on your phone to install
        </span>
      )}
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Downloads({ navigate: _navigate }: Props) {
  const [data, setData] = useState<DownloadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const os = useMemo(detectOs, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.downloads();
      setData(res);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Auto-refresh every 5 s while a build is in progress
  useEffect(() => {
    if (!data?.buildStatus.building) return;
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [data?.buildStatus.building, load]);

  const files = data?.buildStatus.building
    ? [] // still building
    : (data?.files ?? []);

  const highlight = (f: InstallerFile) => {
    if (os === 'windows' && f.platform === 'windows') return true;
    if ((os === 'linux') && f.platform === 'linux' && f.ext === 'AppImage') return true;
    return false;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold gradient-text">Download</h1>
        <p className="mt-2 text-white/50 text-sm">
          Install OpenGame Studio as a native app on your device.
          All installers are built automatically on the server — no cloud account needed.
        </p>
      </div>

      {/* Build status banner */}
      {data?.buildStatus.building && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card flex items-center gap-3 border-amber-500/20 bg-amber-500/[0.04]"
        >
          <Loader size={16} className="animate-spin text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400">Building installers…</p>
            <p className="text-xs text-white/40 mt-0.5">
              This runs once after deployment. Refresh in a minute.
            </p>
          </div>
          <button className="ml-auto btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5"
            onClick={() => void load()}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </motion.div>
      )}

      {data?.buildStatus.builtAt && !data.buildStatus.building && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card flex items-center gap-2 border-emerald-500/20 bg-emerald-500/[0.03] py-3"
        >
          <CheckCircle size={14} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-white/50">
            Installers built at{' '}
            <span className="text-white/70">
              {new Date(data.buildStatus.builtAt).toLocaleString()}
            </span>
          </p>
        </motion.div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-16 text-white/30">
          <Loader size={20} className="animate-spin mr-3" />
          Loading…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-500/20 bg-red-500/5 flex items-center gap-2 text-sm text-red-400">
          <TriangleAlert size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Installer cards */}
      {!loading && !error && (
        <div className="space-y-4">
          {/* Server-built installers */}
          {files.length > 0 ? (
            <>
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                Desktop Installers
              </h2>
              <div className="space-y-4">
                {files.map((f) => (
                  <InstallerCard key={f.filename} file={f} highlight={highlight(f)} />
                ))}
              </div>
            </>
          ) : !data?.buildStatus.building && (
            <div className="card text-sm text-white/40 text-center py-8">
              No desktop installers found yet. The build may still be running —
              check back in a minute or inspect the{' '}
              <code className="text-aurora-cyan text-xs">installer-builder</code> Docker
              service logs.
            </div>
          )}

          {/* Android / PWA */}
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider pt-2">
            Mobile / Browser
          </h2>
          <AndroidPwaCard os={os} />
        </div>
      )}

      {/* Build log accordion */}
      {data?.buildStatus.log && (
        <BuildLog log={data.buildStatus.log} />
      )}

      {/* Manual rebuild hint */}
      <div className="card bg-transparent border-dashed border-white/[0.06] text-xs text-white/30 space-y-1 py-4">
        <p className="font-medium text-white/40">Force a rebuild</p>
        <p>
          Run{' '}
          <code className="text-aurora-cyan">
            docker compose run --rm installer-builder
          </code>{' '}
          on the server to rebuild all installers.
        </p>
      </div>
    </div>
  );
}
