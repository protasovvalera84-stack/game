import { AnimatePresence, motion } from 'framer-motion';
import { Gamepad2, Loader, Plus, RefreshCw } from 'lucide-react';
import type { Page } from '../App.js';
import GameCard from '../components/GameCard.js';
import { useGames } from '../hooks/useGames.js';

interface Props {
  navigate: (p: Page) => void;
}

export default function Gallery({ navigate }: Props) {
  const { games, loading, error, refresh, remove } = useGames();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Gallery</h1>
          <p className="text-sm text-white/40 mt-1">
            {games.length} game{games.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-ghost flex items-center gap-2 text-sm py-2"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
            onClick={() => navigate({ name: 'generate' })}
          >
            <Plus size={14} />
            New Game
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && games.length === 0 && (
        <div className="flex items-center justify-center py-24 text-white/30">
          <Loader size={20} className="animate-spin mr-3" />
          Loading games…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-500/20 bg-red-500/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && games.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-28 text-center space-y-4"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl glass">
            <Gamepad2 size={28} className="text-white/30" />
          </span>
          <p className="text-white/40 text-sm">
            No games yet. Create your first one!
          </p>
          <button
            className="btn-primary text-sm py-2 px-5"
            onClick={() => navigate({ name: 'generate' })}
          >
            Create Game
          </button>
        </motion.div>
      )}

      {/* Grid */}
      {games.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence>
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                navigate={navigate}
                onDelete={(id) => void remove(id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
