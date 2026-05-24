import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ExternalLink,
  Loader,
  Maximize2,
  Minimize2,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Page } from '../App.js';
import { api, gameUrl, type GameRecord } from '../api/client.js';

interface Props {
  id: string;
  navigate: (p: Page) => void;
}

export default function GameView({ id, navigate }: Props) {
  const [game, setGame] = useState<GameRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getGame(id)
      .then(setGame)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    setFullscreen((v) => !v);
  };

  const url = game ? gameUrl(game) : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-white/30">
        <Loader size={24} className="animate-spin mr-3" />
        Loading game…
      </div>
    );
  }

  if (error || !game || !url) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-white/40">
        <TriangleAlert size={36} className="text-red-400/60" />
        <p>{error ?? 'Game not found or has no playable build.'}</p>
        <button
          className="btn-ghost text-sm"
          onClick={() => navigate({ name: 'gallery' })}
        >
          Back to Gallery
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 flex flex-col bg-black">
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-2.5 glass border-b border-white/[0.06] z-10"
      >
        <div className="flex items-center gap-3">
          <button
            className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-1.5"
            onClick={() => navigate({ name: 'gallery' })}
          >
            <ArrowLeft size={13} />
            Gallery
          </button>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-sm text-white/60 line-clamp-1 max-w-xs">
            {game.prompt}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-1.5"
          >
            <ExternalLink size={13} />
            Open tab
          </a>
          <button
            className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-1.5"
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {fullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </motion.div>

      {/* Game iframe */}
      <iframe
        ref={iframeRef}
        src={url}
        className="flex-1 w-full border-0"
        title={game.prompt}
        allow="fullscreen; autoplay"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      />
    </div>
  );
}
