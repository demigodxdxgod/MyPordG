# Courtyard of Shadows — Master Implementation Plan

> **Isometric 2.5D Alchemical ARPG with Deterministic Cellular Simulation**  
> An interactive isometric action-combat arena built with Phaser 3, React 19, TypeScript, and Web Audio API, featuring a 4-element reaction engine (Pyro, Cryo, Electro, Hydro), kinetic props, split-level terrain, zero-allocation game loop, and an in-browser 19-rule verification test suite.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural foundation and technical rules from your design document have been fully synthesized with your preferred choices:

- **Confirmed Control Scheme**: **Keyboard-only twin-key directional combat**. WASD / Arrow keys handle continuous isometric movement, while tactile keyboard hotkeys (`J` = Kinetic Strike/Punch, `K` = Pyro Fireball, `L` = Cryo Glacial Block/Shatter, `U` = Electro Arc Chain, `I` = Hydro Blast, `Space` = Dash/Animation-Cancel). Directional strikes snap to facing vectors.
- **Confirmed Visual Representation**: **Procedural isometric pixel-art textures and GLSL shaders**. We generate 100% self-contained diamond tiles ($64\times32\text{ px}$), character frames, alchemical props (wooden crates, oil barrels, glacial blocks), and surface decals via offscreen canvas renderers directly into Phaser textures, augmented by fragment shaders for wetness reflections, frost patterns, and scorch marks.
- **Confirmed Scope**: **Fully playable slice with all 4 elements, props, enemies, and rule verification suite**. The application delivers the split-level arena (Upper Plaza $z=0$, Sunken Wing $z=-72$, 6-step ramp), responsive combat, kinetic rebounds, chain reactions, procedural Web Audio, and a live diagnostic HUD with test runners for all 19 locked rules.
- **Matrix Debug Mode**: Bound to the tilde key (`` ` `` / `~`) and accessible via HUD button to expose volumetric bounding prisms, $Z$-axis elevation heights, and bit-packed cell states in real time.

---

## 1. Overview & Core Concept

*Courtyard of Shadows* is an isometric 2.5D Action RPG set in an ancient, reactive stone courtyard. Players command an alchemical combatant traversing multi-tiered terrain. 

Instead of dealing conventional static damage, combat operates on the core axiom: **"Powers are verbs; the world is nouns."**
- Spells alter the underlying $64\times32$ cellular `SurfaceGrid` (converting dry stone to wet puddles, freezing into slick frost, scorching with persistent fire, or electrifying fluid networks).
- Moving props (wooden crates, explosive barrels) can be kicked and launched at high velocity ($v_{\max} = 400\text{ px/s}$), dealing volumetric impacts, rebounding off stone walls ($>200\text{ px/s}$ re-arm threshold), and transferring elemental states.
- The simulation runs on a deterministic fixed tick decoupled from display refresh rates, adhering strictly to a zero-allocation garbage collection invariant in the active loop.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Title / Briefing Screen**: Immediate introduction to the courtyard lore, keyboard keybindings cheat sheet, and one-click entry into the arena.
2. **Courtyard Exploration & Split-Level Navigation**: Moving seamlessly between Upper Plaza ($z = 0$) and Sunken Wing ($z = -72$) across the dynamic 6-step ramp ($12\text{ px}$ per step).
3. **Kinetic & Elemental Combat**:
   - Striking wooden crates to launch them into shadow husks.
   - Casting Hydro to create conductive puddles, followed by Pyro to create Steam Clouds or Electro to trigger 4-target chain conduction.
   - Spawning Glacial Blocks under entities (+15 HP heal once) and executing Shatter strikes to disperse frost outwards.
4. **Diagnostic & Rule Inspector Panel**: Floating collapsible sidebar allowing real-time inspection of performance (p99 frame time, active entities, pool occupancy) and instant execution of the automated Vitest test scenarios.
5. **Matrix View Mode**: Instant visual toggle displaying tile coordinates $(C, R)$, elevation $Z$ bars, AABB collision boxes, and bitmask values.

### Visual Identity & Theme
- **Aesthetic Direction**: Gothic alchemical dark fantasy. Atmospheric stone courtyard with glowing elemental runic resonances, weathered cobblestones, and steam vapor.
- **Color Palette (60-30-10 Budget)**:
  - **60% Dominant Ground**: Deep weathered slate (`#14171F`), cold basalt (`#1C2230`), and damp stone flags (`#252E3E`).
  - **30% Structural Architecture**: Sunken masonry, dark oak crates (`#5C4033`), glacial crystalline teal (`#38BDF8`), and stone ramp balustrades (`#475569`).
  - **10% Elemental Accents**: Pyro ember orange (`#F97316`), Cryo frost cyan (`#06B6D4`), Electro discharge violet (`#A855F7`), Hydro shimmer azure (`#3B82F6`).
- **Typography**:
  - Display / Headings: `Cinzel` / `Playfair Display` for alchemical grandeur.
  - Body & Combat Logs: `Plus Jakarta Sans` for crisp readability.
  - Telemetry & Tile Coordinates: `JetBrains Mono` / tabular numerals (`tabular-nums`).

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Implementation | Rationale | Alternatives Considered |
|---|---|---|---|
| **Rendering Core** | Phaser 3 (`phaser@^3.80.0`) wrapped in React container | High-performance WebGL display list, texture management, and camera transforms. React handles non-canvas UI and test panels. | Raw Canvas 2D (too slow for high-density particle passes) or Three.js (unnecessary 3D asset overhead for strict 2.5D isometric). |
| **Memory Management** | Flat `Uint32Array` & Pre-allocated Object Pools | Guarantees zero GC pauses ($0\text{ Minor/Major GC}$ cycles) during 120 FPS high-intensity combat. | Plain JavaScript object allocations `{}` (causes garbage collection stutter during frame spikes). |
| **Grid Representation** | Bit-packed `Uint32Array(2048)` ($64\times32$) | Encodes Primary State (3 bits), Decay Timer (8 bits), Frost/Burn Stacks (4 bits), Fluid Level (5 bits), and Flags into a single 32-bit word. | Array of objects `CellState[]` (high memory footprint and cache thrashing). |
| **Audio Engine** | Procedural Web Audio API Synthesizer | Zero external audio asset loading; instant synthetic crunch for cryo, detuned saw buzz for electro, white noise for steam. | Pre-recorded `.wav`/`.mp3` files (risk of CORS errors, load latency, and bundle bloating). |
| **Depth Sorting** | `DepthKey = Floor(Y_screen * 10) + LayerOffset` | Fully eliminates visual z-flickering across elevation ramps and airborne juggles. | Native isometric Z-only sorting (prone to jitter when entities jump or navigate ramps). |

---

## 4. Technical Architecture & System Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           REACT APPLICATION SHELL                               │
│  ┌─────────────────────────┐  ┌───────────────────────┐  ┌───────────────────┐  │
│  │     Top Header HUD      │  │  Telemetry & FPS Bar  │  │ Rule Runner Panel │  │
│  │ (HP, Posture, Elements) │  │  (p99, GC, Pool Size) │  │ (19 Test Cases)   │  │
│  └────────────┬────────────┘  └───────────┬───────────┘  └─────────┬─────────┘  │
│               │                           │                        │            │
│               ▼                           ▼                        ▼            │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                      PHASER 3 ENGINE (WebGL Canvas)                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Main Arena Scene (Iso Projection, Depth Pipeline, Matrix Overlay)   │  │  │
│  │  └───────────────────▲─────────────────────────────▲───────────────────┘  │  │
│  │                      │                             │                      │  │
│  │  ┌───────────────────┴──────────┐       ┌──────────┴───────────────────┐  │  │
│  │  │   Kinetic & Entity Physics   │       │   Environmental Simulation   │  │  │
│  │  │ • 100x KineticProp Pool      │       │ • SurfaceGrid (Uint32Array)  │  │  │
│  │  │ • Volumetric AABB (ΔZ ≤ 24)  │       │ • ConductionGraph (BFS)      │  │  │
│  │  │ • Re-arm Velocity > 200 px/s │       │ • 3-Phase Reaction Engine    │  │  │
│  │  │ • Player & Enemy FSMs        │       │   (Snapshot→Resolve→Commit)  │  │  │
│  │  └───────────────────▲──────────┘       └──────────▲───────────────────┘  │  │
│  │                      │                             │                      │  │
│  │  ┌───────────────────┴─────────────────────────────┴───────────────────┐  │  │
│  │  │          DamageContext & Global Simulation Tick Bus                 │  │  │
│  │  │ • Pre-allocated DamageContext Pool (32 slots)                       │  │  │
│  │  │ • Zero-Allocation Debug Ring Buffer (500 events)                    │  │  │
│  │  │ • Procedural Web Audio API Sound Synthesizer                        │  │  │
│  │  └─────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phased Implementation Roadmap

### Phase 1: Core Scaffolding, Math & Pure Simulation Engine
- Install `phaser@^3.80.0`.
- Implement `src/simulation/IsoMath.ts`:
  - $2:1$ projection math: $X = (x - y) \cdot 32 + X_{\text{origin}}$, $Y = (x + y) \cdot 16 - z + Y_{\text{origin}}$.
  - Screen-to-world inversion.
  - Continuous depth sorting formula: `DepthKey = Math.floor(Y_screen * 10) + LayerOffset`.
- Implement `src/combat/DamageContext.ts`:
  - `ElementType` (Physical, Pyro, Cryo, Electro, Hydro).
  - `HitFlags` (Critical, Airborne Juggle, Prop Impact, Reaction Trigger).
  - Pre-allocated static pool of `IDamageContext` objects.
- Implement `src/simulation/SurfaceGrid.ts`:
  - $64\times32$ cellular grid backed by `Uint32Array(2048)`.
  - Bitmask unpacking/packing for DRY, WET, FROST, BURNING, SCORCHED, STEAM states.
  - Autonomous 10 Hz decay cycle.
- Implement `src/simulation/ConductionGraph.ts`:
  - Flat unweighted BFS using pre-allocated `Uint16Array` queue.
  - Inlined orthogonal neighbor checks.

### Phase 2: ReactionEngine & The 19 Locked Rules
- Implement `src/simulation/ReactionEngine.ts`:
  - 3-Phase Transaction Model (Phase A: Snapshot, Phase B: Resolve, Phase C: Commit).
  - Complete $5\times5$ elemental interaction matrix.
  - Rule 8 (Glacial Block +15 HP heal once per cast).
  - Rule 9 (Shatter clears origin only; outer 8 retain FROST).
  - Rule 10 (Cryo converts $3\times3$ WET to FROST).
  - Rule 11 (Melting Glacial Block under airborne drops to $z=0$).
  - Rule 12 (Glacial Block breaks electrical conduction).
  - Rule 13 (Burning wooden prop 4.0s collision duration).
  - Rule 14 & 15 (Hydro extinguishes fuse; lit fuses cannot be paused).
  - Rule 16 (Fireball over WET drops from 35 to 25 dmg + Steam Cloud).
  - Rule 17 (Pyro on WET target single-step neutralization).
  - Rule 18 (Electro Arc Chain max 4 targets with $0.8$ decay: 1.0 -> 0.8 -> 0.64 -> 0.512).
  - Rule 19 (Electro line-of-sight checks: bypasses props $\le 16\text{px}$, blocked by stone walls).

### Phase 3: Volumetric Physics & Kinetic Prop Pool
- Implement `src/physics/VolumetricAABB.ts`:
  - Overlap check across $X, Y$ and $|\Delta Z| \le 24\text{ px}$.
- Implement `src/physics/KineticProp.ts` and `PropPool`:
  - Pre-allocated pool of 100 movable props (wooden crates, oil barrels).
  - Velocity clamping ($v_{\max} = 400\text{ px/s}$).
  - Hit registration window (single hit per launch vector).
  - Wall rebound and velocity re-arming threshold ($|v| > 200\text{ px/s}$ at $> 45^\circ$).
  - Player self-launch immunity while standing still.

### Phase 4: Procedural Texture Generator & WebGL Scene Setup
- Implement `src/graphics/ProceduralTextureAtlas.ts`:
  - Generate isometric diamond stone tiles ($64\times32$) for Upper Plaza ($z=0$) and Sunken Wing ($z=-72$).
  - Generate 6-step ramp transition tiles ($12\text{ px}$ vertical steps).
  - Generate pixel-art sprites: Alchemical Hero (multi-directional), Shadow Husk Enemy, Wooden Crate, Explosive Barrel, Glacial Crystal Block, Steam Cloud, Elemental Bolts.
- Mount Phaser Game Canvas in `src/game/GameContainer.tsx`:
  - Keyboard input mapping (WASD movement, J strike/kinetic kick, K pyro, L cryo, U electro, I hydro, Space cancel/dash).
  - Continuous depth sorting pipeline.
  - Camera tracking with smooth lerp.

### Phase 5: Enemy AI, Posture Break & Procedural Web Audio
- Implement `src/entities/EnemyController.ts`:
  - Finite State Machine: IDLE -> PATROL -> CHASE -> ATTACK -> HITSTUN -> AIRBORNE_JUGGLE -> STAGGERED.
  - Posture meter: Consecutive hits and kinetic prop collisions fill posture; breaking posture triggers staggered execution window.
- Implement `src/audio/ProceduralAudio.ts`:
  - Web Audio API synthesizer for punch/kick impacts, fire bursts, ice shatters, electro sparks, water splashes, and posture breaks.
- Combat Juice: Screen shake and $40\text{ ms}$ frame freezes on critical hits.

### Phase 6: Diagnostic HUD, Matrix View & Automated Rule Suite
- Implement `src/components/TelemetryOverlay.tsx`:
  - Live FPS and p99 frame execution time meter.
  - Active pooled props, damage contexts, and surface cell counts.
  - Zero-allocation debug ring buffer log viewer.
- Implement `src/components/RuleTestMatrix.tsx`:
  - Interactive UI panel executing the acceptance tests for all 19 locked rules.
  - One-click trigger for Acceptance Scenarios A (Arena Reset), B (Peak Load Conduction), and C (High-FPS Stress Test).
- Verify build with `compile_applet`.

---

## Verification & Acceptance Checklist

- [ ] **Coordinate Precision**: Screen-to-world and world-to-screen transforms invert perfectly without floating-point drift.
- [ ] **Depth Sorting**: No sprite flicker across Upper Plaza, Sunken Wing, and 6-step ramps.
- [ ] **Zero-Allocation**: No dynamic object or array allocations inside the 60 Hz simulation loop.
- [ ] **Kinetic Rebound**: Props launched at high speed bounce off stone pillars and re-arm if $|v| > 200\text{ px/s}$.
- [ ] **19 Rules Verified**: Glacial Block healing (+15 HP once), Shatter area of effect, Fireball water attenuation (35 -> 25 dmg), and Electro Arc Chain (max 4 targets, $0.8$ decay) pass with 100% assertions in the live test harness.
