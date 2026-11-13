// Rounded hit regions keep the transparent area and capsule corners clickable through.
function containsPoint(region, point) {
  const { x, y, width, height } = region;
  if (point.x < x || point.y < y || point.x >= x + width || point.y >= y + height) return false;
  const radius = Math.min(Math.max(0, region.radius || 0), width / 2, height / 2);
  const cx = Math.max(x + radius, Math.min(point.x, x + width - radius));
  const cy = Math.max(y + radius, Math.min(point.y, y + height - radius));
  return (point.x - cx) ** 2 + (point.y - cy) ** 2 <= radius ** 2;
}
function roundedShape(regions) {
  const rects = [];
  for (const region of regions) {
    const radius = Math.min(Math.max(0, region.radius), region.width / 2, region.height / 2);
    const start = Math.floor(region.y);
    const end = Math.ceil(region.y + region.height);
    for (let y = start; y < end; y++) {
      const localY = Math.max(0, Math.min(region.height, y + .5 - region.y));
      const dy = localY < radius ? radius - localY : Math.max(0, localY - (region.height - radius));
      const inset = radius - Math.sqrt(Math.max(0, radius * radius - dy * dy));
      const x = Math.floor(region.x + inset);
      const right = Math.ceil(region.x + region.width - inset);
      const previous = rects[rects.length - 1];
      if (previous && previous.x === x && previous.width === right - x && previous.y + previous.height === y) previous.height++;
      else rects.push({ x, y, width: Math.max(1, right - x), height: 1 });
    }
  }
  return rects;
}
module.exports = { containsPoint, roundedShape };
