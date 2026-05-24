import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle,
  ChevronDown,
  CloudOff,
  Gift,
  Loader,
  Save,
  TestTube,
  Zap,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { Page } from '../App.js';
import {
  CATEGORY_LABELS,
  getDefaultModel,
  getProvider,
  IMAGE_PROVIDERS,
  LLM_PROVIDERS,
  type ProviderCategory,
  type ProviderPreset,
} from '../data/providers.js';

interface Props {
  navigate: (p: Page) => void;
}

// ── Persisted config keys ─────────────────────────────────────────────────────
const KEYS = {
  providerId:    'og.providerId',
  baseUrl:       'og.baseUrl',
  apiKey:        'og.apiKey',
  model:         'og.model',
  imgProviderId: 'og.imgProviderId',
  imgBaseUrl:    'og.imgBaseUrl',
  imgApiKey:     'og.imgApiKey',
  imgModel:      'og.imgModel',
} as const;

function load(key: string, fallback = ''): string {
  return localStorage.getItem(key) ?? fallback;
}

// ── Provider card ─────────────────────────────────────────────────────────────
function ProviderCard({
  provider,
  selected,
  onClick,
}: {
  provider: ProviderPreset;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative w-full text-left rounded-2xl p-4 border transition-all duration-200
        ${selected
          ? `${provider.bgColor} ring-2 ring-offset-2 ring-offset-surface ring-current shadow-lg`
          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]'
        }
      `}
    >
      {/* Selected check */}
      {selected && (
        <span className="absolute top-3 right-3">
          <CheckCircle size={14} className={provider.color} />
        </span>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-xl leading-none">{provider.emoji}</span>
        <span className={`font-semibold text-sm ${selected ? provider.color : 'text-white/80'}`}>
          {provider.name}
        </span>
      </div>

      <p className="text-[11px] text-white/40 leading-snug">{provider.tagline}</p>

      {/* Free badge */}
      {provider.freeTier && (
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
          <Gift size={9} />
          Free tier
        </span>
      )}
    </motion.button>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function CategorySection({
  category,
  providers,
  selectedId,
  onSelect,
}: {
  category: ProviderCategory;
  providers: ProviderPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(
    () => providers.some((p) => p.id === selectedId) || category === 'frontier' || category === 'local',
  );

  return (
    <div>
      <button
        className="flex items-center gap-2 w-full mb-3 group"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="flex-1 h-px bg-white/[0.06]" />
        <ChevronDown
          size={13}
          className={`text-white/20 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 overflow-hidden"
          >
            {providers.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                selected={p.id === selectedId}
                onClick={() => onSelect(p.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Connection tester ─────────────────────────────────────────────────────────
type TestState = 'idle' | 'testing' | 'ok' | 'error';
type ErrorKind = 'balance' | 'auth' | 'model' | 'rate_limit' | 'network' | 'other';

interface TestResult {
  state: TestState;
  message: string;
  errorKind?: ErrorKind;
  hint?: string;
  hintUrl?: string;
}

/** Map HTTP status + body to a human-readable message with actionable hint. */
function interpretError(status: number, body: string): { message: string; kind: ErrorKind; hint: string; hintUrl?: string } {
  const b = body.toLowerCase();

  if (status === 402 || b.includes('insufficient') || b.includes('balance') || b.includes('quota_exceeded')) {
    return {
      kind: 'balance',
      message: 'Недостаточно баланса на аккаунте провайдера.',
      hint: 'Пополните баланс в личном кабинете или переключитесь на бесплатный провайдер (Groq, Gemini, Ollama).',
      hintUrl: undefined,
    };
  }
  if (status === 401 || b.includes('unauthorized') || b.includes('invalid api key') || b.includes('authentication')) {
    return {
      kind: 'auth',
      message: 'Неверный API ключ.',
      hint: 'Проверьте ключ в личном кабинете провайдера. Убедитесь, что скопировали его полностью без пробелов.',
    };
  }
  if (status === 404 || b.includes('model not found') || b.includes('no such model')) {
    return {
      kind: 'model',
      message: 'Модель не найдена.',
      hint: 'Выберите другую модель из списка или введите точное название из документации провайдера.',
    };
  }
  if (status === 429 || b.includes('rate limit') || b.includes('too many requests')) {
    return {
      kind: 'rate_limit',
      message: 'Слишком много запросов (rate limit).',
      hint: 'Подождите минуту и попробуйте снова. Или обновитесь до платного тарифа.',
    };
  }
  if (status === 0 || b.includes('failed to fetch') || b.includes('network')) {
    return {
      kind: 'network',
      message: 'Нет соединения с сервером.',
      hint: 'Проверьте URL провайдера. Для локальных провайдеров (Ollama) убедитесь, что он запущен.',
    };
  }
  return {
    kind: 'other',
    message: `Ошибка ${status}: ${body.slice(0, 100)}`,
    hint: 'Проверьте настройки и попробуйте снова.',
  };
}

function useConnectionTest() {
  const [result, setResult] = useState<TestResult>({ state: 'idle', message: '' });

  const test = useCallback(async (baseUrl: string, apiKey: string, model: string) => {
    setResult({ state: 'testing', message: '' });
    try {
      const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say "OK" only.' }],
          max_tokens: 10,
          stream: false,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        const { message, kind, hint, hintUrl } = interpretError(res.status, text);
        setResult({ state: 'error', message, errorKind: kind, hint, hintUrl });
        return;
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = data.choices?.[0]?.message?.content ?? '(no content)';
      setResult({ state: 'ok', message: `Подключено — модель ответила: "${reply.slice(0, 60)}"` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const { message, kind, hint } = interpretError(0, msg);
      setResult({ state: 'error', message, errorKind: kind, hint });
    }
  }, []);

  return { ...result, test };
}

// ── Model selector (with optional custom input) ───────────────────────────────
function ModelSelect({
  provider,
  value,
  onChange,
}: {
  provider: ProviderPreset;
  value: string;
  onChange: (v: string) => void;
}) {
  const isCustom = value === 'custom' || !provider.models.some((m) => m.id === value);

  return (
    <div className="space-y-2">
      <select
        className="input-field"
        value={isCustom ? 'custom' : value}
        onChange={(e) => {
          if (e.target.value === 'custom') {
            onChange('');
          } else {
            onChange(e.target.value);
          }
        }}
      >
        {provider.models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {m.recommended ? ' ★' : ''}
            {m.free ? ' (free)' : ''}
            {m.pricePer1M ? ` — $${m.pricePer1M}/1M` : ''}
          </option>
        ))}
        <option value="custom">Custom model ID…</option>
      </select>
      <AnimatePresence>
        {isCustom && (
          <motion.input
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="input-field"
            placeholder="Enter model ID, e.g. qwen2.5-coder:32b"
            value={value === 'custom' ? '' : value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Image provider selector ───────────────────────────────────────────────────
function ImageSection({
  selectedId,
  setSelectedId,
  apiKey,
  setApiKey,
  baseUrl,
  setBaseUrl,
  model,
  setModel,
}: {
  selectedId: string;
  setSelectedId: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
}) {
  const preset = IMAGE_PROVIDERS.find((p) => p.id === selectedId) ?? IMAGE_PROVIDERS[0]!;

  return (
    <div className="space-y-4">
      {/* Grid of image providers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {IMAGE_PROVIDERS.map((p) => (
          <motion.button
            key={p.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedId(p.id);
              setBaseUrl(p.baseUrl ?? '');
              setModel(p.models.find((m) => m.recommended)?.id ?? p.models[0]?.id ?? '');
            }}
            className={`
              rounded-xl p-3 text-left border transition-all duration-150
              ${selectedId === p.id
                ? `${p.bgColor} ring-1 ring-current`
                : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
              }
            `}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{p.emoji}</span>
              <span className={`text-xs font-medium truncate ${selectedId === p.id ? p.color : 'text-white/70'}`}>
                {p.name}
              </span>
            </div>
            <p className="text-[10px] text-white/30 leading-tight line-clamp-2">{p.tagline}</p>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedId !== 'none' && (
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {preset.baseUrl !== undefined && (
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">
                  Image API Base URL
                </label>
                <input
                  className="input-field"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={preset.baseUrl ?? ''}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5">
                Image API Key
              </label>
              <input
                className="input-field"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={preset.apiKeyHint || 'Not required'}
              />
            </div>
            {preset.models.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">Model</label>
                <select
                  className="input-field"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {preset.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                      {m.recommended ? ' ★' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Settings({ navigate }: Props) {
  // LLM state
  const [providerId, setProviderId] = useState(() => load(KEYS.providerId, 'ollama'));
  const [apiKey,     setApiKey]     = useState(() => load(KEYS.apiKey));
  const [model,      setModel]      = useState(() => load(KEYS.model));
  const [baseUrl,    setBaseUrl]    = useState(() => load(KEYS.baseUrl));

  // Image generation state
  const [imgProviderId, setImgProviderId] = useState(() => load(KEYS.imgProviderId, 'none'));
  const [imgApiKey,     setImgApiKey]     = useState(() => load(KEYS.imgApiKey));
  const [imgBaseUrl,    setImgBaseUrl]    = useState(() => load(KEYS.imgBaseUrl));
  const [imgModel,      setImgModel]      = useState(() => load(KEYS.imgModel));

  const [saved, setSaved] = useState(false);
  const { state: testState, message: testMsg, hint: testHint, errorKind: testErrorKind, test } = useConnectionTest();

  // When user picks a provider preset, auto-fill baseUrl + default model
  const selectProvider = useCallback((id: string) => {
    setProviderId(id);
    const preset = getProvider(id);
    if (!preset) return;
    setBaseUrl(preset.baseUrl);
    const def = getDefaultModel(preset);
    setModel(def);
  }, []);

  const activeProvider = useMemo(() => getProvider(providerId), [providerId]);

  // Effective base URL (user may have overridden it)
  const effectiveBaseUrl = baseUrl || (activeProvider?.baseUrl ?? '');

  // Group providers by category
  const byCategory = useMemo(() => {
    const order: ProviderCategory[] = ['frontier', 'fast', 'open', 'aggregator', 'local'];
    const map = new Map<ProviderCategory, ProviderPreset[]>();
    for (const cat of order) map.set(cat, []);
    for (const p of LLM_PROVIDERS) {
      map.get(p.category)?.push(p);
    }
    return order.map((cat) => ({ cat, providers: map.get(cat) ?? [] }));
  }, []);

  const handleSave = () => {
    localStorage.setItem(KEYS.providerId,    providerId);
    localStorage.setItem(KEYS.baseUrl,       effectiveBaseUrl);
    localStorage.setItem(KEYS.apiKey,        apiKey);
    localStorage.setItem(KEYS.model,         model);
    localStorage.setItem(KEYS.imgProviderId, imgProviderId);
    localStorage.setItem(KEYS.imgBaseUrl,    imgBaseUrl);
    localStorage.setItem(KEYS.imgApiKey,     imgApiKey);
    localStorage.setItem(KEYS.imgModel,      imgModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          className="btn-ghost py-2 px-3 flex items-center gap-1.5 text-sm"
          onClick={() => navigate({ name: 'home' })}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="h-5 w-px bg-white/10" />
        <h1 className="text-xl font-bold text-white">AI Providers</h1>
      </div>

      {/* ── Section: LLM ───────────────────────────────────────────────────── */}
      <section className="card space-y-6">
        <div>
          <h2 className="font-bold text-white text-base">Language Model</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Used by the agent to write game code. Pick any provider below.
          </p>
        </div>

        {/* Provider grid by category */}
        <div>
          {byCategory.map(({ cat, providers }) =>
            providers.length === 0 ? null : (
              <CategorySection
                key={cat}
                category={cat}
                providers={providers}
                selectedId={providerId}
                onSelect={selectProvider}
              />
            ),
          )}
        </div>

        {/* Active provider config ────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeProvider && (
            <motion.div
              key={providerId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border p-5 space-y-4 ${activeProvider.bgColor}`}
            >
              {/* Provider header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activeProvider.emoji}</span>
                  <span className={`font-bold ${activeProvider.color}`}>{activeProvider.name}</span>
                </div>
                {activeProvider.signupUrl && (
                  <a
                    href={activeProvider.signupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    Get API key <ArrowUpRight size={11} />
                  </a>
                )}
              </div>

              {/* Offline notice for local providers */}
              {activeProvider.category === 'local' && (
                <div className="flex items-start gap-2 text-xs text-white/50 bg-white/[0.04] rounded-lg p-3">
                  <CloudOff size={13} className="shrink-0 mt-0.5 text-teal-400" />
                  <span>
                    Runs entirely on your machine — no internet required.
                    {activeProvider.id === 'ollama' && (
                      <> Run <code className="text-teal-300">ollama pull {model || 'qwen2.5-coder:7b'}</code> first.</>
                    )}
                  </span>
                </div>
              )}

              {/* Free tier notice */}
              {activeProvider.freeTier && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <Gift size={12} />
                  {activeProvider.freeTier}
                </div>
              )}

              {/* Base URL (shown only for non-fixed providers) */}
              {!activeProvider.baseUrlFixed && (
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-white/40">Base URL</span>
                  <input
                    className="input-field"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={activeProvider.baseUrl}
                  />
                </label>
              )}

              {/* API Key */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-white/40">API Key</span>
                <input
                  className="input-field"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={activeProvider.apiKeyRequired ? activeProvider.apiKeyHint : 'Not required (local)'}
                />
              </label>

              {/* Model */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-white/40">Model</span>
                <ModelSelect
                  provider={activeProvider}
                  value={model || getDefaultModel(activeProvider)}
                  onChange={setModel}
                />
              </label>

              {/* Test connection */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <button
                    className="btn-ghost flex items-center gap-2 text-xs py-2 px-4"
                    disabled={testState === 'testing'}
                    onClick={() =>
                      void test(effectiveBaseUrl, apiKey, model || getDefaultModel(activeProvider))
                    }
                  >
                    {testState === 'testing' ? (
                      <Loader size={12} className="animate-spin" />
                    ) : (
                      <TestTube size={12} />
                    )}
                    {testState === 'testing' ? 'Проверяю…' : 'Проверить соединение'}
                  </button>

                  <AnimatePresence>
                    {testMsg && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className={`text-xs font-medium ${testState === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {testState === 'ok' ? '✓' : '✗'} {testMsg}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Hint block — shown on error */}
                <AnimatePresence>
                  {testState === 'error' && testHint && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-2"
                    >
                      <p className="text-xs text-amber-300">{testHint}</p>

                      {/* Suggest free providers when balance/auth error */}
                      {(testErrorKind === 'balance' || testErrorKind === 'auth') && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="text-[10px] text-white/30">Бесплатные альтернативы:</span>
                          {(['ollama', 'groq', 'google'] as const).map((id) => {
                            const p = getProvider(id);
                            if (!p) return null;
                            return (
                              <button
                                key={id}
                                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg glass hover:bg-white/10 transition-colors"
                                onClick={() => selectProvider(id)}
                              >
                                <span>{p.emoji}</span>
                                <span className={p.color}>{p.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Section: Image Generation ───────────────────────────────────────── */}
      <section className="card space-y-4">
        <div>
          <h2 className="font-bold text-white text-base">Image Generation</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Generates sprites, backgrounds, and tilesets for your games.
            Select <strong className="text-white/60">None</strong> for text-only games.
          </p>
        </div>
        <ImageSection
          selectedId={imgProviderId}
          setSelectedId={setImgProviderId}
          apiKey={imgApiKey}
          setApiKey={setImgApiKey}
          baseUrl={imgBaseUrl}
          setBaseUrl={setImgBaseUrl}
          model={imgModel}
          setModel={setImgModel}
        />
      </section>

      {/* ── Quick reference ─────────────────────────────────────────────────── */}
      <section className="card bg-transparent border-dashed space-y-3">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
          <Zap size={12} className="text-aurora-purple" />
          Recommended combos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              title: 'Free & offline',
              llm: 'Ollama + qwen2.5-coder:7b',
              img: 'None',
              note: 'Works on any PC, no internet',
            },
            {
              title: 'Best quality',
              llm: 'Claude 3.5 Sonnet (OpenRouter)',
              img: 'fal.ai Flux',
              note: 'Highest code + image quality',
            },
            {
              title: 'Fastest & cheapest',
              llm: 'Groq Llama 3.3 70B (free)',
              img: 'DALL-E 3',
              note: 'Sub-second LLM, great images',
            },
            {
              title: 'Best value',
              llm: 'DeepSeek-Coder V2',
              img: 'fal.ai Flux Schnell',
              note: '$0.14/M tokens, fast images',
            },
          ].map((c) => (
            <div key={c.title} className="glass rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-white/70">{c.title}</p>
              <p className="text-[11px] text-white/40">
                LLM: <span className="text-aurora-cyan">{c.llm}</span>
              </p>
              <p className="text-[11px] text-white/40">
                Images: <span className="text-aurora-purple">{c.img}</span>
              </p>
              <p className="text-[10px] text-white/25 italic">{c.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Save button ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-4">
        <AnimatePresence>
          {saved && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-sm text-emerald-400"
            >
              <CheckCircle size={14} />
              Saved
            </motion.span>
          )}
        </AnimatePresence>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleSave}
        >
          <Save size={14} />
          Save settings
        </button>
      </div>
    </div>
  );
}
