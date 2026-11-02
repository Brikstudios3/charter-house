// Underbank Lofts, 3–5 St Petersgate, Stockport SK1 1EB (21 Living; Ollier Smurthwaite Architects, job A802): the 1872
// Institute for the Blind, the Deaf and the Dumb (T. H. Allen) converted into fifteen apartments, three a floor on the
// lower ground, ground, first, second and a new third floor in the roof (plots 1–15), and a new-build extension on the
// High Street side with two a floor from ground to fourth (plots 16–25). Final plot numbers (deed plans rev B, Nov 2025).
// Plan frame: u runs east along the north-east (High Street / garden) wall from its corner with the extension, v runs back
// into the building (south-west); metres off the Land Registry plans at 1:100. Footprints are stored as [u0, v0, u1, v1]
// with v negated, the convention the engine uses for plan-frame buildings (local x = u, local z = -v).
// Heights are metres above the converted building's lower ground floor (+52.00 m AOD).
export const UBL_FH = 3.4;
// floor levels: the combined plan sheets pair the old building's floors with the extension's (one storey higher by name)
export const UBL_LEVELS = [0, 2.9, 6.8, 10.9, 13.74];        // converted building: LG, G, 1st, 2nd, 3rd (in the roof)
export const UBL_EXT_LEVELS = [1.76, 4.84, 7.91, 10.99, 14.06]; // extension: G, 1st, 2nd, 3rd, 4th
export const UBL_SITE = {
  name: 'Underbank Lofts',
  address: '3–5 St Petersgate · Stockport · SK1 1EB',
  developer: '21 Living',
  architect: 'Ollier Smurthwaite Architects',
  completion: 'Q4 2026',
  lease: '999 years',
  groundRent: 'Nil',
  serviceCharge: 1.99, // £ per sq ft per year (unit decks)
  reservation: 2500,
  phone: '07353 164480',
  email: 'charlie@brik-studios.com',
  updated: '30 Oct 2026',
  // model frame: x east, z south (Charter House's). Origin = the north-east wall's corner with the extension;
  // the wall runs on a bearing of 98° (OpenStreetMap footprint, which matches the plans' angles)
  origin: [-146.5, 104.3], u: [0.990, 0.142], v: [0.142, -0.990],
  aod0: 52.0,
};
export const UBL_FLOORS = [
  { id: 0, name: 'Lower ground floor', short: 'LG', level: 0, note: 'Opens onto the sunken garden light well' },
  { id: 1, name: 'Ground floor', short: 'G', level: 1 },
  { id: 2, name: 'First floor', short: '1', level: 2 },
  { id: 3, name: 'Second floor', short: '2', level: 3 },
  { id: 4, name: 'Third floor', short: '3', level: 4, note: 'In the roof: vaulted ceilings and rooflights' },
];
const fp = (u0, v0, u1, v1) => [u0, -v1, u1, -v0];
// converted building: the corner bay on St Petersgate, the middle bay and the east bay, every floor
const OLD = { w: fp(-19.0, 0.25, -10.57, 7.86), m: fp(-10.57, 0.25, -4.55, 7.86), e: fp(-4.55, 0.25, -0.3, 9.45) };
// extension: south flat (beside the old building) and north flat (on High Street)
const EXT = { s: fp(-2.4, -3.0, 4.86, 3.75), n: fp(-2.4, -9.6, 4.86, -5.4) };
// [plot, floor index, slot, beds, sqft, price, status]
const SCHED = [
  [1, 0, 'w', 1, 484, 195000, 'Available'], [2, 0, 'm', 1, 462, 193000, 'Sold'], [3, 0, 'e', 1, 426, 183000, 'Sold'],
  [4, 1, 'w', 2, 673, 284000, 'Sold'], [5, 1, 'm', 1, 452, 197000, 'Sold'], [6, 1, 'e', 1, 447, 191000, 'Sold'],
  [7, 2, 'w', 2, 694, 287500, 'Sold'], [8, 2, 'm', 1, 447, 199500, 'Sold'], [9, 2, 'e', 1, 441, 194000, 'Sold'],
  [10, 3, 'w', 2, 693, 287500, 'Sold'], [11, 3, 'm', 1, 447, 198000, 'Sold'], [12, 3, 'e', 1, 425, 190000, 'Sold'],
  [13, 4, 'w', 1, 398, 205000, 'Available'], [14, 4, 'm', 1, 447, 192000, 'Sold'], [15, 4, 'e', 1, 420, 182000, 'Sold'],
  [16, 0, 's', 1, 404, 184000, 'Sold'], [17, 0, 'n', 1, 398, 189000, 'Sold'],
  [18, 1, 's', 1, 403, 186000, 'Sold'], [19, 1, 'n', 1, 403, 192000, 'Sold'],
  [20, 2, 's', 1, 403, 188000, 'Sold'], [21, 2, 'n', 1, 409, 194000, 'Sold'],
  [22, 3, 's', 1, 403, 189000, 'Sold'], [23, 3, 'n', 1, 409, 195000, 'Sold'],
  [24, 4, 's', 1, 399, 188000, 'Sold'], [25, 4, 'n', 1, 404, 192000, 'Sold'],
];
const EXT_NAMES = ['G', '1', '2', '3', '4'];
// Plot 1's real outline (Charlie, 2 Nov): living, kitchen and bedroom between the curved St Petersgate wall and the party wall, then the
// hall, shower room and utility behind them; the bike store in the St Petersgate corner behind the kitchen is not part of the flat
const PLOT1_POLY = (() => {
  const c = [-2.14, 13.3], R = 19.33 - 0.42, out = [[-10.57, 0.25]];
  for (let k = 0; k <= 8; k++) { const v = 0.25 + (4.53 - 0.25) * k / 8, dv = v - c[1]; out.push([+(c[0] - Math.sqrt(R * R - dv * dv)).toFixed(3), +v.toFixed(3)]); }
  out.push([-16.0, 4.53], [-16.0, 7.86], [-10.57, 7.86]);
  return out;
})();
const units = SCHED.map(([plot, floor, slot, beds, sqft, price, status]) => {
  const ext = plot >= 16;
  const type = plot === 1 ? 'LG1' : plot === 13 ? 'R1' : ext ? 'E1' : beds === 2 ? 'C2' : 'C1';
  const u = { plot, floor, slot, beds, sqft, price, status, type, ext, fp: (ext ? EXT : OLD)[slot].slice() };
  u.apt = `${ext ? EXT_NAMES[floor] : UBL_FLOORS[floor].short}.${String(plot).padStart(2, '0')}`;
  u.level = ext ? UBL_EXT_LEVELS[floor] : UBL_LEVELS[floor];
  u.note = plot === 1 ? 'The largest one bedroom in the building: two big original sash windows onto the garden light well'
    : plot === 13 ? 'Top-floor corner in the roof: vaulted ceilings, four conservation rooflights, 660 sq ft including the eaves'
    : ext ? (slot === 'n' ? 'New-build extension, on High Street' : 'New-build extension, over the courtyard') : slot === 'w' ? 'Corner of St Petersgate and High Street' : 'Converted 1872 building';
  u.view = plot === 1 ? 'Looks north-east into the planted light well, below the residents’ garden'
    : plot === 13 ? 'Dual aspect: rooflights over St Petersgate and over the garden towards High Street'
    : ext ? 'High Street and the residents’ garden' : 'St Petersgate and the garden';
  if (plot === 1) u.poly = PLOT1_POLY;
  if (plot === 13) { u.sqftTotal = 660; u.bedsNote = '1 bed + eaves room (drawn as two bedrooms, two bathrooms)'; }
  return u;
});
export const UBL_UNITS = units;
export const UBL_PITCH = {
  LG1: 'The largest one bedroom at Underbank Lofts, 484 sq ft: open-plan kitchen and living behind a tall original sash onto the sunken garden light well, a double bedroom with its own big sash, a shower room, utility and store. 2.5 m ceilings in the converted 1872 building.',
  R1: 'Under the roof of the 1872 building on the corner of St Petersgate: vaulted ceilings, four Velux conservation rooflights, an open-plan kitchen and living room in the corner, a double bedroom and an eaves room, two shower rooms. 398 sq ft at full height, 660 sq ft in all.',
  C1: 'A one-bedroom apartment in the converted Institute building: tall sash windows, panelled doors, open-plan living.',
  C2: 'A two-bedroom apartment on the St Petersgate corner of the converted building.',
  E1: 'A one-bedroom apartment in the new-build extension on High Street.',
};
