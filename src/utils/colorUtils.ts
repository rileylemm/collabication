/**
 * Utility functions for color manipulation and generation
 */

/**
 * Generate a random color in hexadecimal format
 * @returns A random color in the format '#RRGGBB'
 */
export function randomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * Check if a color is light or dark
 * @param hexColor - Hex color string (e.g. '#FFFFFF')
 * @returns true if the color is light, false if it's dark
 */
export function isLightColor(hexColor: string): boolean {
  // Remove the hash if it exists
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance using the formula: 0.299*R + 0.587*G + 0.114*B
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return true if the color is light (luminance > 0.5)
  return luminance > 0.5;
}

/**
 * Adjust a color's brightness
 * @param hexColor - Hex color string (e.g. '#FFFFFF')
 * @param factor - Number between -1.0 and 1.0. Negative values darken, positive values lighten.
 * @returns A new hex color
 */
export function adjustColorBrightness(hexColor: string, factor: number): string {
  // Remove the hash if it exists
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness: positive factor lightens, negative darkens
  if (factor < 0) {
    r = Math.round(r * (1 + factor));
    g = Math.round(g * (1 + factor));
    b = Math.round(b * (1 + factor));
  } else {
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
  }
  
  // Ensure values are in the valid range
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  
  // Convert back to hex and return
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
} 