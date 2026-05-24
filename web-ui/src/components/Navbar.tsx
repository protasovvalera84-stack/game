import { Download, Gamepad2, Images, Plus, Settings, Zap } from 'lucide-react';
import React from 'react';
import type { Page } from '../App.js';

interface Props {
  page: Page;
  navigate: (p: Page) => void;
}

const navItems: { label: string; icon: React.ReactNode; page: Page }[] = [
  { label: 'Home',      icon: <Zap size={16} />,       page: { name: 'home' } },
  { label: 'Gallery',   icon: <Images size={16} />,     page: { name: 'gallery' } },
  { label: 'Download',  icon: <Download size={16} />,   page: { name: 'downloads' } },
  { label: 'Settings',  icon: <Settings size={16} />,   page: { name: 'settings' } },
];

export default function Navbar({ page, navigate }: Props) {
  const isActive = (p: Page) => p.name === page.name;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          className="flex items-center gap-2.5 group"
          onClick={() => navigate({ name: 'home' })}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-aurora-violet to-aurora-cyan glow-purple">
            <Gamepad2 size={16} className="text-white" />
          </span>
          <span className="hidden sm:block font-bold text-lg gradient-text">
            OpenGame
          </span>
          <span className="hidden sm:block text-xs text-white/30 mt-0.5">
            Studio
          </span>
        </button>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.page)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive(item.page)
                  ? 'bg-aurora-purple/15 text-aurora-purple border border-aurora-purple/20'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
          onClick={() => navigate({ name: 'generate' })}
        >
          <Plus size={14} />
          <span>New Game</span>
        </button>
      </div>
    </nav>
  );
}
