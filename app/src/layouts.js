// Panel layouts for Palmera Poster Studio.
// Every layout is a function of the export size (w, h) and returns an array of
// panel rects in pixels. A gutter separates the panels like the white seams on
// a multi-panel game cover. Layouts adapt to landscape, square and portrait.

const GUTTER = 0.008; // fraction of the long side

function gutter(w, h) {
  return Math.max(4, Math.round(Math.max(w, h) * GUTTER));
}

/** Hero panel plus two stacked side panels — the classic multi-panel cover. */
export function layoutTrio(w, h) {
  const g = gutter(w, h);
  const wide = w > h;
  if (wide) {
    const heroW = Math.round(w * 0.56);
    return [
      { x: 0, y: 0, w: heroW - g, h },
      { x: heroW, y: 0, w: w - heroW, h: Math.round(h * 0.52) - g },
      { x: heroW, y: Math.round(h * 0.52), w: w - heroW, h: h - Math.round(h * 0.52) },
    ];
  }
  const heroH = Math.round(h * 0.6);
  return [
    { x: 0, y: 0, w, h: heroH - g },
    { x: 0, y: heroH, w: Math.round(w * 0.5) - g, h: h - heroH },
    { x: Math.round(w * 0.5), y: heroH, w: w - Math.round(w * 0.5), h: h - heroH },
  ];
}

/** Three equal panels, side by side in landscape, stacked in portrait. */
export function layoutStrip(w, h) {
  const g = gutter(w, h);
  const wide = w > h;
  if (wide) {
    const pw = Math.round(w / 3);
    return [
      { x: 0, y: 0, w: pw - g, h },
      { x: pw, y: 0, w: pw - g, h },
      { x: pw * 2, y: 0, w: w - pw * 2, h },
    ];
  }
  const ph = Math.round(h / 3);
  return [
    { x: 0, y: 0, w, h: ph - g },
    { x: 0, y: ph, w, h: ph - g },
    { x: 0, y: ph * 2, w, h: h - ph * 2 },
  ];
}

/** Two big panels with a title band — the cleanest poster. */
export function layoutDuo(w, h) {
  const g = gutter(w, h);
  const wide = w > h;
  if (wide) {
    const pw = Math.round(w / 2);
    return [
      { x: 0, y: 0, w: pw - g, h },
      { x: pw, y: 0, w: w - pw, h },
    ];
  }
  const ph = Math.round(h * 0.62);
  const pw = Math.round(w / 2);
  return [
    { x: 0, y: 0, w: pw - g, h: ph },
    { x: pw, y: 0, w: w - pw, h: ph },
    { x: 0, y: ph + g, w, h: h - ph - g },
  ];
}

/**
 * Four equal panels in a two-by-two grid. In landscape the whole frame is two
 * columns wide and two rows tall; in portrait it still reads as a grid but the
 * panels stay square-ish; in square it is simply 2 x 2.
 */
export function layoutQuad(w, h) {
  const g = gutter(w, h);
  const cols = 2;
  const rows = 2;
  const cw = Math.round(w / cols);
  const ch = Math.round(h / rows);
  const rects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c === 0 ? 0 : cw - g;
      const y = r === 0 ? 0 : ch - g;
      const pw = c === 0 ? cw - g : w - x;
      const ph = r === 0 ? ch - g : h - y;
      rects.push({ x, y, w: pw, h: ph });
    }
  }
  return rects;
}

export const LAYOUTS = {
  trio: { id: 'trio', name: 'Hero Trio', panels: layoutTrio, hint: 'Big hero + two stacked panels' },
  strip: { id: 'strip', name: 'Triple Strip', panels: layoutStrip, hint: 'Three equal panels' },
  duo: { id: 'duo', name: 'Duo Poster', panels: layoutDuo, hint: 'Two panels, title band' },
  quad: { id: 'quad', name: 'Quad Grid', panels: layoutQuad, hint: 'Four panels, two by two' },
};

/** Returns the panel rects for a layout id at the given size. */
export function panelsFor(layoutId, w, h) {
  const layout = LAYOUTS[layoutId] ?? LAYOUTS.trio;
  return layout.panels(w, h);
}
