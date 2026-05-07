# Game Studio Prompt — Fruit State Assets

Use this exact prompt in Game Studio to generate the three fruit state icons for Fruit Pop:

```text
Create 3 separate 2D game icon sprites of the same fruit, one per ripeness state:
1) unripe (green)
2) midripe (yellow/orange)
3) ripe (red)

Style constraints:
- casual mobile game style
- clean silhouette
- high contrast on light backgrounds
- same camera angle, same silhouette, same lighting for all 3
- centered composition
- transparent background
- no shadow outside silhouette
- no text

Output constraints:
- export as PNG with transparency
- square format, 256x256
- consistent pixel bounds across all 3 files (no size jitter)
- file names exactly:
  - fruit_unripe.png
  - fruit_midripe.png
  - fruit_ripe.png
```

Integration target in this project:
- Place exported PNG files in `public/assets/`
- Runtime keys already wired:
  - `fruit_unripe`
  - `fruit_midripe`
  - `fruit_ripe`
