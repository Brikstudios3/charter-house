// Which development this page sells: Charter House (default) or The Print House (window.__SITE = 'ph' or ?site=ph).
// Everything the selector shows (units, floors, prices, copy) comes through here, so one engine serves both.
import * as CHD from './data.js?v=1793801086';
import { PH_SITE, PH_FLOORS, PH_UNITS, PH_FH } from './ph_data.js?v=1793801086';
import { OSL_SITE, OSL_FLOORS, OSL_UNITS, OSL_FH } from './osl_data.js?v=1793801086';
import { UBL_SITE, UBL_FLOORS, UBL_UNITS, UBL_FH } from './ubl_data.js?v=1793801086';

export const IS_PH = typeof window !== 'undefined' && (window.__SITE === 'ph' || /[?&]site=ph\b/.test(location.search));
// Oldham Street Lofts, Hyde (window.__SITE = 'osl' or ?site=osl): a different town, built in the same plan-frame way as The Print House
export const IS_OSL = typeof window !== 'undefined' && (window.__SITE === 'osl' || /[?&]site=osl\b/.test(location.search));
// Underbank Lofts, St Petersgate, Stockport (window.__SITE = 'ubl' or ?site=ubl): in the same Stockport world as The Print House
export const IS_UBL = typeof window !== 'undefined' && (window.__SITE === 'ubl' || /[?&]site=ubl\b/.test(location.search));
export const PLANF = IS_PH || IS_OSL || IS_UBL;
export const START_AREA = typeof window !== 'undefined' && (window.__START === 'area' || /[?&]start=area\b/.test(location.search));
export const UNITS = IS_UBL ? UBL_UNITS : IS_OSL ? OSL_UNITS : IS_PH ? PH_UNITS : CHD.UNITS;
export const FLOORS = IS_UBL ? UBL_FLOORS : IS_OSL ? OSL_FLOORS : IS_PH ? PH_FLOORS : CHD.FLOORS;
export const SITE = IS_UBL ? UBL_SITE : IS_OSL ? OSL_SITE : IS_PH ? PH_SITE : CHD.SITE;
export const FLOOR_H = IS_UBL ? UBL_FH : IS_OSL ? OSL_FH : IS_PH ? PH_FH : CHD.FLOOR_H;
export const STATUS = {
  ...CHD.STATUS,
  'Exchanged': { key: 'sold', label: 'Sold', color: '#7c736c' },
  'Complete': { key: 'sold', label: 'Sold', color: '#7c736c' },
};
export const INTERIORS = CHD.INTERIORS;
export const SUN = PLANF ? {} : CHD.SUN;
export const fmtGBP = CHD.fmtGBP, sqm = CHD.sqm;
export const NAME = SITE.name;
