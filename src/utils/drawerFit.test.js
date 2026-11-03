import { DRAWER_WIDTH, drawerFit, videoWidth } from './drawerFit';

describe('drawerFit', () => {
  it('floats over a single stream when docking would shrink it', () => {
    expect(drawerFit({ width: 1440, height: 840, layout: 'single' }).mode).toBe('overlay');
    expect(drawerFit({ width: 1920, height: 1020, layout: 'quad' }).mode).toBe('overlay');
  });

  it('docks into black bars on a wide screen and widens to fill them', () => {
    const fit = drawerFit({ width: 2560, height: 1020, layout: 'single' });
    expect(fit).toEqual({ mode: 'dock', width: DRAWER_WIDTH.max, stackDual: false });
  });

  it('docks a dual layout by stacking it when that keeps the streams as big', () => {
    const fit = drawerFit({ width: 1440, height: 840, layout: 'dual' });
    expect(fit).toEqual({ mode: 'dock', width: DRAWER_WIDTH.min, stackDual: true });
    // Stacked in the narrower space is no smaller than side by side without the drawer
    expect(videoWidth([1, 1 / 2], 1440 - DRAWER_WIDTH.min, 840)).toBeGreaterThanOrEqual(videoWidth([1 / 2, 1], 1440, 840));
  });

  it('never docks on small screens or the scrolling grid', () => {
    expect(drawerFit({ width: 900, height: 1200, layout: 'dual' }).mode).toBe('overlay');
    expect(drawerFit({ width: 2560, height: 1020, layout: 'grid-infinite' }).mode).toBe('overlay');
  });
});
