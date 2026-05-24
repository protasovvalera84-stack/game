import { AnimatePresence, motion } from 'framer-motion';
import { Loader, SendHorizonal, Sparkles, Wand2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface Props {
  onSubmit: (prompt: string) => void;
  loading?: boolean;
  placeholder?: string;
}

const EXAMPLES = [
  'Build a top-down zombie survival game with upgradeable weapons',
  'Create a retro pixel art platformer with double-jump and wall slides',
  'Make a tower defense game with 5 different enemy types',
  'Design a match-3 puzzle game with combo explosions and power-ups',
  'Build a space shooter with boss fights and procedural asteroids',
  'Create a card battler RPG set in a cyberpunk city',
];

export default function PromptInput({ onSubmit, loading, placeholder }: Props) {
  const [value, setValue] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || loading) return;
      onSubmit(trimmed);
    },
    [value, loading, onSubmit],
  );

  const handleExample = (ex: string) => {
    setValue(ex);
    setShowExamples(false);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="glass-strong rounded-2xl p-1 ring-1 ring-white/[0.06] focus-within:ring-aurora-purple/30 transition-all duration-300">
          <div className="flex items-start gap-3 p-3">
            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-aurora-purple/15 text-aurora-purple">
              <Wand2 size={14} />
            </span>
            <textarea
              className="min-h-[80px] flex-1 resize-none bg-transparent text-white placeholder-white/25 outline-none text-sm leading-relaxed"
              placeholder={placeholder ?? 'Describe the game you want to create…'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  void handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between px-4 pb-3">
            {/* Examples toggle */}
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-aurora-purple transition-colors duration-150"
              onClick={() => setShowExamples((v) => !v)}
            >
              <Sparkles size={12} />
              Examples
            </button>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/20">
                {value.length} chars · Ctrl+Enter
              </span>
              <button
                type="submit"
                disabled={!value.trim() || loading}
                className="btn-primary flex items-center gap-2 py-2 px-5 text-sm"
              >
                {loading ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <SendHorizonal size={14} />
                )}
                {loading ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Example prompts */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => handleExample(ex)}
                className="text-left px-4 py-2.5 rounded-xl glass text-xs text-white/60 hover:text-white hover:border-aurora-purple/20 transition-all duration-150 line-clamp-2"
              >
                {ex}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
