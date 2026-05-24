import { motion } from 'framer-motion';
import { CheckCircle, Loader, Terminal, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { GenStatus } from '../hooks/useGeneration.js';

interface Props {
  logs: string[];
  status: GenStatus;
  error?: string | null;
}

function classifyLine(line: string): string {
  if (line.startsWith('[server]')) return 'log-line-server';
  if (line.startsWith('[stderr]')) return 'log-line-error';
  if (/error|fail|exception/i.test(line)) return 'log-line-error';
  if (/done|complete|success|✓|✅/i.test(line)) return 'log-line-done';
  return 'log-line-info';
}

export default function GenerationLog({ logs, status, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Terminal size={13} />
          <span className="font-mono">generation log</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {status === 'running' && (
            <>
              <Loader size={12} className="animate-spin text-amber-400" />
              <span className="text-amber-400">Running</span>
            </>
          )}
          {status === 'done' && (
            <>
              <CheckCircle size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Complete</span>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={12} className="text-red-400" />
              <span className="text-red-400">Error</span>
            </>
          )}
        </div>
        {/* Traffic-light dots */}
        <div className="flex gap-1.5 ml-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
        </div>
      </div>

      {/* Log body */}
      <div className="log-terminal p-4 h-72 overflow-y-auto space-y-0.5 bg-black/20">
        {logs.length === 0 && status === 'running' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/30 flex items-center gap-2"
          >
            <Loader size={12} className="animate-spin" />
            Starting generation engine…
          </motion.div>
        )}

        {logs.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.12 }}
            className={classifyLine(line)}
          >
            <span className="text-white/20 select-none mr-2">
              {String(i + 1).padStart(3, '0')}
            </span>
            {line}
          </motion.div>
        ))}

        {status === 'running' && logs.length > 0 && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="inline-block w-2 h-3.5 bg-aurora-cyan ml-1 align-middle"
          />
        )}

        {status === 'error' && error && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
