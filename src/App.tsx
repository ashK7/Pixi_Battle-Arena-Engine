import { useEffect, useRef } from 'react';
import { createGameApp } from './game';
import type { Application } from 'pixi.js';

let pixiApp: Application | null = null;

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializePixiApp = async () => {
      if (containerRef.current && !pixiApp) {
        pixiApp = await createGameApp();
        containerRef.current.appendChild(pixiApp.canvas);
      }
    };

    initializePixiApp();

    return () => {
      if (pixiApp) {
        pixiApp.destroy(true, { children: true, texture: true });
        pixiApp = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return <div ref={containerRef} />;
}

export default App;