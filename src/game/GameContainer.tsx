/**
 * GameContainer: React Mount Wrapper for Phaser 3 Game Instance
 * Manages canvas lifecycle, resize listeners, and scene communication.
 */

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CourtyardScene, ITelemetryData } from './CourtyardScene.ts';

interface GameContainerProps {
  onSceneReady: (scene: CourtyardScene) => void;
  onTelemetryUpdate: (data: ITelemetryData) => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  onSceneReady,
  onTelemetryUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      backgroundColor: '#0c0e14',
      render: {
        roundPixels: true,
        antialias: false,
        pixelArt: true,
      },
      fps: {
        target: 120,
        forceSetTimeOut: false,
      },
      scene: [CourtyardScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Wait for scene to boot
    game.events.once('step', () => {
      const scene = game.scene.getScene(CourtyardScene.KEY) as CourtyardScene;
      if (scene) {
        scene.onTelemetryUpdate = onTelemetryUpdate;
        onSceneReady(scene);
      }
    });

    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        gameRef.current.scale.resize(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0 overflow-hidden cursor-crosshair"
    />
  );
};
