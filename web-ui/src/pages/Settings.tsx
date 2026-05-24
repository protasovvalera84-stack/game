import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  CloudOff,
  Info,
  Save,
  Server,
} from 'lucide-react';
import React, { useState } from 'react';
import type { Page } from '../App.js';

interface Props {
  navigate: (p: Page) => void;
}

const MODELS = [
  { value: 'qwen2.5-coder:7b',  label: 'Qwen2.5-Coder 7B  (fast, offline)' },
  { value: 'qwen2.5-coder:14b', label: 'Qwen2.5-Coder 14B (better quality, needs GPU)' },
  { value: 'codellama:7b',      label: 'CodeLlama 7B      (alternative, offline)' },
  { value: 'gpt-4o-mini',       label: 'GPT-4o Mini       (cloud — needs API key)' },
  { value: 'gpt-4o',            label: 'GPT-4o            (cloud — needs API key)' },
];

const IMAGE_PROVIDERS = [
  { value: '',          label: 'None (text-only game)' },
  { value: 'tongyi',    label: 'Tongyi / DashScope' },
  { value: 'doubao',    label: 'Doubao / Volcengine' },
  { value: 'openai-compat', label: 'OpenAI-compatible endpoint' },
];

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
        <span className="text-aurora-purple">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-white/50">{label}</span>
      {children}
      {hint && <p className="text-[11px] text-white/25">{hint}</p>}
    </label>
  );
}

export default function Settings({ navigate }: Props) {
  const [saved, setSaved] = useState(false);

  // Settings stored in localStorage for the frontend; the backend reads from env vars.
  const [baseUrl, setBaseUrl] = useState(
    () => localStorage.getItem('og.baseUrl') ?? 'http://localhost:11434/v1',
  );
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('og.apiKey') ?? '',
  );
  const [model, setModel] = useState(
    () => localStorage.getItem('og.model') ?? 'qwen2.5-coder:7b',
  );
  const [imageProvider, setImageProvider] = useState(
    () => localStorage.getItem('og.imageProvider') ?? '',
  );
  const [imageKey, setImageKey] = useState(
    () => localStorage.getItem('og.imageKey') ?? '',
  );

  const save = () => {
    localStorage.setItem('og.baseUrl', baseUrl);
    localStorage.setItem('og.apiKey', apiKey);
    localStorage.setItem('og.model', model);
    localStorage.setItem('og.imageProvider', imageProvider);
    localStorage.setItem('og.imageKey', imageKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      {/* Offline notice */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex items-start gap-3 bg-aurora-purple/[0.04] border-aurora-purple/15"
      >
        <CloudOff size={16} className="text-aurora-purple shrink-0 mt-0.5" />
        <div className="text-sm text-white/60 leading-relaxed">
          <strong className="text-white">Offline mode:</strong> point the LLM
          base URL to your local Ollama instance{' '}
          <code className="text-aurora-cyan text-xs">
            http://localhost:11434/v1
          </code>{' '}
          and leave the API key blank. Run{' '}
          <code className="text-aurora-cyan text-xs">
            ollama pull qwen2.5-coder:7b
          </code>{' '}
          first.
        </div>
      </motion.div>

      {/* LLM settings */}
      <Section title="Language Model" icon={<Server size={14} />}>
        <Field
          label="Base URL"
          hint="Ollama local: http://localhost:11434/v1 · OpenAI: https://api.openai.com/v1"
        >
          <input
            className="input-field"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434/v1"
          />
        </Field>
        <Field label="API Key" hint="Leave blank for local Ollama.">
          <input
            className="input-field"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-… or blank for Ollama"
          />
        </Field>
        <Field label="Model">
          <select
            className="input-field"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {model === 'custom' && (
            <input
              className="input-field mt-2"
              placeholder="Enter model name"
              onChange={(e) => setModel(e.target.value)}
            />
          )}
        </Field>
      </Section>

      {/* Image generation */}
      <Section title="Image Generation (optional)" icon={<Info size={14} />}>
        <Field label="Provider" hint="Leave as None for text-only games.">
          <select
            className="input-field"
            value={imageProvider}
            onChange={(e) => setImageProvider(e.target.value)}
          >
            {IMAGE_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        {imageProvider && (
          <Field label="Image API Key">
            <input
              className="input-field"
              type="password"
              value={imageKey}
              onChange={(e) => setImageKey(e.target.value)}
              placeholder="API key for image provider"
            />
          </Field>
        )}
      </Section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-sm text-emerald-400"
          >
            <CheckCircle size={14} />
            Saved
          </motion.span>
        )}
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={save}>
          <Save size={14} />
          Save Settings
        </button>
      </div>
    </div>
  );
}
