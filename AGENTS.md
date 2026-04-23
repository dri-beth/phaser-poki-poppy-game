# AGENTS.md - AI Agent Reference for phaser-poki-poppy-game

> This file is for AI coding agents, not human documentation.
> Use code as the source of truth. `FruitPop_GDD_v2.md` describes the target design, but current code wins on conflicts.
> Human-facing overview lives in `README.md`.

---

## 1. Project Overview

**What this repo is:** a Phaser 3 + TypeScript + Vite Poki browser game called `Fruit Pop`. The current runtime is a portrait-first fruit ripeness game with a countdown entry, 25-level progression, a dynamic board that grows from `2x2` to `10x10`, dirt meter, timer pressure, perfect pops, win/lose result states, and persisted mute/high-score storage.

**Target platform:** Poki web games, portrait layout, base canvas `480 x 854`.

**Resolved versions in this workspace**

| Package | package.json spec | Resolved version |
|---|---|---|
| phaser | `^3.80.1` | `3.90.0` |
| @poki/phaser-3 | `^0.0.5` | `0.0.5` |
| typescript | `^5.4.5` | `5.9.3` |
| vite | `^5.2.11` | `5.4.21` |

**Commands**

- `npm run dev` -> Vite dev server at `http://localhost:3000`
- `npm run build` -> `tsc && vite build`
- `npm run typecheck` -> `tsc --noEmit`
- `npm run preview` -> `vite preview`

**Entry point:** `index.html` -> `src/main.ts`

---

## 2. Architecture Map

### 2.1 File Index

| File | Responsibility |
|---|---|
| `index.html` | HTML shell. Sets the viewport, disables page zoom, mounts `#game-container`, and sets the browser tab title to `Fruit Pop`. |
| `vite.config.ts` | Vite config. Uses `base: './'`, `port: 3000`, `open: true`, `assetsDir: 'assets'`, and splits Phaser into its own chunk. |
| `tsconfig.json` | Strict TypeScript config. `moduleResolution: bundler`, `noEmit: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. |
| `package.json` | Scripts and dependency specs. |
| `src/main.ts` | Boots `Phaser.Game`, registers the Poki plugin, and declares scene order. |
| `src/scenes/BootScene.ts` | Initializes `ScaleManager` and `AudioManager`, then routes to `PreloadScene`. |
| `src/scenes/PreloadScene.ts` | Shows loading UI, generates placeholder textures (`fruit`, `splatter`, `particle`), and routes to `MenuScene`. Audio loads are still TODO comments. |
| `src/scenes/MenuScene.ts` | Title screen. Shows best score, mute toggle, animated fruit backdrop, and starts `CountdownScene`. |
| `src/scenes/CountdownScene.ts` | 3-2-1-GO intro before gameplay. Carries the current level and board progression into `GameScene`. |
| `src/scenes/GameScene.ts` | Core gameplay. Builds the dynamic fruit grid, applies the current level tuning, handles ripeness, taps, dirt meter, timer, scoring, pooling, and the `ResultScene` handoff. |
| `src/scenes/ResultScene.ts` | End screen for win/lose outcomes. Shows score, perfect pops, grade, level info, board size, and replay/menu actions. |
| `src/core/AudioManager.ts` | Static audio singleton with persisted mute/volume and browser unlock handling. |
| `src/core/Config.ts` | Runtime config wrapper around `GAME_CONFIG` and `BALANCING`, plus environment detection. |
| `src/core/SaveManager.ts` | Prefix-scoped `localStorage` helper and key registry. |
| `src/core/ScaleManager.ts` | Responsive Phaser scale config and orientation overlay. This is the only module that creates/removes DOM elements. |
| `src/data/gameConfig.ts` | Game title, canvas size, background color, debug flag, version, physics mode, target FPS. |
| `src/data/balancing.ts` | Fruit Pop tuning values, the 25-level progression table, dynamic board layout helpers, and legacy compatibility constants for dormant helpers. |
| `src/systems/ScoreSystem.ts` | Current score and persisted high score. |
| `src/systems/ComboSystem.ts` | Legacy helper. Not wired into the current Fruit Pop flow. |
| `src/systems/DifficultySystem.ts` | Legacy helper. Not wired into the current Fruit Pop flow. |
| `src/systems/SpawnSystem.ts` | Legacy helper. Not wired into the current Fruit Pop flow. |
| `src/components/ProgressBar.ts` | Reusable Phaser progress bar component. |
| `src/components/UIButton.ts` | Reusable Phaser button component. |
| `src/utils/helpers.ts` | Pure helpers such as `formatTime` and `formatScore`. |
| `src/types/fruitPop.ts` | Shared Fruit Pop result types. |
| `src/types/poki.d.ts` | Ambient typings for `@poki/phaser-3`. |

### 2.2 Current Scene Flow

`BootScene -> PreloadScene -> MenuScene -> CountdownScene -> GameScene -> ResultScene`

- `main.ts` registers Poki with `loadingSceneKey: 'PreloadScene'`, `gameplaySceneKey: 'GameScene'`, and `autoCommercialBreak: true`.
- `PreloadScene` completion is the loading boundary that Poki watches.
- `GameScene` is the gameplay boundary that Poki watches.
- `CountdownScene` is a local transition scene only; Poki does not watch it.
- `ResultScene` returns to `CountdownScene` with the next level after a win, or back to level 1 after a loss. `MenuScene` always resets to level 1.

### 2.3 Runtime Dependencies

```text
main.ts
  -> ScaleManager.getPhaserScaleConfig()
  -> BootScene, PreloadScene, MenuScene, CountdownScene, GameScene, ResultScene
  -> PokiPlugin global registration

BootScene
  -> ScaleManager.init()
  -> AudioManager.init()
  -> config
  -> BALANCING.bootDelay

PreloadScene
  -> ProgressBar
  -> config, GAME_CONFIG, BALANCING
  -> generates texture keys used by GameScene and MenuScene

MenuScene
  -> UIButton
  -> AudioManager
  -> SaveManager + SAVE_KEYS
  -> config, GAME_CONFIG, BALANCING

CountdownScene
  -> config, GAME_CONFIG, BALANCING
  -> getFruitPopLevel(), FRUIT_POP_MAX_LEVEL
  -> uses the `fruit` texture generated in PreloadScene

GameScene
  -> ScoreSystem -> SaveManager
  -> AudioManager
  -> getFruitPopLevel(), getFruitPopProgress(), getFruitPopBoardLayout(), FRUIT_POP_MAX_LEVEL
  -> formatTime
  -> config, GAME_CONFIG, BALANCING
  -> FruitPop result data types

ResultScene
  -> UIButton
  -> getFruitPopLevel(), FRUIT_POP_MAX_LEVEL
  -> formatScore
  -> config, GAME_CONFIG, BALANCING
  -> FruitPop result data types

AudioManager -> SaveManager -> localStorage
ScoreSystem -> SaveManager -> localStorage
ScaleManager -> window + document (orientation overlay only)
Config -> GAME_CONFIG, BALANCING
```

---

## 3. Critical Constraints

### 3.1 Poki scene keys must match exactly

`main.ts` uses:

```ts
loadingSceneKey: 'PreloadScene'
gameplaySceneKey: 'GameScene'
```

Keep the scene constructors aligned:

- `new BootScene({ key: 'BootScene' })`
- `new PreloadScene({ key: 'PreloadScene' })`
- `new MenuScene({ key: 'MenuScene' })`
- `new CountdownScene({ key: 'CountdownScene' })`
- `new GameScene({ key: 'GameScene' })`
- `new ResultScene({ key: 'ResultScene' })`

If `PreloadScene` or `GameScene` is renamed, update the constructor and Poki plugin data together.

### 3.2 SaveManager prefix is fixed

All saved values use the `pg_` prefix. Never write to `localStorage` directly from scenes or systems. Use `SaveManager.save`, `SaveManager.load`, `SaveManager.remove`, or `SaveManager.clearAll` and keys from `SAVE_KEYS`.

### 3.3 AudioManager is a singleton

Do not instantiate `AudioManager`. It is static-only and owns:

- persisted mute state
- SFX and music volume state
- current looping music track
- browser audio unlock listeners

`AudioManager.init(this)` is called once from `BootScene.init()`.

### 3.4 ScaleManager.getPhaserScaleConfig() stays in main.ts

The scale config is consumed when `new Phaser.Game(config)` runs. Keep `ScaleManager.getPhaserScaleConfig()` in the root game config. Do not move it into a scene.

### 3.5 DOM access is tightly scoped

`ScaleManager` is the only module that should create or remove DOM elements. `AudioManager` may attach and remove document-level event listeners for audio unlock, but it should not create UI or mutate page layout.

### 3.6 GameScene is the live gameplay contract

Current gameplay depends on these generated texture keys:

- `fruit`
- `splatter`
- `particle`

Keep those keys if you change `PreloadScene` generation. If you replace them with real assets, update `GameScene` at the same time.

`GameScene` starts `ResultScene` with `FruitPopResultData`:

```ts
{
  level: number,
  nextLevel: number,
  outcome: 'win' | 'lose',
  reason: string,
  score: number,
  perfectPops: number,
  totalFruits: number,
  highScore: number,
  isNewHighScore: boolean,
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
}
```

The current score is only awarded for perfect red pops, and the combo text is cosmetic. Keep the 25-level board progression separate from the moment-to-moment FruitState logic.

### 3.7 Scene order in main.ts is fragile

Keep the scene array in this order:

```ts
scene: [BootScene, PreloadScene, MenuScene, CountdownScene, GameScene, ResultScene]
```

`BootScene` must stay first.

### 3.8 Phaser globals are available

`Phaser` is available as an ambient global in scene files because `main.ts` imports the package. Scene files do not need to import `Phaser` directly.

### 3.9 Legacy systems are dormant

`ComboSystem`, `DifficultySystem`, and `SpawnSystem` still exist in `src/systems/`, but the current Fruit Pop scenes do not use them. Do not wire new Fruit Pop gameplay through them unless you are intentionally reviving the old starter-mode architecture.

### 3.10 There is no `public/assets/` folder in the repo

`PreloadScene` currently uses generated placeholder textures. Do not document `public/assets/` as an existing asset location unless you add it.

---

## 4. Modification Guide

### 4.1 Files to replace

| File | What to change |
|---|---|
| `src/scenes/GameScene.ts` | Replace the gameplay implementation if you are changing fruit ripeness, dirt rules, timer rules, board layout, pooling, or the `ResultScene` handoff. |
| `src/scenes/PreloadScene.ts` | Replace `loadAssets()` if you are adding real art/audio files. Keep the loading UI and transition logic intact. |
| `src/scenes/MenuScene.ts` | Replace if you are changing the title screen layout, entry flow, or best-score presentation. |
| `src/scenes/CountdownScene.ts` | Replace if the countdown flow or transition timing changes. |
| `src/scenes/ResultScene.ts` | Replace if you change the end-state layout, result copy, grade display, or replay/menu flow. |

### 4.2 Files to tune

| File | What to change |
|---|---|
| `src/data/balancing.ts` | Fruit size, grid size, board ramp values, level curve values, ripeness windows, timer length, dirt penalty, fail threshold, countdown timing, and effect timings. |
| `src/data/gameConfig.ts` | Title, canvas size, background color, debug flag, version, physics mode, target FPS. |

### 4.3 Files to extend

| File | What to add |
|---|---|
| `src/core/SaveManager.ts` | Add new entries to `SAVE_KEYS` before using them in storage. |
| `src/utils/helpers.ts` | Add pure utilities only. |
| `src/types/fruitPop.ts` | Add new result fields, level data, or shared Fruit Pop types if the result payload grows. |
| `src/types/poki.d.ts` | Add new Poki API declarations if the plugin surface grows. |

### 4.4 Files to avoid modifying unless necessary

| File | Why it is fragile |
|---|---|
| `src/core/AudioManager.ts` | Singleton state, persisted mute/volume, and browser unlock logic. |
| `src/core/SaveManager.ts` | Prefix rules and save compatibility. |
| `src/core/ScaleManager.ts` | Scale config order and orientation overlay behavior. |
| `src/components/UIButton.ts` | Stable pointer/touch interaction behavior. |
| `src/components/ProgressBar.ts` | Stable reusable component. |
| `src/main.ts` | Poki plugin data and scene order are fragile. |
| `index.html` | Required viewport, `touch-action`, and title behavior. |
| `src/systems/ComboSystem.ts` | Dormant legacy helper. |
| `src/systems/DifficultySystem.ts` | Dormant legacy helper. |
| `src/systems/SpawnSystem.ts` | Dormant legacy helper. |

---

## 5. System Contracts

### 5.1 ScoreSystem

```ts
constructor()
add(points: number): void
reset(): void
getScore(): number
getHighScore(): number
isNewHighScore(): boolean
clearHighScore(): void
```

- Loads persisted high score on construction.
- `add()` clamps score at 0 minimum.
- Writes a new high score through `SaveManager` whenever the current score exceeds the stored best.
- `isNewHighScore()` returns true when the current score is positive and at least the stored high score.

### 5.2 FruitPopResultData

```ts
interface FruitPopResultData {
  outcome: 'win' | 'lose'
  reason: string
  score: number
  perfectPops: number
  totalFruits: number
  highScore: number
  isNewHighScore: boolean
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
}
```

- `GameScene` passes this into `ResultScene`.
- `ResultScene` reads the same shape in `init(data)`.

### 5.3 AudioManager

```ts
static init(scene: Phaser.Scene): void
static playSfx(scene: Phaser.Scene, key: string, volume?: number): void
static playMusic(scene: Phaser.Scene, key: string, volume?: number): void
static stopMusic(): void
static toggleMute(): boolean
static setMuted(muted: boolean): void
static setSfxVolume(volume: number): void
static setMusicVolume(volume: number): void
static get muted(): boolean
static get sfxVolume(): number
static get musicVolume(): number
```

- `init()` loads persisted mute and volume state.
- It wires one-time browser audio unlock listeners for `touchstart`, `touchend`, `mousedown`, and `keydown`.
- Unlock listeners are removed after the first successful unlock.
- `playSfx()` and `playMusic()` no-op safely if the sound key is missing or audio is locked.

### 5.4 SaveManager

```ts
static save<T>(key: string, value: T): void
static load<T>(key: string, defaultValue: T): T
static remove(key: string): void
static clearAll(): void
static isAvailable(): boolean
```

- All keys are written as `pg_` + key.
- Storage failures are swallowed.

### 5.5 ScaleManager

```ts
static init(): void
static getPhaserScaleConfig(): Phaser.Types.Core.ScaleConfig
static isWrongOrientation(): boolean
static get viewportWidth(): number
static get viewportHeight(): number
```

- `init()` attaches `orientationchange` and `resize` listeners.
- `isWrongOrientation()` returns true for landscape viewports narrower than 900px.
- The overlay element id is `orientation-warning`.

### 5.6 UIButton

```ts
constructor(cfg: UIButtonConfig)
setText(text: string): this
setEnabled(enabled: boolean): this
get isDisabled(): boolean
```

- Auto-adds itself to the scene display list.
- Emits `click` on pointer-up.
- Enforces a minimum effective touch target of 44 x 44 px.

### 5.7 ProgressBar

```ts
constructor(cfg: ProgressBarConfig)
setValue(value: number): void
get value(): number
```

- Auto-adds itself to the scene display list.

### 5.8 Poki plugin typings

`src/types/poki.d.ts` declares:

- `PokiSDK`
- `PokiPluginData`
- `PokiPlugin` with `runWhenInitialized`, `rewardedBreak`, and `commercialBreak`

---

## 6. Common Tasks

### Add or change a fruit visual

1. Update the generated texture or asset load in `PreloadScene`.
2. Keep the `fruit`, `splatter`, and `particle` keys stable unless `GameScene` changes too.
3. Tune fruit tinting or state handling in `GameScene`.

### Tune the game feel

1. Edit `src/data/balancing.ts`.
2. Adjust the level table first, then tweak ripeness windows, dirt penalty, timer length, popup timing, or countdown timing.
3. Keep the scene code free of magic numbers where possible.

### Add a new saved value

1. Add a key to `SAVE_KEYS` in `src/core/SaveManager.ts`.
2. Save with `SaveManager.save(SAVE_KEYS.yourKey, value)`.
3. Load with `SaveManager.load(SAVE_KEYS.yourKey, defaultValue)`.

### Add a new scene

1. Create `src/scenes/MyScene.ts` with `super({ key: 'MyScene' })`.
2. Import it in `src/main.ts`.
3. Add it to the `scene` array in `main.ts`.
4. Keep `BootScene` first.

### Rebrand the game

1. Change `src/data/gameConfig.ts -> title`.
2. Change `index.html -> <title>`.
3. Update any in-scene title copy that uses `config.game.title`.

### Add real art or audio

1. Replace the generated textures in `PreloadScene`.
2. Add audio loads in the commented TODO block.
3. Keep the current keys stable if the rest of the code still depends on them.

### Touch the legacy systems

Only edit `ComboSystem`, `DifficultySystem`, or `SpawnSystem` if you are intentionally resurrecting the old starter architecture. Do not use them as the normal path for Fruit Pop gameplay.

---

## 7. Known Placeholders

The current code still contains intentional TODOs and stubs:

| Placeholder | Location | Meaning |
|---|---|---|
| Analytics hooks | `MenuScene`, `GameScene`, `ResultScene` | TODO comments for menu view, game start, gameplay, and result events. |
| Real audio loads | `PreloadScene.loadAssets()` | The audio asset lines are still commented out. No audio files are loaded yet. |
| Generated textures | `PreloadScene.loadAssets()` | `fruit`, `splatter`, and `particle` are generated at runtime for now. |
| Legacy compatibility values | `src/data/balancing.ts` | Extra tuning keys remain so dormant legacy helpers still compile. |

Notes:

- There is no `public/assets/` directory in the repo today.
- `GameScene` and `ResultScene` are already wired to the Fruit Pop result payload.

---

## 8. Test Checklist

Run these checks after changes that touch gameplay, assets, scene flow, storage, or Poki integration.

### Basic checks

- `npm run typecheck`
- `npm run build`
- `npm run dev`

### Scene flow

- BootScene transitions to PreloadScene quickly.
- PreloadScene shows the progress bar and then enters MenuScene.
- MenuScene shows title, play button, mute button, and best score when present.
- Play starts CountdownScene.
- CountdownScene shows `3`, `2`, `1`, `GO!` and then enters GameScene.
- GameScene renders a 5 x 3 fruit grid.
- ResultScene shows win or lose copy and returns to MenuScene or CountdownScene.

### GameScene

- Level 1 should feel slow, generous, and rewarding.
- Board size should start at `2x2` and grow toward `10x10` by level 25.
- Each cleared round should increase pressure in a visible way.
- Green and yellow fruit remove cleanly with no dirt penalty.
- Red fruit counts as a perfect pop and increments score and perfect pop count.
- Overripe fruit adds 20 dirt and can end the round at 100 dirt.
- Timer counts down and can end the round at zero.
- Clearing all fruit ends the round as a win.
- Splatter, popup text, and particle effects reuse pooled objects.

### ResultScene

- Final score displays correctly.
- Grade is shown and matches the result payload.
- `NEW BEST!` appears only on a new high score.
- The primary result button advances to the next level after a win, or retries at level 1 after a loss.
- `MENU` returns to `MenuScene`.
- `Enter` and `R` restart the game.

### Poki

- `loadingSceneKey` stays `PreloadScene`.
- `gameplaySceneKey` stays `GameScene`.
- `autoCommercialBreak` stays enabled in `main.ts`.
- No scene key drift between `main.ts` and the scene constructors.

### Audio and storage

- Mute state persists after reload.
- High score persists after reload.
- All stored keys are prefixed with `pg_`.
- Audio unlock remains safe on first touch or click.

### Responsive

- Canvas fits portrait screens.
- Orientation warning appears in landscape on small viewports.
- Buttons remain usable by touch.
- The page does not zoom on double-tap.

### Build output

- Build exits with code 0.
- `dist/` contains the built HTML and bundled assets.
- Phaser is split into its own chunk by Vite.
