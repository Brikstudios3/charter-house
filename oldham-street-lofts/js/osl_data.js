// Oldham Street Lofts, Syddall Street, Hyde SK14 1LB (Ollier Smurthwaite Architects, planning 24/00783/FUL): nine
// three-bedroom townhouses (plots 1–9) and fifteen one-bedroom apartments (plots 10–24) in a three-storey red-brick
// mill-style block on the corner of Oldham Street. Prices from the Brik Studios accommodation schedule (October 2026).
// Plan frame (the GA sheets): s runs along Syddall Street from Henry Street (west) to Oldham Street (east), t runs back
// from the Syddall Street frontage into the site. Footprints are stored as [u0, v0, u1, v1] with u = s and v = -t, the
// convention the engine uses for plan-frame buildings (local x = u, local z = -v).
export const OSL_FH = 2.85;
export const OSL_SITE = {
  name: 'Oldham Street Lofts',
  address: 'Syddall Street · Hyde · SK14 1LB',
  developer: 'Brik Studios',
  architect: 'Ollier Smurthwaite Architects',
  completion: 'Late 2027',
  lease: '999 years',
  groundRent: 'Peppercorn',
  serviceCharge: 2.50, // £ per sq ft per year (Brik Studios figure, November 2026)
  estateCharge: 0.96,  // townhouses pay the estate charge only (freehold)
  reservation: 3000,
  whatsapp: '447353164480',
  phone: '07353 164480',
  email: 'charlie@brik-studios.com',
  updated: '30 Oct 2026',
  // model frame: x east, z south, origin at plot 1's front corner on Henry Street; the frontage runs on a bearing of 57°
  origin: [0, 0], u: [0.8387, -0.5446], v: [-0.5446, -0.8387],   // v = -t (towards the street), as the engine's plan frame expects
  rent1: 875,
};
export const OSL_FLOORS = [
  { id: 0, name: 'Ground floor', short: 'G', level: 0 },
  { id: 1, name: 'First floor', short: '1', level: 1 },
  { id: 2, name: 'Second floor', short: '2', level: 2, note: 'Top floor, under the roof' },
];
const HW = 4.137;   // house plot width
const fp = (s0, t0, s1, t1) => [s0, -t1, s1, -t0];
// apartments: [plot, floor, type, sqft, price, s0, t0, s1, t1]
const APTS = [
  [10, 0, '1A', 415.3, 159750, 53.24, 0, 58.58, 7.96], [11, 0, '1B', 417.0, 159750, 58.58, 0, 63.23, 10.0], [12, 0, '1C', 431.9, 162000, 52.98, 11.85, 63.23, 16.17],
  [13, 1, '1A', 415.3, 159750, 37.2, 0, 42.57, 7.96], [14, 1, '1A', 415.3, 159750, 42.57, 0, 47.9, 7.96], [15, 1, '1A', 415.3, 159750, 47.9, 0, 53.24, 7.96],
  [16, 1, '1A', 415.3, 159750, 53.24, 0, 58.58, 7.96], [17, 1, '1B', 417.0, 159750, 58.58, 0, 63.23, 10.0], [18, 1, '1C+', 469.1, 165000, 52.98, 11.85, 63.23, 16.17],
  [19, 2, '1A', 355.2, 157000, 37.2, 0, 42.57, 7.96], [20, 2, '1A', 415.3, 159750, 42.57, 0, 47.9, 7.96], [21, 2, '1A', 415.3, 159750, 47.9, 0, 53.24, 7.96],
  [22, 2, '1A', 415.3, 159750, 53.24, 0, 58.58, 7.96], [23, 2, '1B', 417.0, 159750, 58.58, 0, 63.23, 10.0], [24, 2, '1C+', 469.1, 165000, 52.98, 11.85, 63.23, 16.17],
];
// the kitchen side of each 1A: the pairs mirror across their shared party wall (kitchens back to back)
export const OSL_KEAST = { 13: true, 15: true, 19: true, 21: true, 10: false, 14: false, 16: false, 20: false, 22: false };
const note = (u) => u.type[0] === '3' ? (u.plot === 1 ? 'End townhouse on Henry Street, splayed corner' : 'Mid-terrace townhouse, garden behind')
  : u.type === '1B' ? 'Corner apartment on Syddall and Oldham Street' : u.type.startsWith('1C') ? 'Oldham Street apartment, bedroom to the quiet rear'
  : 'Faces Syddall Street, front door off the walkway';
const view = (u) => u.type[0] === '3' ? 'Faces Syddall Street to the front; private garden to the south-south-east behind'
  : u.type === '1B' ? 'Dual aspect over the corner of Syddall Street and Oldham Street'
  : u.type.startsWith('1C') ? 'Looks out over Oldham Street and down onto the residents’ garden'
  : 'Living room windows onto Syddall Street; bedroom and front door on the walkway over the garden';
const units = [];
for (let i = 1; i <= 9; i++) {
  const s0 = (i - 1) * HW, s1 = i * HW;
  units.push({ plot: i, floor: 0, levels: 3, type: i === 1 ? '3B' : '3A', beds: 3, sqft: i === 1 ? 1094 : 1066, price: 330000, status: 'Available', house: true, fp: fp(i === 1 ? -0.4 : s0, 0, s1, 11.17), slot: i });
}
for (const [plot, floor, type, sqft, price, s0, t0, s1, t1] of APTS) units.push({ plot, floor, type, beds: 1, sqft: Math.round(sqft), price, status: 'Available', fp: fp(s0, t0, s1, t1), slot: plot });
for (const u of units) {
  u.apt = u.house ? `House ${u.plot}` : `${OSL_FLOORS[u.floor].short}.${String(u.plot).padStart(2, '0')}`;
  u.note = note(u); u.view = view(u);
}
export const OSL_UNITS = units;
export const OSL_PITCH = {
  '3A': 'A three-bedroom townhouse over three floors: kitchen and dining to the front, living room opening onto the garden, two bedrooms and the bathroom on the first floor and a top-floor bedroom under the rooflights.',
  '3B': 'The end townhouse on Henry Street, a little larger on its splayed corner: three bedrooms over three floors and a private garden behind.',
  '1A': 'Open-plan kitchen and living room behind two tall warehouse windows onto Syddall Street, a shower room, and a double bedroom at the back by your own front door off the walkway.',
  '1B': 'The corner apartment: dual-aspect living room on the chamfered corner of Syddall and Oldham Street, a separate kitchen run, double bedroom and shower room.',
  '1C': 'Living, kitchen and dining across the Oldham Street wing with windows over the residents’ garden, a separate double bedroom and a shower room.',
  '1C+': 'The largest one bedroom: open-plan living over the residents’ garden, a double bedroom on Oldham Street, shower room and a hall with storage.',
};
