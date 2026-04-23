# 🍉 FRUIT POP — Game Design Document v2.0
### *A Phaser 3 Single-Screen Tap Game*
**Document Status:** Ready for Vibe Coding  
**Target Platform:** Web (Desktop + Mobile)  
**Engine:** Phaser 3  
**Session Length:** ~60–90 seconds

---

## 1. GAME OVERVIEW

**Fruit Pop** is a fast-paced, single-screen tap game where every moment of hesitation costs you. A grid of fruits slowly ripens before your eyes — tap them at peak ripeness for juicy satisfaction, or let them rot and watch your kitchen splatter into chaos.

The core fantasy is **satisfying destruction with consequence**: perfectly-timed pops feel explosive and rewarding, while rotten pops leave a disgusting mess that inches you toward failure. The tension between patience and urgency is everything.

**One-line pitch:** *"Pop fruits at perfect ripeness before your kitchen turns into a swamp."*

---

## 2. CORE LOOP

```
START
  │
  ▼
[Spawn fruit grid] ──→ [Fruits auto-ripen in real time]
                              │
                              ▼
                    [Player taps a fruit]
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
          [Too Early]    [PERFECT ✓]    [Overripe ✗]
          No reward      Big splatter   Dirt penalty
          Fruit gone     + Score        Dirt meter rises
               └──────────────┴──────────────┘
                              │
                    [All fruits cleared?]
                      │             │
                    YES             NO
                      │             │
                   WIN ✓    [Timer or Dirt hits limit?]
                                │          │
                               YES         NO
                                │          │
                             LOSE ✗   [Keep playing]
```

**The Strategic Layer:**  
Players must mentally juggle multiple fruits in different ripeness stages. Do you pop the Yellow one now (wasted, but safe) or wait for Red (max reward, risky overshoot)?

---

## 3. CONTROLS

| Input | Behavior |
|---|---|
| **Tap / Click** | Pop the targeted fruit |
| *(No drag, no swipe, no hold)* | — |

**Hitbox Rule:** Every fruit's interactive area is **1.3× its visual size** to ensure taps never feel unfair. On mobile, this is essential.

**Feel target:** Tapping should feel like popping bubble wrap — instant, crisp, satisfying.

---

## 4. GAME STATES

```
[Menu]
   │  (any tap)
   ▼
[Countdown: 3-2-1-GO!]       ← New state for polish
   │
   ▼
[Game: Active]
   │
   ├──→ All fruits removed  ──→ [Result: WIN]
   │                                   │
   ├──→ Timer ≤ 0           ──→ [Result: LOSE]   ──→ [Game: Active]
   │                                   │              (restart)
   └──→ Dirt ≥ 100          ──→ [Result: LOSE]
```

### State Details

**Menu**
- Animated fruit grid in background (idle looping ripeness)
- Logo + "TAP TO START" pulsing prompt
- Best score displayed if exists (localStorage)

**Countdown (3-2-1-GO!)**
- 3 large animated numbers, each with a pop sound + camera shake
- Fruits are visible but not yet interactive
- Builds anticipation without tutorial text

**Game: Active**
- Full gameplay (see Section 6)
- Timer shown prominently
- Dirt meter fills from left edge

**Result: WIN**
- Full-screen fruit confetti explosion
- Score + Perfect Pop count displayed
- "PERFECT HARVEST" or tier-based result label
- "PLAY AGAIN" button

**Result: LOSE**
- Screen shakes + splatter overlay floods view
- "TOO ROTTEN!" or "TIME'S UP!" message depending on fail condition
- Dirt meter slams to 100% on overripe fail (visual feedback)
- "TRY AGAIN" button

---

## 5. ENTITIES

### Fruit Object

```javascript
{
  id: Number,           // Unique identifier
  x: Number,           // World position X
  y: Number,           // World position Y
  state: Number,       // 0=Green | 1=Yellow | 2=Red | 3=Overripe
  stateTimer: Number,  // ms elapsed in current state
  isActive: Boolean,   // False = already popped
  wobblePhase: Number, // Offset for idle wobble animation (random 0–2π)
  pulseSpeed: Number,  // Individual ripening speed multiplier (0.9–1.1, adds variance)
  popCharge: Number,   // 0.0–1.0, animates the "charging" visual when hovering (desktop only)
}
```

### GameState (Runtime)

```javascript
{
  timer: Number,           // Seconds remaining (starts at 35)
  dirtMeter: Number,       // 0–100 (fail at 100)
  remainingFruits: Number, // Win condition check
  perfectPops: Number,     // Score counter (Red state pops)
  totalPops: Number,       // All pops regardless of state
  comboChain: Number,      // Consecutive perfect pops (display only, no gameplay effect)
  roundSeed: Number,       // Used to deterministically vary starting states
}
```

### Visual Pool Objects

```javascript
// Splatter decal (pooled, max 20 active)
{
  x, y,
  scale: Number,       // 0.5–1.5 random
  rotation: Number,    // 0–360 random
  alpha: Number,       // 1.0 → 0.0 over lifetime
  lifetime: Number,    // ms remaining
  color: HexColor,     // Matches fruit state color
  isActive: Boolean,
}

// Pop particle (pooled, max 60 active)
{
  x, y,
  velocityX, velocityY,
  alpha: Number,
  scale: Number,
  lifetime: Number,
  isActive: Boolean,
}

// Score popup text (pooled, max 10 active)
{
  x, y,
  text: String,        // "PERFECT!", "WEAK", "ROTTEN!"
  velocityY: Number,   // Floats upward
  alpha: Number,
  lifetime: Number,
  isActive: Boolean,
}
```

---

## 6. MECHANICS

### 6.1 Ripeness System

Each fruit progresses through **4 states** driven by delta time:

| State | Name | Color | stateTimer Threshold | Visual |
|---|---|---|---|---|
| 0 | Green | `#4CAF50` | 0 → 2500ms | Small, firm |
| 1 | Yellow | `#FFC107` | 2500 → 5000ms | Medium, slight wobble |
| 2 | Red | `#E53935` | 5000 → 7500ms | Large, glowing, pulsing |
| 3 | Overripe | `#4E342E` | 7500ms+ | Shrinking, dripping, urgent |

**State variance:** Each fruit has a `pulseSpeed` multiplier (0.9–1.1) so the grid doesn't ripen all at once. This creates the juggling challenge.

**Starting conditions:** On game start, fruits are seeded across different states:
- ~30% start at Green (early in timer)
- ~50% start at Yellow (approaching ripeness)
- ~20% start at Red (immediately actionable)
- 0% start at Overripe

This ensures the player has immediate decisions and the game starts with energy.

### 6.2 Tap Outcomes

| State at tap | Outcome | Dirt Change | Score | Visual Feedback |
|---|---|---|---|---|
| Green (0) | Fruit removed | ±0 | 0 | Small green puff |
| Yellow (1) | Fruit removed | ±0 | 0 | Medium yellow burst |
| **Red (2)** | **Fruit removed** | **±0** | **+1 Perfect** | **Massive explosion + screen flash** |
| Overripe (3) | Fruit removed | **+20 Dirt** | 0 | Brown splatter wave + screen shake |

**Design intent:** There is no "wrong" tap — the player always removes the fruit. The cost of bad timing is accumulating dirt, not losing a fruit. This keeps the game moving and avoids frustrating "missed click" moments.

### 6.3 Dirt Meter

- Starts at 0
- Increases by **+20** per Overripe pop
- **Maximum 5 overripe pops** before instant lose (100 dirt)
- No passive decay — once dirty, you stay dirty
- Visual: A "grime bar" along the top edge of the screen, fills left to right with a sludge animation

**Tension design:** With 5 overripe pops allowed, early safety leads to rising danger. Players who pop too early to "stay safe" may find themselves rushing later and missing perfect windows.

### 6.4 Timer

- Starts at **35 seconds**
- Decreases in real time each frame
- **No pausing** once game is active
- Last 10 seconds: timer text turns red and pulses
- Last 5 seconds: camera applies subtle chromatic aberration / screen edge vignette

### 6.5 Win/Lose Conditions

| Condition | Result |
|---|---|
| `remainingFruits === 0` | **WIN** |
| `timer <= 0` | **LOSE** (Time's Up) |
| `dirtMeter >= 100` | **LOSE** (Too Rotten) |

---

## 7. SCORING SYSTEM

### Perfect Pop Count
- Every Red-state pop increments `perfectPops`
- Displayed during gameplay (small counter, top right)
- Used for end-screen grade

### End-Screen Grades

| Perfect Pops | Grade | Label |
|---|---|---|
| All fruits at Red | S | "MASTER CHEF" |
| ≥ 70% Red pops | A | "SKILLED PICKER" |
| ≥ 50% Red pops | B | "DECENT HARVEST" |
| ≥ 30% Red pops | C | "RUSHED JOB" |
| < 30% Red pops | D | "PANIC FARMER" |

Grades are **display only** — they do not affect win/lose. Their purpose is to give players a personal goal to chase on replays.

### Combo Display (Visual Only)
- Consecutive perfect pops display a chain counter: `🔥 x2`, `🔥 x3`, etc.
- Resets on any non-perfect pop
- No gameplay bonus — purely a feel-good visual

---

## 8. DIFFICULTY PROGRESSION

This version is a **single static round** — no difficulty curve between runs.

However, **within a run**, natural tension escalates because:
1. Overripe fruits pile up pressure as the round progresses
2. The timer creates urgency that increases mistakes
3. The `pulseSpeed` variance means some fruits are always "about to go bad"

**Suggested future difficulty levers** (out of scope for v1):
- Reduce state thresholds (faster ripening)
- Increase fruit count
- Add penalty for Green/Yellow pops (waste meter)
- Reduce timer to 25s

---

## 9. JUICE & FEEL (Vibe Coding Priority List)

These are ranked by impact-to-effort ratio. Implement in order.

### Tier 1 — Must Have (Core Feel)
1. **Pop particle burst** — 8–12 particles fly outward on every pop, color-matched to state
2. **Screen shake** — Overripe pop triggers 200ms shake (intensity: 6px). Red pop triggers 100ms shake (intensity: 3px)
3. **Splatter decal** — Persistent stain spawns at pop location, fades over 4 seconds
4. **Score popup float** — "PERFECT!" floats upward and fades at tap position
5. **Fruit grow pulse** — Fruits subtly scale up/down on a sine wave while in Red state

### Tier 2 — High Impact
6. **Idle wobble** — All fruits gently sway with individual `wobblePhase` offset (never synchronized)
7. **Dirt meter goo animation** — Meter bar has a sloshing, liquid-fill animation
8. **Countdown flash** — 3-2-1 intro numbers scale up and pop with particle burst
9. **Timer red pulse** — Timer text beats like a heart when under 10s
10. **Win screen confetti** — 40+ fruit-colored particles rain down on WIN

### Tier 3 — Polish
11. **Camera zoom-in** on last fruit standing (if only 1 remains, subtle 1.05× zoom toward it)
12. **Chromatic aberration** edge effect when under 5s timer
13. **Overripe drip animation** — Small drip particles emit downward from Overripe fruits
14. **Grade reveal animation** — Letter grade stamps onto screen with ink-splat effect on WIN

---

## 10. UI ELEMENTS

### HUD Layout

```
┌─────────────────────────────────────────────────┐
│ [DIRT ██████░░░░░░░░ 40%]        [TIMER: 22.4s] │  ← Top bar
├─────────────────────────────────────────────────┤
│                                                 │
│         🍎  🍋  🍇  🍊  🍎                     │
│                                                 │
│         🍋  🍊  🍎  🍋  🍇                     │  ← Fruit grid
│                                                 │
│         🍊  🍎  🍇  🍊  🍋                     │
│                                                 │
│                                    [🔥 x3]      │  ← Combo display (bottom right)
└─────────────────────────────────────────────────┘
```

### Element Specs

| Element | Position | Update Frequency | Notes |
|---|---|---|---|
| Dirt meter bar | Top left | On overripe pop only | Sludge fill animation |
| Timer | Top right | Every frame | Red + pulse when < 10s |
| Fruit grid | Center | Every frame | 5×3 default layout |
| Combo counter | Bottom right | On pop | Fades after 2s of no pop |
| Splatter decals | Background layer | Fade over time | z-index below fruits |
| Score popup | At pop location | On pop | Floats up + fades |

---

## 11. FRUIT GRID LAYOUT

**Default configuration:** 5 columns × 3 rows = **15 fruits**

```
Spacing:   80px horizontal, 80px vertical
Origin:    Center of screen
Padding:   Minimum 60px from any screen edge
```

Grid is **fixed on spawn** — no positional changes after game start.

On **mobile** (portrait, screen width < 480px):
- Switch to 4×4 = 16 fruits
- Scale down fruit size by 0.8×
- Increase hitbox multiplier to 1.4× (larger touch targets)

---

## 12. TECHNICAL NOTES

### Architecture Notes for Phaser 3

```
Scenes:
  - BootScene       (preload assets)
  - MenuScene       (main menu)
  - CountdownScene  (3-2-1 overlay, can be overlaid on GameScene)
  - GameScene       (main gameplay)
  - ResultScene     (win/lose screen)

GameScene structure:
  - fruitGroup: Phaser.GameObjects.Group (fixed array, not dynamic)
  - splatterPool: ObjectPool (max 20)
  - particlePool: ObjectPool (max 60)
  - textPool: ObjectPool (max 10)
  - uiLayer: Container (timer, dirt meter, combo)
```

### Performance Rules
- **No `new` calls in `update()`** — all objects pre-allocated via object pools
- Ripeness handled per-fruit via `delta` in `update()` (no setTimeout/setInterval)
- Splatter decals: use `setAlpha()` on pooled sprites, never `destroy()`
- Fruit tint: use `setTint(color)` for state visualization — no texture swaps
- Max draw calls target: < 80 per frame on mobile

### Hitbox
- Interactive area: `1.3×` visual size
- Use `setInteractive({ useHandCursor: true })` with custom hitArea circle

### State Transition Table

```javascript
const STATE_THRESHOLDS = {
  GREEN_TO_YELLOW:  2500,   // ms
  YELLOW_TO_RED:    5000,   // ms
  RED_TO_OVERRIPE:  7500,   // ms
};

const DIRT_PER_OVERRIPE = 20;
const TIMER_START = 35;     // seconds
const FRUIT_COUNT = 15;     // 5×3 grid
```

### Visual State Colors

```javascript
const FRUIT_COLORS = {
  GREEN:    0x4CAF50,
  YELLOW:   0xFFC107,
  RED:      0xE53935,
  OVERRIPE: 0x4E342E,
};

const SPLATTER_COLORS = {
  GREEN:    0x66BB6A,
  YELLOW:   0xFFD54F,
  RED:      0xEF5350,
  OVERRIPE: 0x6D4C41,
};
```

---

## 13. AUDIO DESIGN (Optional but Recommended)

Even simple audio dramatically increases feel. Target: **< 200kb total**.

| Event | Sound | Character |
|---|---|---|
| Green pop | Light "puff" | Short, quiet, airy |
| Yellow pop | Medium "squelch" | Wetter, slightly satisfying |
| **Red pop** | **Big "SPLAT"** | **Full, wet, deeply satisfying** |
| Overripe pop | Low "THUD + splat" | Gross, heavy |
| Countdown beep | Tick sound × 3 | Crisp, tension-building |
| Win jingle | 2-second fanfare | Bright, punchy |
| Lose sting | 1-second descend | Sad wah |

**Audio dependency rule:** Core loop must be fully playable and feel complete without audio. Audio is additive enhancement only.

---

## 14. ASSET LIST

### Sprites Needed (Minimum Viable)

| Asset | Type | Notes |
|---|---|---|
| `fruit_base` | Sprite / shape | Single round fruit shape, tinted per state |
| `splatter_01` through `splatter_04` | Sprite | 4 asymmetric blob shapes, randomly assigned |
| `particle_dot` | Sprite | 4px circle, used for all pop particles |
| `dirt_bar_bg` | Sprite / shape | Meter background |
| `dirt_bar_fill` | Sprite | Sloshing fill overlay |

**Recommended approach for vibe coding:** Use Phaser `Graphics` objects + `setTint()` for MVP. Replace with hand-drawn sprites in polish pass.

---

## 15. OUT OF SCOPE (v1)

| Feature | Reason |
|---|---|
| Physics simulation | Adds complexity, not fun for this game type |
| Multiple fruit types | Adds cognitive load without depth |
| Combo score bonuses | Would change win condition balance |
| Upgrades / meta progression | Scope creep |
| Multi-level flow | Single round is the full experience |
| Multiplayer | Out of scope |
| Leaderboards | Out of scope |
| Audio as requirement | Optional, not gating |

---

## 16. VIBE CODING IMPLEMENTATION ORDER

Build in this sequence to always have a playable, shippable state:

**Phase 1 — Skeleton (Playable)**
1. GameScene with fruit grid rendered as colored circles
2. Click/tap to remove fruit
3. Timer countdown
4. Win/Lose detection + simple result text

**Phase 2 — Core Mechanics**
5. Ripeness state system with tint changes
6. Dirt meter + overripe penalty
7. Perfect pop counter
8. Game state transitions (Menu → Countdown → Game → Result)

**Phase 3 — Juice (Feel)**
9. Pop particle burst
10. Screen shake on overripe
11. Splatter decals (pooled)
12. Floating score text
13. Idle fruit wobble

**Phase 4 — Polish**
14. Countdown 3-2-1 scene
15. Grade system + win screen
16. Timer danger state (red pulse)
17. Overripe drip particles
18. Audio integration

---

*End of Document — FruitPop GDD v2.0*
