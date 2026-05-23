// @ts-ignore
import * as originalKlinecharts from '../../node_modules/klinecharts/dist/index.esm.js';

export const init = (ds: any, options: any) => {
  const chart = originalKlinecharts.init(ds, options);
  if (chart) {
    if (typeof ds === 'string') {
      const el = document.getElementById(ds);
      if (el) {
        (el as any).__klinechart__ = chart;
      }
    } else if (ds) {
      (ds as any).__klinechart__ = chart;
    }
  }
  return chart;
};

// @ts-ignore
export * from '../../node_modules/klinecharts/dist/index.esm.js';
