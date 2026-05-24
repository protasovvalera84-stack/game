/**
 * AI provider presets — all major LLM & image-generation providers.
 *
 * Every LLM entry uses the OpenAI-compatible chat completions API so a single
 * client can talk to any provider by changing baseUrl + apiKey + model.
 *
 * Image generation entries use the OpenAI-compatible POST /images/generations
 * shape (provider = 'openai-compat'), or the named providers supported by
 * OpenGame (tongyi | doubao).
 */

export type ProviderCategory =
  | 'frontier'   // Top-tier cloud API
  | 'fast'       // Sub-second inference, quantised / smaller models
  | 'open'       // Open-weights models via cloud API
  | 'local'      // Runs entirely on the user's machine
  | 'aggregator' // Single key → 100+ models

export interface ModelOption {
  id: string;
  label: string;
  /** Rough context window in tokens */
  context?: number;
  /** Highlighted as a good default for game code */
  recommended?: boolean;
  /** Approximate price per 1 M output tokens (USD) — informational only */
  pricePer1M?: number;
  free?: boolean;
}

export interface ProviderPreset {
  id: string;
  name: string;
  category: ProviderCategory;
  /** Short tagline shown on the card */
  tagline: string;
  baseUrl: string;
  apiKeyRequired: boolean;
  /** Placeholder text for the API-key input */
  apiKeyHint: string;
  /** Where to get an API key */
  signupUrl?: string;
  color: string;            // Tailwind text-* colour token used for accent
  bgColor: string;          // Tailwind bg-*/border-* colour token
  emoji: string;            // Card icon fallback
  models: ModelOption[];
  /** Non-empty when this provider has a free tier */
  freeTier?: string;
  /** If true, users must NOT set a base URL — already pre-filled */
  baseUrlFixed?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM Providers
// ─────────────────────────────────────────────────────────────────────────────

export const LLM_PROVIDERS: ProviderPreset[] = [
  // ── Frontier ──────────────────────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'frontier',
    tagline: 'GPT-4o, o3-mini — industry standard',
    baseUrl: 'https://api.openai.com/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'sk-…',
    signupUrl: 'https://platform.openai.com/signup',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    emoji: '🤖',
    models: [
      { id: 'gpt-4o',        label: 'GPT-4o',       context: 128_000, recommended: true, pricePer1M: 15 },
      { id: 'gpt-4o-mini',   label: 'GPT-4o Mini',  context: 128_000, pricePer1M: 0.60 },
      { id: 'o3-mini',       label: 'o3-mini',       context: 200_000, pricePer1M: 4.40 },
      { id: 'o1-mini',       label: 'o1-mini',       context: 128_000, pricePer1M: 12 },
      { id: 'gpt-4-turbo',   label: 'GPT-4 Turbo',  context: 128_000, pricePer1M: 30 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'frontier',
    tagline: 'Claude 3.5 — best for long code tasks',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyRequired: true,
    apiKeyHint: 'OpenRouter key (gives access to Claude)',
    signupUrl: 'https://openrouter.ai',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    emoji: '🟠',
    freeTier: 'Free credits on sign-up via OpenRouter',
    models: [
      { id: 'anthropic/claude-3-5-sonnet',       label: 'Claude 3.5 Sonnet',  context: 200_000, recommended: true },
      { id: 'anthropic/claude-3-5-haiku',        label: 'Claude 3.5 Haiku',   context: 200_000 },
      { id: 'anthropic/claude-3-opus',           label: 'Claude 3 Opus',       context: 200_000 },
      { id: 'anthropic/claude-3-haiku',          label: 'Claude 3 Haiku',      context: 200_000 },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    category: 'frontier',
    tagline: 'Gemini 2.0 — 1 M token context',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'AIza… (Google AI Studio)',
    signupUrl: 'https://aistudio.google.com',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    emoji: '💎',
    freeTier: 'Generous free quota in AI Studio',
    models: [
      { id: 'gemini-2.0-flash',         label: 'Gemini 2.0 Flash',      context: 1_000_000, recommended: true, free: true },
      { id: 'gemini-2.0-flash-lite',    label: 'Gemini 2.0 Flash Lite', context: 1_000_000, free: true },
      { id: 'gemini-1.5-pro',           label: 'Gemini 1.5 Pro',        context: 2_000_000 },
      { id: 'gemini-1.5-flash',         label: 'Gemini 1.5 Flash',      context: 1_000_000, free: true },
    ],
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    category: 'frontier',
    tagline: 'Grok 3 — real-time knowledge',
    baseUrl: 'https://api.x.ai/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'xai-…',
    signupUrl: 'https://console.x.ai',
    color: 'text-white',
    bgColor: 'bg-white/10 border-white/20',
    emoji: '𝕏',
    models: [
      { id: 'grok-3',        label: 'Grok 3',       context: 131_072, recommended: true },
      { id: 'grok-3-mini',   label: 'Grok 3 Mini',  context: 131_072 },
      { id: 'grok-2-1212',   label: 'Grok 2',       context: 131_072 },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    category: 'frontier',
    tagline: 'DeepSeek-V3 — top code model',
    baseUrl: 'https://api.deepseek.com',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'sk-…',
    signupUrl: 'https://platform.deepseek.com',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 border-violet-500/20',
    emoji: '🌊',
    freeTier: '$5 free credits on sign-up',
    models: [
      { id: 'deepseek-coder',         label: 'DeepSeek Coder V2',  context: 128_000, recommended: true, pricePer1M: 0.14 },
      { id: 'deepseek-chat',          label: 'DeepSeek-V3',        context: 64_000,  pricePer1M: 0.14 },
      { id: 'deepseek-reasoner',      label: 'DeepSeek R1',        context: 64_000,  pricePer1M: 2.19 },
    ],
  },

  // ── Fast inference ─────────────────────────────────────────────────────────
  {
    id: 'groq',
    name: 'Groq',
    category: 'fast',
    tagline: 'LPU chip — fastest inference, free tier',
    baseUrl: 'https://api.groq.com/openai/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'gsk_…',
    signupUrl: 'https://console.groq.com',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    emoji: '⚡',
    freeTier: 'Generous free tier — great for testing',
    models: [
      { id: 'llama-3.3-70b-versatile',           label: 'Llama 3.3 70B',        context: 128_000, recommended: true, free: true },
      { id: 'llama-3.1-8b-instant',              label: 'Llama 3.1 8B (fast)',   context: 128_000, free: true },
      { id: 'mixtral-8x7b-32768',                label: 'Mixtral 8x7B',         context: 32_768,  free: true },
      { id: 'gemma2-9b-it',                      label: 'Gemma 2 9B',           context: 8_192,   free: true },
      { id: 'qwen-qwq-32b',                      label: 'Qwen QwQ 32B',         context: 128_000 },
    ],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    category: 'fast',
    tagline: 'Wafer-scale chip — 1000+ tokens/sec',
    baseUrl: 'https://api.cerebras.ai/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'csk-…',
    signupUrl: 'https://cloud.cerebras.ai',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    emoji: '🧠',
    freeTier: 'Free tier available',
    models: [
      { id: 'llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B', context: 128_000, recommended: true, free: true },
      { id: 'llama-3.3-70b',                  label: 'Llama 3.3 70B',     context: 128_000, free: true },
      { id: 'qwen-3-32b',                     label: 'Qwen 3 32B',        context: 32_000,  free: true },
    ],
  },

  // ── Open-weight cloud ──────────────────────────────────────────────────────
  {
    id: 'mistral',
    name: 'Mistral AI',
    category: 'open',
    tagline: 'Codestral — dedicated code model',
    baseUrl: 'https://api.mistral.ai/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'mistral key',
    signupUrl: 'https://console.mistral.ai',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 border-sky-500/20',
    emoji: '🌬️',
    freeTier: 'Codestral free during preview',
    models: [
      { id: 'codestral-latest',       label: 'Codestral (code)',   context: 256_000, recommended: true },
      { id: 'mistral-large-latest',   label: 'Mistral Large',      context: 128_000 },
      { id: 'mistral-small-latest',   label: 'Mistral Small',      context: 128_000 },
      { id: 'open-mistral-nemo',      label: 'Mistral Nemo',       context: 128_000 },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    category: 'open',
    tagline: '150+ open models, fast & cheap',
    baseUrl: 'https://api.together.xyz/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'together key',
    signupUrl: 'https://api.together.ai',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/20',
    emoji: '🤝',
    freeTier: '$1 free credit on sign-up',
    models: [
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen2.5-Coder 32B', context: 32_768, recommended: true },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo', context: 128_000 },
      { id: 'deepseek-ai/DeepSeek-V3',          label: 'DeepSeek-V3',        context: 64_000 },
      { id: 'codellama/CodeLlama-70b-Instruct-hf', label: 'CodeLlama 70B',   context: 4_096 },
    ],
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    category: 'fast',
    tagline: 'Optimised serving for open models',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'fw_…',
    signupUrl: 'https://fireworks.ai',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    emoji: '🔥',
    freeTier: '$1 free credit on sign-up',
    models: [
      { id: 'accounts/fireworks/models/deepseek-coder-v2-instruct', label: 'DeepSeek Coder V2', context: 128_000, recommended: true },
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',    label: 'Llama 3.3 70B',      context: 131_072 },
      { id: 'accounts/fireworks/models/qwen2p5-coder-32b-instruct', label: 'Qwen2.5-Coder 32B', context: 32_768 },
    ],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    category: 'open',
    tagline: '300k+ models, free inference API',
    baseUrl: 'https://api-inference.huggingface.co/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'hf_…',
    signupUrl: 'https://huggingface.co/settings/tokens',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-400/10 border-yellow-400/20',
    emoji: '🤗',
    freeTier: 'Free tier — rate-limited',
    models: [
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen2.5-Coder 32B', context: 32_768, recommended: true, free: true },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B',    context: 128_000, free: true },
      { id: 'mistralai/Codestral-22B-v0.1',      label: 'Codestral 22B',     context: 32_768,  free: true },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    category: 'open',
    tagline: 'Sonar — with live web search',
    baseUrl: 'https://api.perplexity.ai',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'pplx-…',
    signupUrl: 'https://www.perplexity.ai/settings/api',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    emoji: '🔍',
    models: [
      { id: 'sonar-pro',           label: 'Sonar Pro (web search)', context: 200_000, recommended: true },
      { id: 'sonar',               label: 'Sonar',                  context: 127_072 },
      { id: 'r1-1776',             label: 'R1-1776 (reasoning)',     context: 128_000 },
    ],
  },
  {
    id: 'novita',
    name: 'Novita AI',
    category: 'fast',
    tagline: '200+ models at low cost',
    baseUrl: 'https://api.novita.ai/v3/openai',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'novita key',
    signupUrl: 'https://novita.ai',
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/10 border-fuchsia-500/20',
    emoji: '🌌',
    freeTier: '$0.50 free credit',
    models: [
      { id: 'qwen/qwen2.5-coder-32b-instruct', label: 'Qwen2.5-Coder 32B', context: 32_768, recommended: true },
      { id: 'deepseek/deepseek-v3',             label: 'DeepSeek-V3',       context: 64_000 },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B',   context: 128_000 },
    ],
  },

  // ── Aggregator ─────────────────────────────────────────────────────────────
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'aggregator',
    tagline: '1 key → 300+ models (Claude, GPT, Gemini…)',
    baseUrl: 'https://openrouter.ai/api/v1',
    baseUrlFixed: true,
    apiKeyRequired: true,
    apiKeyHint: 'sk-or-…',
    signupUrl: 'https://openrouter.ai/keys',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    emoji: '🔀',
    freeTier: 'Many free models available',
    models: [
      { id: 'anthropic/claude-3-5-sonnet',           label: 'Claude 3.5 Sonnet',      context: 200_000, recommended: true },
      { id: 'google/gemini-2.0-flash-exp:free',      label: 'Gemini 2.0 Flash (free)', context: 1_000_000, free: true },
      { id: 'deepseek/deepseek-coder',               label: 'DeepSeek Coder',          context: 128_000 },
      { id: 'qwen/qwen-2.5-coder-32b-instruct',      label: 'Qwen2.5-Coder 32B',       context: 32_768 },
      { id: 'meta-llama/llama-3.3-70b-instruct',     label: 'Llama 3.3 70B',           context: 128_000 },
      { id: 'mistralai/codestral-latest',            label: 'Codestral',               context: 256_000 },
      { id: 'openai/gpt-4o',                         label: 'GPT-4o',                  context: 128_000 },
      { id: 'x-ai/grok-3-mini-beta',                 label: 'Grok 3 Mini',             context: 131_072 },
    ],
  },

  // ── Local ──────────────────────────────────────────────────────────────────
  {
    id: 'ollama',
    name: 'Ollama',
    category: 'local',
    tagline: 'Run any model offline on your machine',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyRequired: false,
    apiKeyHint: 'Leave blank',
    signupUrl: 'https://ollama.com/download',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10 border-teal-500/20',
    emoji: '🦙',
    freeTier: '100% free — runs locally',
    models: [
      { id: 'qwen2.5-coder:7b',  label: 'Qwen2.5-Coder 7B  (~4 GB)',  recommended: true, free: true },
      { id: 'qwen2.5-coder:14b', label: 'Qwen2.5-Coder 14B (~8 GB)',  free: true },
      { id: 'qwen2.5-coder:32b', label: 'Qwen2.5-Coder 32B (~20 GB)', free: true },
      { id: 'codellama:7b',      label: 'CodeLlama 7B      (~4 GB)',   free: true },
      { id: 'codellama:13b',     label: 'CodeLlama 13B     (~8 GB)',   free: true },
      { id: 'deepseek-coder-v2', label: 'DeepSeek Coder V2 (~9 GB)',   free: true },
      { id: 'llama3.3:70b',      label: 'Llama 3.3 70B     (~40 GB)', free: true },
      { id: 'custom',            label: '[ Custom model… ]' },
    ],
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    category: 'local',
    tagline: 'GUI for local models — desktop app',
    baseUrl: 'http://localhost:1234/v1',
    apiKeyRequired: false,
    apiKeyHint: 'Leave blank',
    signupUrl: 'https://lmstudio.ai',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    emoji: '🖥️',
    freeTier: '100% free — runs locally',
    models: [
      { id: 'local-model', label: 'Auto-detect running model', recommended: true, free: true },
    ],
  },
  {
    id: 'janai',
    name: 'Jan.ai',
    category: 'local',
    tagline: 'Open-source ChatGPT alternative',
    baseUrl: 'http://localhost:1337/v1',
    apiKeyRequired: false,
    apiKeyHint: 'Leave blank',
    signupUrl: 'https://jan.ai',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    emoji: '🌸',
    freeTier: '100% free — runs locally',
    models: [
      { id: 'local-model', label: 'Auto-detect running model', recommended: true, free: true },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Image Generation Providers
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageProviderPreset {
  id: string;
  name: string;
  tagline: string;
  /** Value for OPENGAME_IMAGE_PROVIDER env var */
  envValue: string;
  apiKeyHint: string;
  baseUrl?: string;
  signupUrl?: string;
  color: string;
  bgColor: string;
  emoji: string;
  models: { id: string; label: string; recommended?: boolean }[];
  freeTier?: string;
}

export const IMAGE_PROVIDERS: ImageProviderPreset[] = [
  {
    id: 'none',
    name: 'None',
    tagline: 'Text-only — no AI-generated sprites',
    envValue: '',
    apiKeyHint: '',
    color: 'text-white/40',
    bgColor: 'bg-white/5 border-white/10',
    emoji: '⬜',
    models: [],
  },
  {
    id: 'openai-dalle',
    name: 'OpenAI DALL-E 3',
    tagline: 'High-quality, consistent style',
    envValue: 'openai-compat',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyHint: 'sk-… (same as LLM key)',
    signupUrl: 'https://platform.openai.com',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    emoji: '🖼️',
    models: [
      { id: 'dall-e-3', label: 'DALL-E 3', recommended: true },
      { id: 'dall-e-2', label: 'DALL-E 2' },
    ],
  },
  {
    id: 'fal',
    name: 'fal.ai — Flux',
    tagline: 'Fastest open image generation',
    envValue: 'openai-compat',
    baseUrl: 'https://fal.run/fal-ai',
    apiKeyHint: 'fal key',
    signupUrl: 'https://fal.ai',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    emoji: '⚡',
    freeTier: 'Free credits on sign-up',
    models: [
      { id: 'flux/schnell',  label: 'Flux Schnell (fast)',    recommended: true },
      { id: 'flux/dev',      label: 'Flux Dev (quality)' },
      { id: 'flux-pro/v1.1', label: 'Flux Pro v1.1' },
    ],
  },
  {
    id: 'tongyi',
    name: 'Tongyi / DashScope',
    tagline: 'Alibaba Wan — Chinese cloud',
    envValue: 'tongyi',
    apiKeyHint: 'DashScope API key',
    signupUrl: 'https://dashscope.aliyuncs.com',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    emoji: '🇨🇳',
    models: [
      { id: 'wan2.5-t2i-preview', label: 'Wan 2.5 T2I', recommended: true },
      { id: 'wanx-v1',            label: 'WanX v1' },
    ],
  },
  {
    id: 'doubao',
    name: 'Doubao / Volcengine',
    tagline: 'ByteDance Seedream — high quality',
    envValue: 'doubao',
    apiKeyHint: 'Volcengine ARK key',
    signupUrl: 'https://console.volcengine.com',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 border-sky-500/20',
    emoji: '🌊',
    models: [
      { id: 'seedream-3-0-t2i-250415', label: 'Seedream 3.0', recommended: true },
    ],
  },
  {
    id: 'stability',
    name: 'Stability AI',
    tagline: 'Stable Diffusion XL, SD3',
    envValue: 'openai-compat',
    baseUrl: 'https://api.stability.ai/v1',
    apiKeyHint: 'sk-…',
    signupUrl: 'https://platform.stability.ai',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 border-violet-500/20',
    emoji: '🎨',
    freeTier: '25 free images on sign-up',
    models: [
      { id: 'stable-diffusion-xl-1024-v1-0', label: 'SDXL 1.0', recommended: true },
      { id: 'sd3-medium',                    label: 'SD3 Medium' },
    ],
  },
  {
    id: 'replicate',
    name: 'Replicate',
    tagline: 'Run any open SD model via API',
    envValue: 'openai-compat',
    baseUrl: 'https://api.replicate.com/v1',
    apiKeyHint: 'r8_…',
    signupUrl: 'https://replicate.com',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    emoji: '🔁',
    models: [
      { id: 'black-forest-labs/flux-schnell', label: 'Flux Schnell', recommended: true },
      { id: 'stability-ai/sdxl',              label: 'SDXL' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getProvider(id: string): ProviderPreset | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}

export function getDefaultModel(provider: ProviderPreset): string {
  return provider.models.find((m) => m.recommended)?.id ?? provider.models[0]?.id ?? '';
}

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  frontier:   'Frontier Cloud',
  fast:       'Fast Inference',
  open:       'Open Models',
  aggregator: 'All-in-One',
  local:      'Local / Offline',
};
