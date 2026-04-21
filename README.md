# Poppy Game — Game Design Document

**Stack:** Phaser 3 · TypeScript · Vite · Poki SDK
**Template base:** tatosgames/phaser-poki-starter
**Target platform:** Browser (desktop + mobile) via Poki
**Genre:** Casual / Fidget / Pop simulation
**Monetization:** Poki ad-breaks (commercial + rewarded)

---

## 1. Concept

A fidget-toy pop game. Bubbles on a virtual board respond to taps with multi-sensory feedback: visual pop, sound, particles, haptic. Four game modes from pure zen to rhythm challenges.

Core interaction: TAP BUBBLE → POP FX (visual + audio + particle + haptic) → COUNTER +1 → mode logic

---

## 2. Game Modes

### Zen Mode
No timer, no rules. Pop everything at your own pace. Board refills when all bubbles are popped.

### Pattern Mode
A target pattern is shown for 2 seconds, then hidden. Pop the correct bubbles from memory. Complexity increases each round. Mistake = wrong bubble turns red, 500 ms penalty freeze.

### Rhythm Mode
Bubbles light up in sync with a beat. Pop them in time to the music. Uses AudioContext.currentTime for sub-frame timing accuracy. Visual cue fires VISUAL_LEAD_MS before the beat so it arrives exactly on time.

### Daily Mode
One unique 5x5 board per day (seeded by date). Poki leaderboard. Best time wins.

---

## 3. Pop Feedback System

All feedback channels must fire within < 50 ms of the tap event.

- **Visual:** Scale punch tween (80 ms, Back.easeIn) + ring ripple (alpha fade, 300 ms) + cell colour flash (60 ms)
- **Audio:** AudioContext.createBufferSource() fired directly — not Phaser Sound — for minimum latency. Pitch randomized +-20%.
- **Particles:** 8-particle burst, pooled, explode() on tap
- **Haptic:** navigator.vibrate(12) on mobile — 12 ms, subtle

---

## 4. Board System

Default: 5x5 grid = 25 bubbles. Larger boards (6x6, 7x7) unlocked in later themes.

Refill animation (Zen mode): staggered pop-in with delay = (row + col) * 30 ms.

Bubble states: idle | highlighted | popped | refilling

---

## 5. Themes (6, hot-swap)

| # | Theme | Palette | Sound |
|---|-------|---------|-------|
| 1 | Classic | Pastel pink/blue | Soft pop |
| 2 | Neon | Cyan/magenta | Synth blip |
| 3 | Candy | Orange/yellow | Candy crunch |
| 4 | Ocean | Teal/white | Water bubble |
| 5 | Night | Purple/dark | Low thud |
| 6 | Minimal | Grey/white | Click |

All themes loaded in PreloadScene for instant hot-swap — no reload.

---

## 6. Scoring

| Mode | Formula |
|------|---------|
| Zen | Total pops x combo multiplier |
| Pattern | Accuracy % x speed bonus |
| Rhythm | Perfect/Good/Miss x streak multiplier |
| Daily | Time to clear board (lower = better) |

Combo multiplier (Zen + Rhythm): 1x -> 2x -> 3x -> 5x. Resets after 2 s pause.

---

## 7. Accessibility

- **Reduced motion:** skips scale punch and ring ripple, colour flash only
- **Colour-blind:** shape + pattern fills instead of colour-only differentiation
- **WCAG 2.1 s2.3.1:** flashes capped at < 3 per second (MIN_FLASH_INTERVAL_MS = 333)

---

## 8. Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 desktop / 30 mobile |
| Tap-to-feedback latency | < 50 ms |
| Audio latency (WebAudio) | < 10 ms |
| Particle count per pop | 8 (pooled) |
| JS bundle gzip | < 250 KB |
| Total assets | < 4 MB |

---

## 9. Poki SDK Integration

- gameplayStart() on mode session begin
- gameplayStop() + commercialBreak() between board clears
- rewardedBreak() to unlock theme early

---

## 10. Development Roadmap

| Milestone | Deliverable |
|-----------|------------|
| M1 | Board render + tap detection + pop FX |
| M2 | Zen Mode + refill animation |
| M3 | 6 themes + hot-swap |
| M4 | Pattern Mode |
| M5 | BeatScheduler + Rhythm Mode |
| M6 | Daily Mode + Poki leaderboard |
| M7 | Accessibility pass (reduced motion, colour-blind, WCAG flash) |
| M8 | Poki SDK + polish + review submission |

---

*GDD v1.0 — tatosgames/poppy-game*
