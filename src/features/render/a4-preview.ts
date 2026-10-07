/**
 * Pure helpers for the A4 page preview: the page size in CSS pixels, the page
 * count for a given document height, and the zoom levels with clamping and
 * stepping. Nothing here touches the DOM, so it is easy to test.
 */

/** CSS pixels per millimetre (96 px per inch, 25.4 mm per inch). */
export const PX_PER_MM = 96 / 25.4

/** A4 page width in millimetres. */
export const A4_WIDTH_MM = 210

/** A4 page height in millimetres. */
export const A4_HEIGHT_MM = 297

/** A4 page width in CSS pixels, rounded to a whole pixel. */
export const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * PX_PER_MM)

/** A4 page height in CSS pixels, rounded to a whole pixel. */
export const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * PX_PER_MM)

/** The smallest zoom factor offered (50%). */
export const MIN_ZOOM = 0.5

/** The largest zoom factor offered (200%). */
export const MAX_ZOOM = 2

/** The zoom factor used when the preview first opens (100%). */
export const DEFAULT_ZOOM = 1

/** The amount one zoom in or zoom out step changes the zoom factor by. */
export const ZOOM_STEP = 0.1

/** Rounds a zoom factor to two decimals so repeated steps do not drift. */
function roundZoom(zoom: number): number {
  return Math.round(zoom * 100) / 100
}

/**
 * Limits a zoom factor to the allowed range. A value that is not a finite
 * number falls back to the default zoom.
 */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return DEFAULT_ZOOM
  }
  return roundZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)))
}

/** Returns the zoom factor one step larger, never above the maximum. */
export function zoomIn(zoom: number): number {
  return clampZoom(zoom + ZOOM_STEP)
}

/** Returns the zoom factor one step smaller, never below the minimum. */
export function zoomOut(zoom: number): number {
  return clampZoom(zoom - ZOOM_STEP)
}

/** Formats a zoom factor as a whole percentage, for example "110%". */
export function formatZoom(zoom: number): string {
  return `${Math.round(clampZoom(zoom) * 100)}%`
}

/**
 * Returns the number of A4 pages needed for a document of the given height in
 * CSS pixels. An empty or invalid height still counts as one page, and a
 * height that is just over a page boundary rounds up to the next page. A
 * small tolerance stops sub-pixel rounding from adding a blank page.
 */
export function countPages(
  contentHeightPx: number,
  pageHeightPx: number = A4_HEIGHT_PX,
): number {
  if (!Number.isFinite(contentHeightPx) || contentHeightPx <= 0) {
    return 1
  }
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) {
    return 1
  }
  const tolerancePx = 1
  return Math.max(1, Math.ceil((contentHeightPx - tolerancePx) / pageHeightPx))
}

/** The size of the page stage that holds the preview frame. */
export interface PageStageSize {
  /** Width of the scaled stage in CSS pixels. */
  width: number
  /** Height of the scaled stage in CSS pixels. */
  height: number
}

/**
 * Returns the on-screen size of the stage for a page count and zoom factor:
 * the pages stacked on top of each other, scaled by the zoom. The stage lets
 * the page scroll area match the scaled content.
 */
export function getStageSize(pageCount: number, zoom: number): PageStageSize {
  const pages = Math.max(1, Math.floor(pageCount))
  const scale = clampZoom(zoom)
  return {
    width: Math.round(A4_WIDTH_PX * scale),
    height: Math.round(A4_HEIGHT_PX * pages * scale),
  }
}

/** Formats a page count for display, for example "2 pages". */
export function formatPageCount(pageCount: number): string {
  const pages = Math.max(1, Math.floor(pageCount))
  return pages === 1 ? '1 page' : `${pages} pages`
}