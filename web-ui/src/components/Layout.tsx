import React from 'react';
import type { Page } from '../App.js';
import Navbar from './Navbar.js';

interface Props {
  page: Page;
  navigate: (p: Page) => void;
  children: React.ReactNode;
}

export default function Layout({ page, navigate, children }: Props) {
  // Full-screen iframe mode for playing a game
  if (page.name === 'game') {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Aurora ambient background */}
      <div
        className="aurora-bg pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      />
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        aria-hidden
      />

      <Navbar page={page} navigate={navigate} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="py-6 text-center text-xs text-white/20 border-t border-white/[0.04]">
        OpenGame Studio · open-source agentic game creation
      </footer>
    </div>
  );
}
