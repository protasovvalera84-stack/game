import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  Gamepad2,
  Images,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useEffect } from 'react';
import type { Page } from '../App.js';
import GenerationLog from '../components/GenerationLog.js';
import PromptInput from '../components/PromptInput.js';
import { useGeneration } from '../hooks/useGeneration.js';

interface Props {
  navigate: (p: Page) => void;
  initialPrompt?: string;
}

export default function Generate({ navigate, initialPrompt }: Props) {
  const { state, start, reset } = useGeneration();

  // Auto-start if a prompt was passed in (from Home page)
  useEffect(() => {
    if (initialPrompt && state.status === 'idle') {
      void start(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isIdle = state.status === 'idle';
  const isDone = state.status === 'done';
  const isRunning = state.status === 'running';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          className="btn-ghost py-2 px-3 flex items-center gap-1.5 text-sm"
          onClick={() => navigate({ name: 'home' })}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="h-5 w-px bg-white/10" />
        <h1 className="text-xl font-bold gradient-text">Game Generator</h1>
      </div>

      {/* Idle: show full prompt input */}
      {isIdle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Sparkles size={14} className="text-aurora-purple" />
              Describe your game
            </div>
            <PromptInput
              onSubmit={(prompt) => void start(prompt)}
              loading={isRunning}
            />
          </div>
        </motion.div>
      )}

      {/* Active or done: show prompt summary + log */}
      {!isIdle && (
        <div className="space-y-5">
          {/* Prompt recap */}
          <div className="card flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-aurora-purple/15 text-aurora-purple mt-0.5">
              <Sparkles size={13} />
            </span>
            <div>
              <p className="text-xs text-white/30 mb-0.5">Prompt</p>
              <p className="text-sm text-white leading-relaxed">
                {state.id ? (
                  <>
                    {/* Show the prompt from the logs or directly from state */}
                    {state.logs
                      .find((l) => l.includes('Starting generation'))
                      ? state.logs[0]?.replace('[server] ', '')
                      : '…'}
                  </>
                ) : (
                  initialPrompt
                )}
              </p>
            </div>
          </div>

          {/* Generation log */}
          <GenerationLog
            logs={state.logs}
            status={state.status}
            error={state.error}
          />

          {/* Success actions */}
          {isDone && state.game && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card bg-emerald-500/[0.04] border-emerald-500/15 space-y-4"
            >
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle size={16} />
                Game ready!
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  className="btn-primary flex items-center gap-2 text-sm"
                  onClick={() =>
                    navigate({ name: 'game', id: state.game!.id })
                  }
                >
                  <Play size={14} />
                  Play Now
                </button>
                <button
                  className="btn-ghost flex items-center gap-2 text-sm"
                  onClick={() => navigate({ name: 'gallery' })}
                >
                  <Images size={14} />
                  Gallery
                </button>
                <button
                  className="btn-ghost flex items-center gap-2 text-sm"
                  onClick={reset}
                >
                  <RotateCcw size={14} />
                  New Game
                </button>
              </div>
            </motion.div>
          )}

          {/* Error actions */}
          {state.status === 'error' && (
            <div className="flex gap-3">
              <button
                className="btn-ghost flex items-center gap-2 text-sm"
                onClick={reset}
              >
                <RotateCcw size={14} />
                Try Again
              </button>
              <button
                className="btn-ghost flex items-center gap-2 text-sm"
                onClick={() => navigate({ name: 'settings' })}
              >
                <Gamepad2 size={14} />
                Check Settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
