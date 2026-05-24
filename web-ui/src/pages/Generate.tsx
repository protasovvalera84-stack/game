import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  Gamepad2,
  Images,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Page } from '../App.js';
import GenerationLog from '../components/GenerationLog.js';
import PromptInput from '../components/PromptInput.js';
import {
  getDefaultModel,
  getProvider,
  LLM_PROVIDERS,
  type ProviderPreset,
} from '../data/providers.js';
import { useGeneration } from '../hooks/useGeneration.js';

interface Props {
  navigate: (p: Page) => void;
  initialPrompt?: string;
}

// ── Read saved settings from localStorage ─────────────────────────────────────
function readSettings() {
  const get = (k: string, fb = '') => localStorage.getItem(k) ?? fb;
  return {
    providerId:    get('og.providerId',    'ollama'),
    baseUrl:       get('og.baseUrl',       'http://localhost:11434/v1'),
    apiKey:        get('og.apiKey',        ''),
    model:         get('og.model',         'qwen2.5-coder:7b'),
    imgProviderId: get('og.imgProviderId', 'none'),
    imgBaseUrl:    get('og.imgBaseUrl',    ''),
    imgApiKey:     get('og.imgApiKey',     ''),
    imgModel:      get('og.imgModel',      ''),
  };
}

// ── Inline model switcher ─────────────────────────────────────────────────────
function ModelSwitcher({
  providerId,
  model,
  baseUrl,
  onChangeProvider,
  onChangeModel,
  disabled,
}: {
  providerId: string;
  model: string;
  baseUrl: string;
  onChangeProvider: (provider: ProviderPreset) => void;
  onChangeModel: (m: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const provider = useMemo(() => getProvider(providerId), [providerId]);

  // Group providers: local first
  const groups = useMemo(() => [
    { label: 'Local (offline)', items: LLM_PROVIDERS.filter((p) => p.category === 'local') },
    { label: 'Fast & Free',     items: LLM_PROVIDERS.filter((p) => p.category === 'fast') },
    { label: 'Frontier',        items: LLM_PROVIDERS.filter((p) => p.category === 'frontier') },
    { label: 'Open models',     items: LLM_PROVIDERS.filter((p) => p.category === 'open') },
    { label: 'All-in-one',      items: LLM_PROVIDERS.filter((p) => p.category === 'aggregator') },
  ], []);

  const displayBase = baseUrl.replace(/^https?:\/\//, '').replace(/\/v1\/?$/, '');

  return (
    <div className="relative">
      {/* Trigger pill */}
      <button
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-white/[0.08]
                   hover:border-aurora-purple/30 hover:bg-aurora-purple/5
                   transition-all duration-150 text-xs disabled:opacity-50"
      >
        <span className="text-sm leading-none">{provider?.emoji ?? '🤖'}</span>
        <span className="font-medium text-white/80 max-w-[120px] truncate">
          {provider?.name ?? providerId}
        </span>
        <span className="text-white/30 max-w-[100px] truncate hidden sm:inline">
          · {model}
        </span>
        <ChevronDown
          size={12}
          className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 glass-strong rounded-2xl border border-white/[0.10]
                       shadow-2xl w-[420px] max-h-[480px] overflow-y-auto p-3 space-y-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-2">
              Switch AI provider
            </p>

            {groups.map((g) =>
              g.items.length === 0 ? null : (
                <div key={g.label}>
                  <p className="text-[10px] text-white/20 px-2 mb-1.5">{g.label}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {g.items.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onChangeProvider(p);
                          setOpen(false);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all duration-100
                          ${p.id === providerId
                            ? `${p.bgColor} ${p.color} border`
                            : 'hover:bg-white/[0.05] text-white/60 hover:text-white/80'
                          }`}
                      >
                        <span className="text-sm leading-none shrink-0">{p.emoji}</span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          {p.freeTier && (
                            <p className="text-[9px] text-emerald-400 truncate">Free tier</p>
                          )}
                        </div>
                        {p.id === providerId && (
                          <CheckCircle size={10} className="ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ),
            )}

            {/* Model selector for active provider */}
            {provider && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <p className="text-[10px] text-white/30 px-2">
                  Model for <span className={provider.color}>{provider.name}</span>
                </p>
                <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                  {provider.models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { onChangeModel(m.id); setOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors
                        ${m.id === model
                          ? 'bg-aurora-purple/15 text-aurora-purple'
                          : 'hover:bg-white/[0.05] text-white/50 hover:text-white/70'
                        }`}
                    >
                      <span className="font-mono truncate">{m.label || m.id}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {m.free && <span className="text-emerald-400 text-[9px]">free</span>}
                        {m.recommended && <Zap size={9} className="text-amber-400" />}
                        {m.id === model && <CheckCircle size={10} />}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-1 text-[10px] text-white/20 truncate">
                  Base URL: {displayBase}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Generate({ navigate, initialPrompt }: Props) {
  const { state, start, reset } = useGeneration();

  // Read saved settings on mount
  const saved = useMemo(readSettings, []);
  const [providerId, setProviderId] = useState(saved.providerId);
  const [baseUrl,    setBaseUrl]    = useState(saved.baseUrl);
  const [apiKey]                    = useState(saved.apiKey);
  const [model,      setModel]      = useState(saved.model || getDefaultModel(getProvider(saved.providerId)!));

  const selectProvider = useCallback((p: ProviderPreset) => {
    setProviderId(p.id);
    setBaseUrl(p.baseUrl);
    setModel(getDefaultModel(p));
  }, []);

  const handleStart = useCallback(
    (prompt: string) => {
      void start(prompt, model, undefined, {
        baseUrl,
        apiKey,
        imageProvider: saved.imgProviderId !== 'none' ? saved.imgProviderId : undefined,
        imageBaseUrl:  saved.imgBaseUrl || undefined,
        imageApiKey:   saved.imgApiKey  || undefined,
        imageModel:    saved.imgModel   || undefined,
      });
    },
    [start, model, baseUrl, apiKey, saved],
  );

  // Auto-start if a prompt was passed in from the Home page
  useEffect(() => {
    if (initialPrompt && state.status === 'idle') {
      handleStart(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isIdle    = state.status === 'idle';
  const isDone    = state.status === 'done';
  const isRunning = state.status === 'running';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          className="btn-ghost py-2 px-3 flex items-center gap-1.5 text-sm"
          onClick={() => navigate({ name: 'home' })}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="h-5 w-px bg-white/10" />
        <h1 className="text-xl font-bold gradient-text">Game Generator</h1>

        {/* Provider pill — always visible */}
        <div className="ml-auto flex items-center gap-2">
          <ModelSwitcher
            providerId={providerId}
            model={model}
            baseUrl={baseUrl}
            onChangeProvider={selectProvider}
            onChangeModel={setModel}
            disabled={isRunning}
          />
          <button
            className="btn-ghost py-1.5 px-3 flex items-center gap-1.5 text-xs"
            onClick={() => navigate({ name: 'settings' })}
            title="AI provider settings"
          >
            <Settings size={12} />
          </button>
        </div>
      </div>

      {/* Idle: full prompt input */}
      {isIdle && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Sparkles size={14} className="text-aurora-purple" />
              Describe your game
            </div>
            <PromptInput
              onSubmit={handleStart}
              loading={isRunning}
            />
          </div>
        </motion.div>
      )}

      {/* Active / done: prompt recap + log */}
      {!isIdle && (
        <div className="space-y-5">
          {/* Prompt recap */}
          <div className="card flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-aurora-purple/15 text-aurora-purple mt-0.5">
              <Sparkles size={13} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-white/30">Prompt</p>
                <span className="text-xs text-white/20">·</span>
                <span className="text-[10px] font-mono text-white/25 truncate">
                  {getProvider(providerId)?.emoji} {model}
                </span>
              </div>
              <p className="text-sm text-white leading-relaxed">
                {state.logs.find((l) => l.includes('Starting generation'))
                  ? state.logs[0]?.replace('[server] ', '')
                  : initialPrompt ?? '…'}
              </p>
            </div>
          </div>

          {/* Generation log */}
          <GenerationLog
            logs={state.logs}
            status={state.status}
            error={state.error}
          />

          {/* Success */}
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
                  onClick={() => navigate({ name: 'game', id: state.game!.id })}
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

          {/* Error */}
          {state.status === 'error' && (
            <div className="flex gap-3 flex-wrap">
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
