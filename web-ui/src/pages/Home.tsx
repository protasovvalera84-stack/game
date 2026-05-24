import { motion } from 'framer-motion';
import { ArrowRight, Gamepad2, Images, Sparkles, Zap } from 'lucide-react';
import type { Page } from '../App.js';
import PromptInput from '../components/PromptInput.js';

interface Props {
  navigate: (p: Page) => void;
}

const features = [
  {
    icon: <Zap size={18} className="text-aurora-purple" />,
    title: 'AI-Powered Creation',
    desc: 'Describe your game in plain language and let the AI handle the rest — code, assets, and game logic.',
  },
  {
    icon: <Gamepad2 size={18} className="text-aurora-cyan" />,
    title: 'Runs Offline',
    desc: 'Use a local Ollama LLM backend. No cloud accounts, no API keys required.',
  },
  {
    icon: <Images size={18} className="text-aurora-emerald" />,
    title: 'Full Game Output',
    desc: 'Generates playable HTML5 games with Phaser.js — sprites, scenes, enemies, power-ups and more.',
  },
];

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export default function Home({ navigate }: Props) {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <motion.section
        variants={stagger}
        initial="initial"
        animate="animate"
        className="pt-12 text-center space-y-8"
      >
        {/* Badge */}
        <motion.div variants={item} className="flex justify-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-aurora-purple border border-aurora-purple/20">
            <Sparkles size={12} />
            Open-source · 2026 · Self-hosted
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1 variants={item} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
          Create Games with
          <br />
          <span className="gradient-text">One Sentence</span>
        </motion.h1>

        <motion.p variants={item} className="mx-auto max-w-xl text-lg text-white/50">
          OpenGame Studio turns your ideas into fully playable browser games using
          a local AI — no cloud, no coding required.
        </motion.p>

        {/* Prompt input */}
        <motion.div variants={item} className="mx-auto max-w-2xl">
          <PromptInput
            onSubmit={(prompt) => navigate({ name: 'generate', prompt })}
            placeholder="Describe your game idea… (e.g. top-down space shooter with boss fights)"
          />
        </motion.div>

        {/* Browse gallery */}
        <motion.div variants={item}>
          <button
            className="btn-ghost flex items-center gap-2 mx-auto"
            onClick={() => navigate({ name: 'gallery' })}
          >
            Browse Gallery
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </motion.section>

      {/* Features */}
      <motion.section
        variants={stagger}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        {features.map((f) => (
          <motion.div key={f.title} variants={item} className="card space-y-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl glass">
              {f.icon}
            </span>
            <h3 className="font-semibold text-white">{f.title}</h3>
            <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </motion.section>

      {/* Demo games */}
      <motion.section
        variants={stagger}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        <motion.h2 variants={item} className="text-xl font-bold text-white/80">
          Game types supported
        </motion.h2>
        <motion.div variants={item} className="flex flex-wrap gap-2">
          {[
            'Platformer',
            'Top-Down',
            'Tower Defense',
            'Card Battle',
            'Puzzle',
            'Space Shooter',
            'Fighting',
            'RPG',
          ].map((t) => (
            <span
              key={t}
              className="px-3 py-1 rounded-full text-sm glass text-white/50 border border-white/[0.06]"
            >
              {t}
            </span>
          ))}
        </motion.div>
      </motion.section>
    </div>
  );
}
