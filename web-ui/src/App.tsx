import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import Layout from './components/Layout.js';
import Gallery from './pages/Gallery.js';
import GameView from './pages/GameView.js';
import Generate from './pages/Generate.js';
import Home from './pages/Home.js';
import Settings from './pages/Settings.js';

export type Page =
  | { name: 'home' }
  | { name: 'gallery' }
  | { name: 'generate'; prompt?: string }
  | { name: 'game'; id: string }
  | { name: 'settings' };

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'home' });

  const navigate = (p: Page) => setPage(p);

  const renderPage = () => {
    switch (page.name) {
      case 'home':
        return <Home navigate={navigate} />;
      case 'gallery':
        return <Gallery navigate={navigate} />;
      case 'generate':
        return <Generate navigate={navigate} initialPrompt={page.prompt} />;
      case 'game':
        return <GameView id={page.id} navigate={navigate} />;
      case 'settings':
        return <Settings navigate={navigate} />;
    }
  };

  return (
    <Layout page={page} navigate={navigate}>
      <AnimatePresence mode="wait">
        <motion.div
          key={page.name}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
