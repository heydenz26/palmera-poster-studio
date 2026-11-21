// Cover renderer for Palmera Poster Studio.
// Draws the multi-panel poster onto any 2D canvas: photos per panel, colour
// grade (a main grade per cover, or an optional per-panel override), white
// gutters, and the bold caption lettering with tag chips. Everything is drawn
// in code — the app ships no artwork of its own.
//
// Posterise (illustration) pass: quantises photo panels to a limited palette
// and adds edge inking for a hand-drawn look. Drawn art panels (skyline, car,
// boat) bypass the photo branch and posterise, receiving only a light grade wash.
//
// Face-safe framing. Portrait photos carry the face and chin near the top, so a
// naive cover-fit that centres the whole photo can crop a chin at a panel edge
// (the original #4 shot did exactly that). Instead we:
//   - choose a starting zoom that leaves the photo's vertical middle band on
//     screen, and
//   - clamp panning so the photo's top sixth is never dragged above the panel.
// When the editor's Face-safe switch is on, the same clamp binds drag-panning;
// with it off, panning is only bounded by full coverage (you may show the foot).

import { panelsFor } from './layouts.js';
import { gradeFor } from './grades.js';
import { drawArt } from './artwork.js';

/** The top region of a photo we protect: roughly the top sixth. */
export const FACE_GUARD = 1 / 6;

/**
 * A panel's photo placement.
 * @typedef {{ photo: number, zoom: number, ox: number, oy: number, grade?: string, art?: string }} PanelState
 * photo is an index into state.photos; zoom >= 1; ox/oy are pan fractions.
 * art (optional): id of a drawn scene ('skyline'|'car'|'boat') — if set, the panel
 * renders that vector artwork instead of a photo.
 */

/**
 * The safe vertical pan range for a panel rect and an image draw size. In
 * face-safe mode the photo's top edge cannot rise above the top of the photo
 * minus FACE_GUARD of its height, so heads and chins near the top stay inside.
 * Returns { minO, maxO } as fractions of the rect height added to centre.
 */
function panRange(rect, dw, dh, faceSafe) {
  const { y, h } = rect;
  const minO = y + h - dh; // photo bottom at panel bottom
  const maxO = faceSafe ? y - (dh * FACE_GUARD) : y; // photo top at panel top (or guarded)
  const lo = Math.min(minO, maxO);
  const hi = Math.max(minO, maxO);
  // Express as pan fractions relative to the centered position.
  const centre = y + (h - dh) / 2;
  return { lo: (lo - centre) / h, hi: (hi - centre) / h };
}

/**
 * Computes a photo's draw rect (dx, dy, dw, dh) for a panel, applying zoom, pan
 * and the face-safe clamp. Returns both the final draw position and the pan
 * bounds so the editor can reuse them while dragging.
 */
export function photoDraw(ctx, img, rect, place, faceSafe) {
  const { x, y, w, h } = rect;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (place.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const range = panRange(rect, dw, dh, faceSafe);
  const ox = place.ox || 0;
  const oy = place.oy || 0;
  const dx = x + (w - dw) / 2 + Math.max(-0.5, Math.min(0.5, ox)) * w;
  const dy = y + (h - dh) / 2 + Math.max(range.lo, Math.min(range.hi, oy)) * h;
  return { dx, dy, dw, dh, panMin: range.lo, panMax: range.hi };
}

/** Draws one photo into a panel rect with cover-fit, zoom and pan. */
export function drawPanelPhoto(ctx, img, rect, place, faceSafe) {
  const { dx, dy, dw, dh } = photoDraw(ctx, img, rect, place, faceSafe);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Washes a grade gradient over a panel rect. */
export function drawGradeWash(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, grade.stops[0]);
  grad.addColorStop(1, grade.stops[1]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalCompositeOperation = grade.mode;
  ctx.globalAlpha = grade.alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Warm tint rising from the foot of the panel — the sunset/poster feel.
  const foot = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  foot.addColorStop(0, 'rgba(255, 90, 60, 0)');
  foot.addColorStop(1, grade.stops[1]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = foot;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Warm vignette so the caption stays readable.
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.35,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/**
 * Posterise (illustration) pass for a rect: quantises channels to `levels` steps
 * and adds edge inking where luminance changes sharply.
 * Rounds rect to integers, guards tiny rects, wrapped in try/catch.
 */
export function posterizeRect(ctx, rect, levels) {
  try {
    // Round rect to integer pixels
    const x = Math.round(rect.x);
    const y = Math.round(rect.y);
    const w = Math.round(rect.w);
    const h = Math.round(rect.h);
    if (w < 2 || h < 2) return;

    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;
    const step = 255 / (levels - 1);

    // First pass: compute luminance for each pixel
    const lum = new Float32Array(w * h);
    for (let i = 0, p = 0; i < w * h; i++, p += 4) {
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    // Second pass: quantise channels + edge inking
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const idx = j * w + i;
        const p = idx * 4;

        // Quantise each channel
        for (let c = 0; c < 3; c++) {
          const v = data[p + c];
          data[p + c] = Math.round(v / step) * step;
        }

        // Edge inking: compare luminance to right and below neighbours
        let ink = false;
        if (i + 1 < w) {
          const diffR = Math.abs(lum[idx] - lum[idx + 1]);
          if (diffR > 26) ink = true;
        }
        if (!ink && j + 1 < h) {
          const diffD = Math.abs(lum[idx] - lum[idx + w]);
          if (diffD > 26) ink = true;
        }
        if (ink) {
          data[p] *= 0.5;
          data[p + 1] *= 0.5;
          data[p + 2] *= 0.5;
        }
      }
    }

    ctx.putImageData(imgData, x, y);
  } catch (e) {
    // Failure leaves the photo untouched
    console.warn('posterizeRect failed:', e);
  }
}

/**
 * Fits a caption to the width and draws it in bold poster lettering. The caller
 * may pass captionSize (0..1) to scale the title within a safe band; the title
 * is always fitted to the cover width and never spills past it.
 */
export function drawTitle(ctx, w, h, title, subtitle, captionSize = 1) {
  const text = (title || '').trim().toUpperCase();
  if (!text) return;
  let size = Math.min(w * 0.12, h * 0.1) * (0.55 + 0.9 * captionSize);
  const setFont = (s) => {
    ctx.font = `900 ${s}px "Arial Black", Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(s * 0.02)}px`; } catch { /* older canvas */ }
  };
  setFont(size);
  while (ctx.measureText(text).width > w * 0.92 && size > 16) {
    size -= 2;
    setFont(size);
  }
  ctx.save();
  ctx.translate(w / 2, h * 0.85);
  ctx.rotate(-0.026);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.14);
  ctx.strokeStyle = 'rgba(10, 5, 20, 0.92)';
  // Hard offset shadow (no blur)
  ctx.shadowColor = 'rgba(15,0,20,0.9)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = size * 0.045;
  ctx.shadowOffsetY = size * 0.06;
  ctx.strokeText(text, 0, 0);
  // Vertical gradient fill: #ffffff -> #ffe9bb -> #ffb37a
  const titleGrad = ctx.createLinearGradient(0, -size * 0.6, 0, size * 0.6);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.5, '#ffe9bb');
  titleGrad.addColorStop(1, '#ffb37a');
  ctx.fillStyle = titleGrad;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  const sub = (subtitle || '').trim().toUpperCase();
  if (sub) {
    const subSize = Math.max(14, size * 0.3);
    ctx.save();
    ctx.font = `700 ${subSize}px Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(sub, w / 2, h * 0.94);
    ctx.restore();
  }
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/** Draws a small tag chip in a corner. */
export function drawChip(ctx, text, x, y, alignRight) {
  if (!text) return;
  const pad = 14;
  const h = 34;
  ctx.save();
  ctx.font = '700 17px Arial, Helvetica, sans-serif';
  try { ctx.letterSpacing = '2px'; } catch { /* older canvas */ }
  const tw = ctx.measureText(text.toUpperCase()).width;
  const bw = tw + pad * 2;
  const bx = alignRight ? x - bw : x;
  ctx.beginPath();
  ctx.roundRect(bx, y, bw, h, 8);
  ctx.fillStyle = 'rgba(8, 4, 18, 0.72)';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), bx + bw / 2, y + h / 2 + 1);
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/**
 * Draws the whole cover.
 * @param {HTMLCanvasElement} canvas
 * @param {object} state { photos, panels, layout, grade, title, subtitle, tag,
 *                         faceSafe, captionSize }
 * A panel may set its own grade (place.grade) to override the cover's grade.
 * A panel may set place.art to a scene id ('skyline'|'car'|'boat') to render
 * drawn artwork instead of a photo.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const mainGrade = gradeFor(state.grade);
  const faceSafe = state.faceSafe !== false;
  const rects = panelsFor(state.layout, w, h);
  // White cover board under the gutters.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    const place = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const grade = place.grade ? gradeFor(place.grade) : mainGrade;
    const img = state.photos[place.photo] || null;
    ctx.save();
    ctx.filter = grade.filter;
    if (place.art) {
      // Drawn artwork panel — skip photo branch and posterize
      drawArt(ctx, place.art, rect);
    } else if (img) {
      drawPanelPhoto(ctx, img, rect, place, faceSafe);
    } else {
      // Empty panel: a dusk gradient so the layout still reads.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#3a1c5e');
      g.addColorStop(1, '#12081f');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();

    // Posterise pass for photo panels (not art panels)
    if (!place.art && img && state.toon !== false) {
      posterizeRect(ctx, rect, 5);
    }

    // Grade wash — for art panels use a lighter alpha (art is already coloured)
    let washGrade = grade;
    if (place.art) {
      washGrade = { ...grade, alpha: grade.alpha * 0.35 };
    }
    drawGradeWash(ctx, rect, washGrade);
  });
  // Bottom shade for the lettering.
  const shade = ctx.createLinearGradient(0, h * 0.68, 0, h);
  shade.addColorStop(0, 'rgba(10,4,20,0)');
  shade.addColorStop(1, 'rgba(10,4,20,0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  drawTitle(ctx, w, h, state.title, state.subtitle, state.captionSize);
  drawChip(ctx, state.tag || '', w * 0.03, h * 0.035, false);
  drawChip(ctx, 'EST. 2026', w * 0.97, h * 0.035, true);
}
