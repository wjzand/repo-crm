import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initDB } from '@/services/db';
import { seedDatabase, isDatabaseSeeded } from '@/data/seed';

function Root() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        const seeded = await isDatabaseSeeded();
        if (!seeded) {
          await seedDatabase();
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
      }
      setInitialized(true);
    };
    init();
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
