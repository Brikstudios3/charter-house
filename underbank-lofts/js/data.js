// Charter House, 50–72 Churchgate, Stockport SK1 1YG
// Unit data: live from Salesforce (Property__c, project "Charter House"), pulled 29 Oct 2026.
// Geometry: Ollier Smurthwaite marketing plans A839_M_101–104C (1:50) and elevations A839_P_300H / 301I.
// Local coordinates (metres): origin = outer corner of Churchgate × Harvey Street at ground-floor level.
//   +x runs south-east along Churchgate, +z runs south-west along Harvey Street, +y is up.

export const SITE = {
  name: 'Charter House',
  address: '50–72 Churchgate, Stockport SK1 1YG',
  developer: 'Hall & Co',
  architect: 'Ollier Smurthwaite',
  completion: 'Early 2028',
  lease: '250 years',
  groundRent: 'Nil',
  serviceCharge: 2.24, // £ per sq ft per year (Salesforce estimate)
  rent1: 1300, rent2: 1550, // Salesforce rental estimates
  reservation: 3000,
  whatsapp: '447353164480',
  phone: '07353 164480',
  email: 'charlie@brik-studios.com',
  updated: '29 Oct 2026',
};

export const FLOOR_H = 2.85;                // floor to floor (61.77 / 64.62 / 67.47 / 70.32 AOD)
export const FLOORS = [
  { id: 0, name: 'Ground floor', short: 'G', level: 0 },
  { id: 1, name: 'First floor', short: '1', level: 1 },
  { id: 2, name: 'Second floor', short: '2', level: 2 },
  { id: 3, name: 'Third floor', short: '3', level: 3, note: 'Top floor' },
];

// Status values exactly as held in Salesforce
export const STATUS = {
  'Available': { key: 'available', label: 'Available', color: '#f4d79a' },
  'Reserved': { key: 'reserved', label: 'Reserved', color: '#e3342b' },
  'In Legals': { key: 'legals', label: 'Sale agreed', color: '#9a8f86' },
  'Sold': { key: 'sold', label: 'Sold', color: '#e3242b' },
};

// Window ids refer to the façade bays defined in building.js
//   CG1..CG6 = Churchgate bays from the Harvey St corner; HV1..HV6 = Harvey St bays from the corner
//   RC1..RC3 = courtyard windows on the Churchgate wing; RH1..RH2 = courtyard windows on the Harvey wing
//   GC1..GC4 = ground floor courtyard windows of the Churchgate wing
// fp = plan footprint rectangle [x0, z0, x1, z1] (metres)
const P = (plot, apt, floor, type, beds, sqft, price, status, note, windows, fp, view) =>
  ({ plot, apt, floor, type, beds, sqft, price, status, note, windows, fp, view });

export const UNITS = [
  P(1, 'G.01', 0, '1E', 1, 414, 186000, 'Available', 'Inside facing only', ['GC3', 'GC4'], [16.6, 3.4, 22.6, 11.0], 'Faces the residents’ courtyard garden'),
  P(2, 'G.02', 0, '1E', 1, 414, 186000, 'Available', 'Inside facing only', ['GC1', 'GC2'], [10.9, 3.4, 16.6, 11.0], 'Faces the residents’ courtyard garden'),
  P(3, 'G.03', 0, '1D', 1, 435, 196000, 'Available', 'Corner, 4 windows', ['CG1', 'CG2', 'HV1', 'HV2'], [0, 0, 7.4, 6.2], 'Corner apartment onto Churchgate and Harvey Street'),
  P(4, 'G.04', 0, '1C', 1, 410, 188000, 'Available', 'Facing St Mary’s Gate, square layout', ['HV3', 'HV4'], [0, 6.2, 6.7, 13.3], 'Faces St Mary’s Gate across Harvey Street'),
  P(5, 'G.05', 0, '1B', 1, 412, 189000, 'Available', 'Facing St Mary’s Gate, rectangle', ['HV5', 'RH1'], [0.34, 13.3, 11.7, 17.2], 'Harvey Street to the front, courtyard to the rear'),
  P(6, 'G.06', 0, '1B', 1, 412, 189000, 'Available', 'Facing St Mary’s Gate, rectangle', ['HV6', 'RH2'], [0.34, 17.2, 11.7, 21.27], 'Harvey Street to the front, courtyard to the rear'),

  P(7, '1.01', 1, '1A', 1, 412, 189000, 'Available', 'Park facing', ['CG6', 'RC1'], [18.55, -0.34, 22.6, 11.0], 'Looks across Churchgate to the trees and new play park'),
  P(8, '1.02', 1, '1A', 1, 412, 189000, 'Available', 'Park facing', ['CG5', 'RC2'], [14.72, -0.34, 18.55, 11.0], 'Looks across Churchgate to the trees and new play park'),
  P(9, '1.03', 1, '1A', 1, 412, 189000, 'Available', 'Park facing', ['CG4', 'RC3'], [10.9, -0.34, 14.72, 11.0], 'Looks across Churchgate to the trees and new play park'),
  P(10, '1.04', 1, '2A', 2, 658, 300000, 'Available', 'Corner 2 bed, 5 windows', ['CG1', 'CG2', 'HV1', 'HV2'], [0, 0, 10.9, 6.2], 'Corner 2 bed: Churchgate, Harvey Street and towards St Mary’s Church'),
  P(11, '1.05', 1, '1C', 1, 410, 190000, 'Available', 'Facing St Mary’s Gate, square layout', ['HV3', 'HV4'], [0, 6.2, 6.7, 13.3], 'Faces St Mary’s Gate across Harvey Street'),
  P(12, '1.06', 1, '1B', 1, 412, 191000, 'Available', 'Facing St Mary’s Gate, rectangle', ['HV5', 'RH1'], [0.34, 13.3, 11.7, 17.2], 'Harvey Street to the front, courtyard to the rear'),
  P(13, '1.07', 1, '1B', 1, 412, 191000, 'Available', 'Facing St Mary’s Gate, rectangle', ['HV6', 'RH2'], [0.34, 17.2, 11.7, 21.27], 'Harvey Street to the front, courtyard to the rear'),

  P(14, '2.01', 2, '1A', 1, 412, 191000, 'Sold', 'Park facing', ['CG6', 'RC1'], [18.55, -0.34, 22.6, 11.0], 'Looks across Churchgate to the trees and new play park'),
  P(15, '2.02', 2, '1A', 1, 412, 191000, 'Sold', 'Park facing', ['CG5', 'RC2'], [14.72, -0.34, 18.55, 11.0], 'Looks across Churchgate to the trees and new play park'),
  P(16, '2.03', 2, '1A', 1, 412, 191000, 'Sold', 'Park facing', ['CG4', 'RC3'], [10.9, -0.34, 14.72, 11.0], 'Looks across Churchgate to the trees and new play park'),
  P(17, '2.04', 2, '2A', 2, 658, 302000, 'Available', 'Corner 2 bed, 5 windows', ['CG1', 'CG2', 'CG3', 'HV1', 'HV2'], [0, 0, 10.9, 6.2], 'Corner 2 bed: Churchgate, Harvey Street and towards St Mary’s Church'),
  P(18, '2.05', 2, '1C', 1, 410, 192000, 'Available', 'Facing St Mary’s Gate, square layout', ['HV3', 'HV4'], [0, 6.2, 6.7, 13.3], 'Faces St Mary’s Gate across Harvey Street'),
  P(19, '2.06', 2, '1B', 1, 412, 193000, 'Available', 'Facing St Mary’s Gate, rectangle', ['HV5', 'RH1'], [0.34, 13.3, 11.7, 17.2], 'Harvey Street to the front, courtyard to the rear'),
  P(20, '2.07', 2, '1B', 1, 412, 193000, 'Sold', 'Facing St Mary’s Gate, rectangle', ['HV6', 'RH2'], [0.34, 17.2, 11.7, 21.27], 'Harvey Street to the front, courtyard to the rear'),

  P(21, '3.01', 3, '1A', 1, 412, 193000, 'Available', 'Park facing, top floor', ['CG6', 'RC1'], [18.55, -0.34, 22.6, 11.0], 'Top floor, looking across Churchgate to the treetops'),
  P(22, '3.02', 3, '1A', 1, 412, 193000, 'Available', 'Park facing, top floor', ['CG5', 'RC2'], [14.72, -0.34, 18.55, 11.0], 'Top floor, looking across Churchgate to the treetops'),
  P(23, '3.03', 3, '1A', 1, 412, 193000, 'Sold', 'Park facing, top floor', ['CG4', 'RC3'], [10.9, -0.34, 14.72, 11.0], 'Top floor, looking across Churchgate to the treetops'),
  P(24, '3.04', 3, '2A', 2, 658, 303000, 'Available', 'Top-floor corner 2 bed, 5 windows', ['CG1', 'CG2', 'CG3', 'HV1', 'HV2'], [0, 0, 10.9, 6.2], 'Top-floor corner: views towards the Market Hall and St Mary’s Church'),
  P(25, '3.05', 3, '1C', 1, 410, 194000, 'Available', 'Facing St Mary’s Gate, top floor', ['HV3', 'HV4'], [0, 6.2, 6.7, 13.3], 'Top floor, facing St Mary’s Gate across Harvey Street'),
  P(26, '3.06', 3, '1B', 1, 412, 195000, 'Available', 'Facing St Mary’s Gate, top floor', ['HV5', 'RH1'], [0.34, 13.3, 11.7, 17.2], 'Top floor, Harvey Street to the front, courtyard to the rear'),
  P(27, '3.07', 3, '1B', 1, 412, 195000, 'Available', 'Facing St Mary’s Gate, top floor', ['HV6', 'RH2'], [0.34, 17.2, 11.7, 21.27], 'Top floor, Harvey Street to the front, courtyard to the rear'),
];

// Interior CGIs per apartment family. Images are Charter House CGIs (indicative).
export const INTERIORS = {
  one: [
    { key: 'living1', title: 'Kitchen and living', caption: 'One bedroom: open-plan kitchen and living', img: 'int_living1' },
    { key: 'bedroom', title: 'Bedroom', caption: 'Double bedroom', img: 'int_bedroom' },
    { key: 'bathroom', title: 'Shower room', caption: 'Shower room, matt black fittings', img: 'int_bathroom' },
  ],
  two: [
    { key: 'living2a', title: 'Living room', caption: 'Corner two bedroom: living and dining', img: 'int_living2a' },
    { key: 'living2b', title: 'Kitchen', caption: 'Kitchen, with the window seat beyond', img: 'int_living2b' },
    { key: 'bedroom', title: 'Main bedroom', caption: 'Main bedroom', img: 'int_bedroom' },
    { key: 'bathroom', title: 'Shower room', caption: 'Shower room, matt black fittings', img: 'int_bathroom' },
  ],
};

export const SPEC = [
  ['Kitchen', 'Integrated dishwasher, built-in oven, ceramic hob, marble-effect quartz worktops, LED under-cabinet lighting'],
  ['Floors', 'Premium LVT throughout living areas'],
  ['Bathroom', 'Glass shower screen, matt black fittings, wall-hung WC and basin, backlit mirrored cabinet'],
  ['Building', 'Lift to all floors, gallery access over the courtyard, secure bike store for every apartment'],
];

export const fmtGBP = n => '£' + Math.round(n).toLocaleString('en-GB');
export const sqm = sqft => (sqft * 0.092903).toFixed(1);

// Direct sunlight per apartment, raycast through the 3D model (buildings + tree crowns) at Stockport's latitude.
// [hours on 21 June, first sun (BST), last sun (BST), hours at the equinox, morning weight, afternoon weight]. Model estimate.
export const SUN = {"1":[2.75,11.75,17.75,4.5,2,10],"2":[0,null,null,2.25,0,0],"3":[5.75,5.25,18,3,11,12],"4":[3,15.25,18,1.75,0,12],"5":[3,15.25,18,3.5,0,12],"6":[6.25,9.25,18.5,5.25,5,19],"7":[4.75,5,17.75,2.75,12,7],"8":[2.25,5,11,3.5,9,0],"9":[2.25,5,11,2.25,9,0],"10":[7.25,5,18.75,3,14,15],"11":[3.75,15.25,18.75,2,0,15],"12":[3.75,15.25,18.75,4.75,0,15],"13":[5.5,9.25,18.75,3,5,17],"14":[7.5,5,18.25,6.5,16,14],"15":[3,5,17,4.25,9,3],"16":[2.25,8,11,2,9,0],"17":[7.75,5,19.25,3.75,14,17],"18":[4.75,15.25,19.75,2.5,0,19],"19":[5,9.75,19.75,6,1,19],"20":[10.75,8,19.75,8.75,18,25],"21":[9.25,8.75,20,7.5,16,21],"22":[5.25,8.5,18.75,5,10,11],"23":[2.5,7.75,11,2.25,10,0],"24":[9.75,7.25,21,4.25,15,24],"25":[6,15.25,21,3,0,24],"26":[8,8,21,7,8,24],"27":[13,7.25,21,9.75,22,30]};
