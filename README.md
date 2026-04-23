# Fruit Pop

**Stack:** Phaser 3, TypeScript, Vite, Poki SDK
**Target platform:** Web, desktop + mobile, portrait-first
**Session length:** about 60 to 90 seconds

Fruit Pop is a single-screen tap game about timing. A grid of fruits slowly ripens, and the player must pop them at the right moment before the kitchen fills with dirt and the round ends.

The core tension is simple: pop too early and you waste potential, pop too late and the fruit goes rotten. Good timing gives satisfying feedback, score, and momentum.

## Core Loop

1. Spawn a fruit grid.
2. Fruits automatically ripen over time.
3. The player taps a fruit.
4. The result depends on ripeness:
   - too early: no reward
   - perfect: big reward
   - overripe: dirt penalty
5. Clear all fruit to win.
6. Reach the timer limit or dirt limit to lose.

## Controls

| Input | Behavior |
|---|---|
| Tap / Click | Pop the targeted fruit |
| No drag, no swipe, no hold | The game is tap-only |

Hitboxes should feel generous. The design target is an interactive area about 1.3x the visible fruit size.

## Game States

| State | Purpose |
|---|---|
| Menu | Animated fruit grid, logo, start prompt, best score |
| Countdown | 3-2-1-GO intro before active play |
| Game | Active ripening, tapping, dirt management, timer |
| Result: WIN | Clear-state celebration, score breakdown, replay |
| Result: LOSE | Failure state, reason text, retry |

## Entities

### Fruit Object

```js
{
  id,
  x,
  y,
  state,        // 0 = Green, 1 = Yellow, 2 = Red, 3 = Overripe
  stateTimer,
  isActive,
  wobblePhase,
  pulseSpeed,
  popCharge
}
```

### Runtime Game State

```js
{
  timer,
  dirtMeter,
  remainingFruits,
  perfectPops,
  totalPops,
  comboChain,
  roundSeed
}
```

### Visual Pool Objects

```js
// Splatter decal
{
  x, y, scale, rotation, alpha, lifetime, color, isActive
}

// Pop particle
{
  x, y, velocityX, velocityY, alpha, scale, lifetime, isActive
}

// Score popup text
{
  x, y, text, velocityY, alpha, lifetime, isActive
}
```

## Mechanics

### Ripeness System

Each fruit advances through four states:

| State | Name | Color | Time Window | Visual |
|---|---|---|---|---|
| 0 | Green | `#4CAF50` | 0 to 2500 ms | Small, firm |
| 1 | Yellow | `#FFC107` | 2500 to 5000 ms | Medium, slight wobble |
| 2 | Red | `#E53935` | 5000 to 7500 ms | Large, glowing, pulsing |
| 3 | Overripe | `#4E342E` | 7500 ms+ | Shrinking, dripping |

Each fruit should have a small random timing variance so the board does not ripen uniformly.

### Tap Outcomes

| State at tap | Outcome | Dirt Change | Score | Feedback |
|---|---|---|---|---|
| Green | Remove fruit | No change | 0 | Small green puff |
| Yellow | Remove fruit | No change | 0 | Medium yellow burst |
| Red | Remove fruit | No change | +1 perfect | Large explosion and screen flash |
| Overripe | Remove fruit | +20 dirt | 0 | Brown splatter and shake |

There is no "miss" state. Every tap removes the fruit. The cost of bad timing is dirt, not failed input.

### Dirt Meter

- Starts at 0
- Increases by 20 per overripe pop
- Fails at 100
- Does not decay
- Should read clearly in the HUD as a grime or sludge bar

### Timer

- Starts at 35 seconds
- Counts down in real time
- No pause once active
- Should turn urgent in the last 10 seconds
- Should become visually intense in the last 5 seconds

### Win / Lose Conditions

| Condition | Result |
|---|---|
| All fruits removed | Win |
| Timer reaches 0 | Lose |
| Dirt meter reaches 100 | Lose |

## Scoring

### Perfect Pop Count

Every Red-state pop increments `perfectPops`.

### End Screen Grades

| Perfect Pops | Grade | Label |
|---|---|---|
| All fruits at Red | S | MASTER CHEF |
| 70% or more | A | SKILLED PICKER |
| 50% or more | B | DECENT HARVEST |
| 30% or more | C | RUSHED JOB |
| Below 30% | D | PANIC FARMER |

The grade is display-only. It exists to give players a replay goal.

### Combo Display

Consecutive perfect pops can show a visual chain counter such as `x2`, `x3`, and so on. The combo is cosmetic in the GDD, not a gameplay multiplier.

## Juice and Feel

The game should feel fast and tactile. Target feedback timing is under 50 ms from tap to response.

### Core Feedback

- Pop particle burst, about 8 to 12 particles
- Screen shake for red and overripe pops
- Splatter decals that persist briefly
- Floating score text
- Fruit grow pulse while red

### Polish

- Idle wobble with fruit-specific offsets
- Dirt meter slosh animation
- Countdown pop-in
- Timer pulse at low time
- Win confetti
- Overripe drip particles
- Grade stamp animation

## UI Layout

| Element | Position | Notes |
|---|---|---|
| Dirt meter | Top left | Sludge fill style |
| Timer | Top right | Pulses near the end |
| Fruit grid | Center | Main interactive play area |
| Combo display | Bottom right | Fades after inactivity |
| Splatter decals | Background layer | Below fruit sprites |
| Score popup | At tap position | Floats upward and fades |

## Fruit Grid Layout

Default layout:

- 5 columns by 3 rows
- 15 fruits total
- centered on screen
- minimum 60 px padding from screen edges

Mobile portrait can switch to a denser layout if needed, but the interaction should remain touch-friendly.

## Technical Notes

### Scene Structure

- `BootScene`
- `MenuScene`
- `CountdownScene`
- `GameScene`
- `ResultScene`

### Performance Rules

- No allocation in `update()`
- Use pooling for splatters, particles, and score popups
- Drive ripeness with delta time
- Avoid `setTimeout` / `setInterval` for gameplay timing
- Use tinting for fruit state visuals instead of texture swapping

### Hitbox Rule

Use a hitbox larger than the visible fruit, about 1.3x the sprite size.

### State Thresholds

```js
const STATE_THRESHOLDS = {
  GREEN_TO_YELLOW: 2500,
  YELLOW_TO_RED: 5000,
  RED_TO_OVERRIPE: 7500
}

const DIRT_PER_OVERRIPE = 20
const TIMER_START = 35
const FRUIT_COUNT = 15
```

### Visual Colors

```js
const FRUIT_COLORS = {
  GREEN: 0x4CAF50,
  YELLOW: 0xFFC107,
  RED: 0xE53935,
  OVERRIPE: 0x4E342E
}

const SPLATTER_COLORS = {
  GREEN: 0x66BB6A,
  YELLOW: 0xFFD54F,
  RED: 0xEF5350,
  OVERRIPE: 0x6D4C41
}
```

## Audio Design

Audio is recommended but not required for the core loop.

| Event | Sound |
|---|---|
| Green pop | Light puff |
| Yellow pop | Medium squelch |
| Red pop | Big splat |
| Overripe pop | Low thud and splat |
| Countdown | Three short beeps |
| Win | Short fanfare |
| Lose | Descending sting |

## Asset List

Minimum viable assets:

- fruit base sprite or shape
- splatter sprites
- particle dot
- dirt bar background
- dirt bar fill

Graphics objects are acceptable for the first pass.

## Out of Scope

- Physics simulation
- Multiple fruit types
- Combo score bonuses that affect win/loss
- Meta progression
- Multi-level flow
- Multiplayer
- Leaderboards

## Implementation Order

1. Render the fruit grid.
2. Add tap-to-pop interaction.
3. Add timer and dirt loss conditions.
4. Add ripeness states.
5. Add perfect pop scoring.
6. Add game state transitions.
7. Add juice: particles, shake, splatter, score popups.
8. Add countdown, grades, and polish.
9. Add audio.
