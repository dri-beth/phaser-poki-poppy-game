# AGENTS.md - AI Agent Reference for phaser-poki-poppy-game

> Written for AI coding agents. Treat the codebase as the source of truth.
> Human-facing design notes live in README.md, but code wins on conflicts.

---

## 1. Project Overview

**What this repo is:** a Phaser 3 + TypeScript + Vite Poki browser game called **Poppy**. The current implementation is a bubble-pop board game with combo scoring, board refills, Poki ad hooks, persisted mute/high score, and responsive portrait scaling.

**Target platform:** Poki web games, portrait-first, base canvas 480x854.

**Installed versions**

| Package | package.json spec | Installed |
|---|---|---|
| phaser | ^3.80.1 | 3.90.0 |
| @poki/phaser-3 | ^0.0.5 | 0.0.5 |
| typescript | ^5.4.5 | 5.9.3 |
| vite | ^5.2.11 | 5.4.21 |

All four are devDependencies.

**Commands**

- `npm run dev` -> `vite` on `http://localhost:3000` with `host: true` and `open: true`
- `npm run build` -> `tsc && vite build`
- `npm run typecheck` -> `tsc --noEmit`
- `npm run preview` -> `vite preview`

**Entry point:** `index.html` -> `src/main.ts`

---

## 2. Architecture Map

### 2.1 File Index

| File | Responsibility |
|---|---|
| `index.html` | HTML shell. Sets the mobile viewport, `touch-action: none`, and mounts `#game-container`. The browser tab title is currently `My Game`. |
| `vite.config.ts` | Vite config. Uses `base: './'`, `port: 3000`, `open: true`, and splits Phaser into its own chunk. |
| `tsconfig.json` | Strict TS config. `moduleResolution: bundler`, `noEmit: true`, `types: ["vite/client"]`. |
| `package.json` | Scripts and dependency specs. |
| `src/main.ts` | Boots Phaser, registers the Poki plugin globally, and starts the scene stack. |
| `src/scenes/BootScene.ts` | Initializes `ScaleManager` and `AudioManager`, then fades into `PreloadScene` after `BALANCING.bootDelay`. |
| `src/scenes/PreloadScene.ts` | Shows loading UI, generates placeholder textures (`bubble`, `bubble_ring`, `particle`), and transitions to `MenuScene`. Audio loads are still TODO comments. |
| `src/scenes/MenuScene.ts` | Title screen, play button, mute toggle, high score display, keyboard shortcuts. |
| `src/scenes/GameScene.ts` | Core gameplay. Builds the bubble grid, handles taps, combo scoring, pop FX, board clear/refill, HUD, and the handoff to `ResultScene`. |
| `src/scenes/ResultScene.ts` | End-of-session summary, count-up animation, play-again/menu buttons, rewarded-ad placeholder. |
| `src/core/AudioManager.ts` | Static audio singleton with persisted mute and volume state plus browser audio unlock handling. |
| `src/core/Config.ts` | Runtime config wrapper around `GAME_CONFIG` and `BALANCING`, plus simple environment detection. |
| `src/core/SaveManager.ts` | Prefix-scoped localStorage wrapper and key registry. |
| `src/core/ScaleManager.ts` | Responsive Phaser scale config and orientation-warning overlay. This is the only module that creates/removes DOM elements. |
| `src/data/gameConfig.ts` | Game title, canvas size, background color, debug flag, version, physics mode, target FPS. |
| `src/data/balancing.ts` | Board dimensions, pop timings, combo tiers, refill timings, scene fades, boot delay, and dormant difficulty values. |
| `src/systems/ScoreSystem.ts` | Current score plus persisted high score. |
| `src/systems/ComboSystem.ts` | Streak-to-multiplier mapping used by `GameScene`. |
| `src/systems/DifficultySystem.ts` | Time-based difficulty helper. Present, but currently unused by the scenes. |
| `src/systems/SpawnSystem.ts` | Delta-driven spawn scheduler. Present, but currently unused by the scenes. |
| `src/components/ProgressBar.ts` | Reusable Phaser graphics progress bar. |
| `src/components/UIButton.ts` | Reusable Phaser button component. |
| `src/utils/helpers.ts` | Pure helper functions such as `formatScore`. |
| `src/types/poki.d.ts` | Ambient typings for `@poki/phaser-3`. |

### 2.2 Current Scene Flow

`BootScene` -> `PreloadScene` -> `MenuScene` -> `GameScene` -> `ResultScene`

- `main.ts` registers Poki with `loadingSceneKey: 'PreloadScene'`, `gameplaySceneKey: 'GameScene'`, and `autoCommercialBreak: true`.
- `PreloadScene` completion is the loading boundary that Poki watches.
- `GameScene` is the gameplay boundary that Poki watches.
- `GameScene` also calls `commercialBreak()` when a board is cleared, then refills the board.
- `ResultScene` can return to `GameScene` or `MenuScene`.

There is no enemy/lives loop in the current codebase. The active gameplay loop is board-pop -> combo score -> board clear -> refill.

### 2.3 System Dependency Graph

```text
main.ts
  -> ScaleManager.getPhaserScaleConfig()
  -> BootScene, PreloadScene, MenuScene, GameScene, ResultScene
  -> PokiPlugin global registration

BootScene
  -> ScaleManager.init()
  -> AudioManager.init()
  -> config
  -> BALANCING.bootDelay

PreloadScene
  -> ProgressBar
  -> config, GAME_CONFIG, BALANCING
  -> generates texture keys used by GameScene

MenuScene
  -> UIButton
  -> AudioManager
  -> SaveManager + SAVE_KEYS
  -> config, GAME_CONFIG, BALANCING

GameScene
  -> ScoreSystem -> SaveManager
  -> ComboSystem -> BALANCING.comboStreakThresholds / comboMultipliers
  -> AudioManager
  -> formatScore
  -> config, GAME_CONFIG, BALANCING

ResultScene
  -> UIButton
  -> formatScore
  -> config, GAME_CONFIG, BALANCING

AudioManager -> SaveManager -> localStorage
ScaleManager -> window + document (orientation overlay only)
```

---

## 3. Critical Constraints

### 3.1 Scene keys must match Poki plugin config

`main.ts` uses:

```ts
loadingSceneKey: 'PreloadScene'
gameplaySceneKey: 'GameScene'
```

The scene constructors must keep the same keys:

- `new BootScene({ key: 'BootScene' })`
- `new PreloadScene({ key: 'PreloadScene' })`
- `new MenuScene({ key: 'MenuScene' })`
- `new GameScene({ key: 'GameScene' })`
- `new ResultScene({ key: 'ResultScene' })`

If `PreloadScene` or `GameScene` is renamed, update the constructor and the Poki plugin data together.

### 3.2 `SaveManager` key prefix is fixed

All saved values use the `pg_` prefix. Never write to localStorage directly from scenes or systems. Use `SaveManager.save/load/remove/clearAll` and keys from `SAVE_KEYS`.

### 3.3 `AudioManager` is a singleton

Do not instantiate it. It is static-only and owns:

- persisted mute state
- SFX/music volume state
- current looping music track
- browser audio unlock listeners

`AudioManager.init(this)` is called once from `BootScene.init()`.

### 3.4 `ScaleManager.getPhaserScaleConfig()` must stay in `main.ts`

The scale config is consumed at `new Phaser.Game(config)` time. Keep the call in the root game config and do not move it into a scene.

### 3.5 DOM access is tightly scoped

`ScaleManager` is the only module that should create/remove DOM elements. `AudioManager` may add/remove document-level event listeners for audio unlock, but it should not create UI or mutate the page layout.

### 3.6 GameScene state is board-based

`GameScene` currently depends on these texture keys being available:

- `bubble`
- `bubble_ring`
- `particle`

If you replace the placeholder texture generation in `PreloadScene`, keep those keys or update `GameScene` at the same time.

`GameScene` also starts `ResultScene` with `{ score, highScore, isNewHighScore }`. Keep the sender and receiver in sync if you add or rename fields.

### 3.7 Scene startup order

The scene array in `main.ts` must keep `BootScene` first:

```ts
scene: [BootScene, PreloadScene, MenuScene, GameScene, ResultScene]
```

### 3.8 Phaser globals

`Phaser` is available as an ambient global in scene files because `main.ts` imports the Phaser package. Scene files do not need to import Phaser directly.

---

## 4. Modification Guide

### 4.1 Files to replace

| File | What to change |
|---|---|
| `src/scenes/GameScene.ts` | Replace the gameplay implementation if you are changing the board rules, bubble states, combo flow, scoring, board clear/refill behavior, HUD, or the ResultScene handoff. The current methods to understand are `createBackground()`, `createParticleEmitter()`, `createBoard()`, `onBubbleTap()`, `playPopFX()`, `onBoardCleared()`, `refillBoard()`, `createHUD()`, `updateHUD()`, and `exitToMenu()`. |
| `src/scenes/PreloadScene.ts` | Replace `loadAssets()` if you are adding real asset files. Keep the loading UI and the transition to `MenuScene`. |

### 4.2 Files to tune

| File | What to change |
|---|---|
| `src/data/balancing.ts` | Board size, bubble size, pop timings, combo thresholds/multipliers, refill timings, scene fades, boot delay, and the dormant difficulty constants. |
| `src/data/gameConfig.ts` | Title, width, height, background color, debug flag, version, and target FPS. If you rebrand, update `index.html`'s `<title>` too. |

### 4.3 Files to extend

| File | What to add |
|---|---|
| `src/core/SaveManager.ts` | Add new entries to `SAVE_KEYS` before using them in storage. |
| `src/utils/helpers.ts` | Add pure utilities only. |
| `src/types/poki.d.ts` | Add new Poki API declarations if the plugin surface grows. |
| `src/scenes/PreloadScene.ts` | Add real `this.load.image`, `this.load.audio`, or `this.load.spritesheet` calls. |

### 4.4 Files to avoid modifying unless necessary

| File | Why it is fragile |
|---|---|
| `src/core/AudioManager.ts` | Singleton state, persisted mute/volume, and browser unlock logic. |
| `src/core/SaveManager.ts` | Prefix rules and existing save compatibility. |
| `src/core/ScaleManager.ts` | Scale config order and orientation overlay behavior. |
| `src/components/UIButton.ts` | Tested pointer and touch interaction states. |
| `src/components/ProgressBar.ts` | Stable reusable component. |
| `src/main.ts` | Poki plugin data and scene order are fragile. |
| `index.html` | Required viewport and `touch-action` behavior. |

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

### 5.2 ComboSystem

```ts
constructor(thresholds: readonly number[], multipliers: readonly number[])
onPop(): number
reset(): void
get streak(): number
get multiplier(): number
multiplierAt(streak: number): number
```

- Used by `GameScene`.
- The current balancing data maps streaks `[0, 5, 10, 15]` to multipliers `[1, 2, 3, 5]`.
- `onPop()` increments streak and returns the new multiplier.
- `reset()` returns the combo to 1x.

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

- `init()` loads persisted state and wires document unlock listeners for `touchstart`, `touchend`, `mousedown`, and `keydown`.
- `playSfx()` and `playMusic()` no-op safely if audio is missing or the context is not ready.
- Mute and volume changes persist through `SaveManager`.

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
- Enforces a minimum effective touch target of 44x44 px.

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

### Add a new bubble theme

1. Update the palette constants and bubble tint logic in `GameScene`.
2. If the theme needs new art, add real asset loads in `PreloadScene.loadAssets()`.
3. Keep the required texture keys (`bubble`, `bubble_ring`, `particle`) unless `GameScene` is updated too.

### Add a new saved value

1. Add a key to `SAVE_KEYS` in `src/core/SaveManager.ts`.
2. Save with `SaveManager.save(SAVE_KEYS.yourKey, value)`.
3. Load with `SaveManager.load(SAVE_KEYS.yourKey, defaultValue)`.

### Add a rewarded ad

1. Use `this.plugins.get('poki')` in `ResultScene`.
2. Call `rewardedBreak()` from a delayed callback if you want a short UI pause first.
3. Keep the reward logic isolated so the scene still works when the plugin is unavailable.

### Add a new UI button

```ts
new UIButton({
  scene: this,
  x: 100,
  y: 100,
  width: 200,
  height: 56,
  label: 'SETTINGS',
  onClick: () => this.scene.start('SettingsScene')
})
```

### Add a new scene

1. Create `src/scenes/MyScene.ts` with `super({ key: 'MyScene' })`.
2. Import it in `src/main.ts`.
3. Add it to the `scene` array.
4. Keep `BootScene` at index 0.

### Rebrand the game

1. Change `src/data/gameConfig.ts` -> `title`.
2. Change `index.html` -> `<title>`.
3. Update any in-scene title text that uses `config.game.title`.

---

## 7. Known Placeholders

The current code still contains intentional TODOs and stubs:

| Placeholder | Location | What it means |
|---|---|---|
| Analytics hooks | `MenuScene`, `GameScene`, `ResultScene` | TODO comments for menu view, game start, board clear, result view, and restart events. |
| Rewarded ad hook | `ResultScene` | The ad callback is commented out and not active yet. |
| Real audio loads | `PreloadScene.loadAssets()` | Audio asset lines are still commented out. No audio files are loaded today. |
| Browser tab title | `index.html` | Still says `My Game` while the in-game title is `Poppy`. |

Notes:

- There is no `public/assets/` directory in the repo today.
- The existing game works with generated placeholder textures, so if you replace them, update the gameplay code that depends on those keys.

---

## 8. Test Checklist

Run these after any change that touches gameplay, assets, scene flow, storage, or the Poki integration.

### Basic checks

- `npm run typecheck`
- `npm run build`
- `npm run dev`

### Scene flow

- Game starts in `BootScene`.
- `BootScene` transitions to `PreloadScene` quickly.
- `PreloadScene` shows a loading bar and then enters `MenuScene`.
- `MenuScene` shows the title, tagline, play button, mute button, and high score when present.
- `PLAY` transitions to `GameScene`.

### GameScene

- Bubble grid renders at startup.
- Tapping a bubble pops it and disables interaction on that cell.
- Combo text appears when the multiplier is above 1x.
- Score increases on pops.
- Pop FX trigger: scale punch, ring ripple, flash, particles, haptic.
- Clearing the board triggers a Poki commercial break when available.
- Board refills after the break.
- Exit button takes the player to `ResultScene` with score data.

### ResultScene

- Final score displays correctly.
- Score count-up animation runs.
- `NEW BEST!` appears only for a new high score.
- `PLAY AGAIN` returns to `GameScene`.
- `MENU` returns to `MenuScene`.
- `Enter` and `R` restart the game.

### Poki

- No `gameLoadingFinished` or `gameplayStart` / `gameplayStop` errors.
- `PreloadScene` and `GameScene` keys match the plugin config exactly.
- `autoCommercialBreak` remains enabled in `main.ts`.

### Audio and storage

- Mute state persists after reload.
- High score persists after reload.
- All stored keys are prefixed with `pg_`.
- Audio helpers no-op safely when assets are missing.

### Responsive

- Canvas fits portrait screens.
- Orientation warning appears in landscape on small viewports.
- Buttons remain usable by touch.
- The page does not zoom on double-tap.

### Build output

- Build exits with code 0.
- `dist/` contains the built HTML and bundled assets.
- Phaser is split into its own chunk by Vite.
