import { motion } from 'framer-motion';
import { Clock, Play, Trash2, TriangleAlert, Zap } from 'lucide-react';
import React from 'react';
import type { Page } from '../App.js';
import type { GameRecord } from '../api/client.js';
import { gameUrl } from '../api/client.js';

interface Props {
  game: GameRecord;
  navigate: (p: Page) => void;
  onDelete: (id: string) => void;
}

function StatusBadge({ status }: { status: GameRecord['status'] }) {
  if (status === 'running')
    return (
      <span className="status-badge status-running">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        Generating
      </span>
    );
  if (status === 'done')
    return (
      <span className="status-badge status-done">
        <Zap size={10} />
        Ready
      </span>
    );
  return (
    <span className="status-badge status-error">
      <TriangleAlert size={10} />
      Error
    </span>
  );
}

export default function GameCard({ game, navigate, onDelete }: Props) {
  const url = gameUrl(game);
  const ago = React.useMemo(() => {
    const ms = Date.now() - new Date(game.createdAt).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [game.createdAt]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="card game-card-hover relative group overflow-hidden"
    >
      {/* Thumbnail / placeholder */}
      <div className="relative w-full h-36 mb-4 rounded-lg overflow-hidden bg-surface-soft flex items-center justify-center">
        {url ? (
          <iframe
            src={url}
            className="w-full h-full pointer-events-none scale-[0.5] origin-top-left"
            style={{ width: '200%', height: '200%' }}
            title="Game preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/20">
            <Zap size={28} />
            <span className="text-xs">
              {game.status === 'running' ? 'Generating…' : 'No preview'}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        {url && (
          <div className="game-card-overlay absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-200 flex items-center justify-center">
            <button
              className="btn-primary text-sm py-2 px-5 flex items-center gap-2"
              onClick={() => navigate({ name: 'game', id: game.id })}
            >
              <Play size={14} />
              Play
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white line-clamp-2 leading-snug mb-1.5">
            {game.prompt}
          </p>
          <div className="flex items-center gap-2">
            <StatusBadge status={game.status} />
            <span className="flex items-center gap-1 text-[11px] text-white/30">
              <Clock size={10} />
              {ago}
            </span>
          </div>
        </div>

        {/* Delete */}
        <button
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(game.id);
          }}
          title="Delete game"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Error message */}
      {game.status === 'error' && game.error && (
        <p className="mt-2 text-xs text-red-400/80 line-clamp-2">
          {game.error}
        </p>
      )}
    </motion.div>
  );
}
