import { getAllowedLayouts, getMaxStreams, getDeviceMaxCards } from './layouts';

test('phones only get layouts with usable player sizes', () => {
  expect(getAllowedLayouts('phone')).toEqual(['single', 'dual', 'pip']);
});

test('PiP is capped on touch devices but not on desktop', () => {
  expect(getMaxStreams('phone', 'pip')).toBe(2);
  expect(getMaxStreams('tablet', 'pip')).toBe(4);
  expect(getMaxStreams('desktop', 'pip')).toBe(Infinity);
});

test('a layout never shows more streams than it has windows', () => {
  expect(getMaxStreams('phone', 'single')).toBe(1);
  expect(getMaxStreams('desktop', 'grid-3x3')).toBe(9);
});

test('smaller screens get fewer score cards', () => {
  expect(getDeviceMaxCards('phone')).toBeLessThan(getDeviceMaxCards('tablet'));
  expect(getDeviceMaxCards('tablet')).toBeLessThan(getDeviceMaxCards('desktop'));
});
