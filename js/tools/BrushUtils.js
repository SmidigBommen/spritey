/**
 * Returns all pixel coordinates for a square brush centered at (cx, cy).
 * Size 1 returns just the center. No bounds checking — Layer.setPixel clips.
 */
export function brushFootprint(cx, cy, size) {
  if (size <= 1) return [[cx, cy]];
  const offset = Math.floor(size / 2);
  const points = [];
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      points.push([cx - offset + dx, cy - offset + dy]);
    }
  }
  return points;
}
