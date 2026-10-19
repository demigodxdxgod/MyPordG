/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { GameContainer } from './game/GameContainer.tsx';
import { CourtyardScene, ITelemetryData } from './game/CourtyardScene.ts';
import { HUD } from './components/HUD.tsx';
import { TelemetryOverlay } from './components/TelemetryOverlay.tsx';
import { RuleTestMatrix } from './components/RuleTestMatrix.tsx';
import { ProceduralAudio } from './audio/ProceduralAudio.ts';
import { Sparkles, HelpCircle, X } from 'lucide-react';

export default function App() {
  const [scene, setScene] = useState<CourtyardScene | null>(null);
  const [isTestMatrixOpen, setIsTestMatrixOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMatrixMode, setIsMatrixMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [telemetry, setTelemetry] = useState<ITelemetryData>({
    fps: 60,
    frameTimeMs: 3.8,
    activeProps: 10,
    wetCells: 0,
    frostCells: 0,
    burningCells: 0,
    steamClouds: 0,
    activeEnemies: 4,
    playerHp: 100,
    playerPosture: 0,
  });

  const handleSceneReady = useCallback((readyScene: CourtyardScene) => {
    setScene(readyScene);
  }, []);

  const handleTelemetryUpdate = useCallback((data: ITelemetryData) => {
    setTelemetry(data);
  }, []);

  const handleToggleMatrix = useCallback(() => {
    if (scene) {
      const active = scene.toggleMatrixMode();
      setIsMatrixMode(active);
    }
  }, [scene]);

  const handleToggleMute = useCallback(() => {
    const muted = ProceduralAudio.toggleMute();
    setIsMuted(muted);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#0c0e14] text-slate-100 overflow-hidden flex flex-col font-sans select-none">
      {/* Top Bar Header (Strict 3-zone contract) */}
      <header className="relative z-30 flex items-center justify-between gap-6 px-6 py-3 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <span className="font-cinzel text-lg font-bold tracking-wider text-slate-100 whitespace-nowrap shrink-0">
            COURTYARD OF SHADOWS
          </span>
          <span className="text-[11px] font-mono text-slate-400 border-l border-slate-700 pl-3 hidden md:inline">
            Isometric 2.5D ARPG
          </span>
        </div>

        {/* Zone 2: Telemetry metrics & Matrix Mode */}
        <div className="hidden lg:flex items-center justify-center flex-1">
          <TelemetryOverlay
            telemetry={telemetry}
            isMatrixMode={isMatrixMode}
            onToggleMatrix={handleToggleMatrix}
          />
        </div>

        {/* Zone 3: Primary Action & Guide */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>

          <button
            onClick={() => setIsTestMatrixOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>19 Rules Test Suite</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <GameContainer
          onSceneReady={handleSceneReady}
          onTelemetryUpdate={handleTelemetryUpdate}
        />

        {/* In-Game HUD overlay */}
        <HUD
          playerHp={telemetry.playerHp}
          playerPosture={telemetry.playerPosture}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenTestMatrix={() => setIsTestMatrixOpen(true)}
        />
      </main>

      {/* Guide & Controls Modal */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-cinzel text-lg font-bold text-slate-100">
                Alchemical Combat & Keybindings
              </h3>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <div className="font-mono text-amber-400 font-bold mb-1">WASD / Arrows</div>
                  <div className="text-slate-400">Continuous 2:1 isometric movement across Plaza, Ramp, and Sunken Wing.</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <div className="font-mono text-amber-400 font-bold mb-1">J — Kinetic Kick</div>
                  <div className="text-slate-400">Launch crates and barrels into enemies (max 400 px/s). Bounces off walls.</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <div className="font-mono text-orange-400 font-bold mb-1">K — Pyro Fireball</div>
                  <div className="text-slate-400">Cast flaming projectile. Attenuates to 25 dmg over water, creating steam.</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <div className="font-mono text-cyan-400 font-bold mb-1">L — Cryo / Shatter</div>
                  <div className="text-slate-400">Spawn Glacial Block (+15 HP heal once). Press L on block to Shatter origin!</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <div className="font-mono text-purple-400 font-bold mb-1">U — Electro Arc</div>
                  <div className="text-slate-400">Chain lightning connecting up to 4 targets with 0.8 damage decay.</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  <div className="font-mono text-blue-400 font-bold mb-1">I — Hydro Blast</div>
                  <div className="text-slate-400">Creates wet conductive puddle. Extinguishes lit fuses and fires.</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/50 flex items-center justify-between">
                <div>
                  <span className="font-mono text-slate-200 font-semibold">Space: </span>
                  <span className="text-slate-400">Dash (cancels attack recovery immediately)</span>
                </div>
                <div>
                  <span className="font-mono text-slate-200 font-semibold">` (Tilde): </span>
                  <span className="text-slate-400">Matrix AABB Debug Overlay</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive 19 Rules Test Matrix Modal */}
      <RuleTestMatrix
        scene={scene}
        isOpen={isTestMatrixOpen}
        onClose={() => setIsTestMatrixOpen(false)}
      />
    </div>
  );
}
