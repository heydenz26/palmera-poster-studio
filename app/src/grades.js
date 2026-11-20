// Colour grades for Palmera Poster Studio.
// A grade is a photo filter (applied while the photo is drawn) plus a two-stop
// gradient washed over the panel in soft-light/overlay, plus a warm vignette.
// All of it is drawn in canvas — no network, no LUT files, deterministic.

export const GRADES = {
  sunset: {
    id: 'sunset',
    name: 'Vice Sunset',
    filter: 'saturate(1.3) contrast(1.07) brightness(1.02)',
    stops: ['#ff9a3d', '#ff2e88'],
    mode: 'overlay',
    alpha: 0.5,
    hint: 'Orange-to-pink dusk',
  },
  neon: {
    id: 'neon',
    name: 'Neon Nights',
    filter: 'saturate(1.45) contrast(1.08)',
    stops: ['#ff2ea6', '#00e5ff'],
    mode: 'overlay',
    alpha: 0.45,
    hint: 'Magenta-to-cyan glow',
  },
  gold: {
    id: 'gold',
    name: 'Gold Hour',
    filter: 'saturate(1.2) contrast(1.05) brightness(1.04)',
    stops: ['#ffb347', '#8a5a00'],
    mode: 'soft-light',
    alpha: 0.5,
    hint: 'Warm amber afternoon',
  },
  noir: {
    id: 'noir',
    name: 'Noir Red',
    filter: 'grayscale(1) contrast(1.18) brightness(1.06)',
    stops: ['#ff1f3d', '#1a1a2e'],
    mode: 'multiply',
    alpha: 0.28,
    hint: 'Black & white, red accent',
  },
  acid: {
    id: 'acid',
    name: 'Acid Arcade',
    filter: 'saturate(1.6) contrast(1.14) hue-rotate(10deg)',
    stops: ['#c8ff2e', '#00ff9d'],
    mode: 'overlay',
    alpha: 0.42,
    hint: 'Toxic green, arcade glow',
  },
  frost: {
    id: 'frost',
    name: 'Frostbite',
    filter: 'saturate(0.75) contrast(1.12) brightness(1.1) hue-rotate(180deg)',
    stops: ['#bfeaff', '#4f7cff'],
    mode: 'soft-light',
    alpha: 0.5,
    hint: 'Icy blue, chilled steel',
  },
};

/** Returns the grade for an id, falling back to sunset. */
export function gradeFor(gradeId) {
  return GRADES[gradeId] ?? GRADES.sunset;
}
