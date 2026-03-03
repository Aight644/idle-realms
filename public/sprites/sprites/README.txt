BLADE REALMS — SPRITE ASSET STRUCTURE
======================================

All sprites: 64x64 pixel art, transparent PNG background
Animations: horizontal sprite sheets (frames side by side)

sprites/
  hero/                          — Player character (4 animations)
  monsters/
    ch1_meadow/                  — 5 monsters (idle + death each)
    ch2_caves/                   — 5 monsters
    ch3_swamp/                   — 5 monsters
    ch4_ruins/                   — 5 monsters
    ch5_volcano/                 — 5 monsters
    ch6_abyss/                   — 5 monsters
    ch7_titan/                   — 5 monsters
    ch8_rift/                    — 5 monsters
  bosses/
    ch1_meadow/                  — 5 bosses (idle + death each)
    ch2_caves/                   — 5 bosses
    ch3_swamp/                   — 5 bosses
    ch4_ruins/                   — 5 bosses
    ch5_volcano/                 — 5 bosses
    ch6_abyss/                   — 5 bosses
    ch7_titan/                   — 5 bosses
    ch8_rift/                    — 5 bosses
  pets/                          — 7 pet companions (static)
  boss_rush/                     — 8 boss rush enemies (idle + death)
  raids/                         — 6 raid bosses (idle + death)
  vfx/                           — 8 visual effects (sprite sheets)
  ui/                            — 6 UI elements (icons, frames)

TOTAL FILES: ~230 sprites

NAMING CONVENTION:
  [name]_idle.png        — idle/breathing animation
  [name]_death.png       — death/dissolve animation
  [name]_attack.png      — attack animation (hero only)
  [name]_hit.png         — hit reaction (hero only)

SPRITE SHEET FORMAT:
  Frames arranged horizontally left to right
  Each frame is 64x64 (or 32x32 for small icons)
  Example: 8-frame idle = 512x64 PNG

HOW TO INTEGRATE:
  Replace emoji divs in App.jsx with:
  <img src="/sprites/monsters/ch1_meadow/slime_idle.png"
       style={{ width: 64, height: 64, imageRendering: "pixelated" }} />

  For animations, use CSS background-position stepping:
  background: url('/sprites/hero/idle.png');
  background-size: 800% 100%;
  animation: spriteAnim 0.8s steps(8) infinite;
