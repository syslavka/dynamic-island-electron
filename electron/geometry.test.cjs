const { test } = require('node:test');
const assert = require('node:assert/strict');
const { containsPoint, roundedShape } = require('./geometry.cjs');
const pill = { x: 100, y: 20, width: 220, height: 46, radius: 23 };
test('transparent area and rounded corners pass through', () => {
  for (const point of [{ x: 99, y: 43 }, { x: 200, y: 19 }, { x: 100, y: 20 }, { x: 319, y: 21 }, { x: 320, y: 43 }]) assert.equal(containsPoint(pill, point), false);
});
test('the capsule center and curved edges remain interactive', () => {
  for (const point of [{ x: 100, y: 43 }, { x: 123, y: 20 }, { x: 210, y: 43 }, { x: 319, y: 43 }]) assert.equal(containsPoint(pill, point), true);
});
test('negative monitor coordinates and excessive radii are handled', () => {
  assert.equal(containsPoint({ x: -100, y: -50, width: 100, height: 50, radius: 999 }, { x: -50, y: -25 }), true);
  assert.equal(containsPoint({ x: -100, y: -50, width: 100, height: 50, radius: 999 }, { x: -100, y: -50 }), false);
});
test('native window shape excludes empty space and capsule corners', () => {
  const rects = roundedShape([pill]);
  const covered = (point) => rects.some((rect) => containsPoint(rect, point));
  assert.equal(covered({ x: 100, y: 20 }), false);
  assert.equal(covered({ x: 210, y: 43 }), true);
  assert.equal(covered({ x: 99, y: 43 }), false);
  assert.ok(rects.length < pill.height, 'equal scanlines are merged');
});
