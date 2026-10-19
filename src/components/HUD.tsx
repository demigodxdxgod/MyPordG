/**
 * HUD: Combat Status & Elemental Hotkey Interface
 * Adheres to 60-30-10 color budget, no-pill rules, and keyboard-only controls.
 */

import React from 'react';
import { Flame, Snowflake, Zap, Droplets, Shield, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { ProceduralAudio } from '../audio/ProceduralAudio.ts';

interface HUDProps {
  playerHp: number;
  playerPosture: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenTestMatrix: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  playerHp,
  playerPosture,
  isMuted,
  onToggleMute,
  onOpenTestMatrix,
}) => {
  return (
    <div className="pointer-events-none select-none">
      {/* Top Left: Character Status Gauges */}
      <div className="absolute top-4 left-6 pointer-events-auto flex flex-col gap-2 bg-slate-950/85 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-xl max-w-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-cinzel tracking-wider text-slate-300 font-bold">ALCHEMIST HERMETIC</span>
          <span className="font-mono text-slate-400">HP {playerHp} / 100</span>
        </div>

        {/* Health Bar */}
        <div className="w-64 h-3 bg-slate-900 rounded-sm overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-red-700 to-rose-500 transition-all duration-150"
            style={{ width: `${Math.max(0, Math.min(100, playerHp))}%` }}
          />
        </div>

        {/* Posture Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span className="flex items-center gap-1 font-mono">
            <Shield className="w-3 h-3 text-amber-400" />
            POSTURE METER
          </span>
          <span className="font-mono text-amber-300">{playerPosture}%</span>
        </div>
        <div className="w-64 h-1.5 bg-slate-900 rounded-sm overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-100"
            style={{ width: `${Math.max(0, Math.min(100, playerPosture))}%` }}
          />
        </div>
      </div>

      {/* Top Right: Actions & Rule Suite Trigger */}
      <div className="absolute top-4 right-6 pointer-events-auto flex items-center gap-3">
        <button
          onClick={onToggleMute}
          className="p-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          onClick={onOpenTestMatrix}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 text-xs font-medium transition-colors shadow-lg"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Rule Verification Suite (19 Rules)</span>
        </button>
      </div>

      {/* Bottom Center: Keyboard Hotkeys Tray */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 shadow-2xl">
          {/* Kinetic Strike */}
          <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-mono text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/60">
              J
            </span>
            <span className="text-[11px] text-slate-200 font-medium">Kinetic Kick</span>
          </div>

          {/* Pyro */}
          <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-orange-400 font-bold px-1.5 py-0.5 rounded bg-orange-950/60 border border-orange-800/60">
                K
              </span>
              <Flame className="w-3 h-3 text-orange-500" />
            </div>
            <span className="text-[11px] text-slate-200 font-medium">Pyro Fireball</span>
          </div>

          {/* Cryo */}
          <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                L
              </span>
              <Snowflake className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-[11px] text-slate-200 font-medium">Cryo / Shatter</span>
          </div>

          {/* Electro */}
          <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-purple-400 font-bold px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60">
                U
              </span>
              <Zap className="w-3 h-3 text-purple-400" />
            </div>
            <span className="text-[11px] text-slate-200 font-medium">Electro Arc</span>
          </div>

          {/* Hydro */}
          <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-blue-400 font-bold px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60">
                I
              </span>
              <Droplets className="w-3 h-3 text-blue-400" />
            </div>
            <span className="text-[11px] text-slate-200 font-medium">Hydro Blast</span>
          </div>

          {/* Dash / Cancel */}
          <div className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-300 font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              SPACE
            </span>
            <span className="text-[11px] text-slate-200 font-medium">Dash / Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
};
