// The sales layer: Charlie's own words (from his Charter House and Print House walkthrough videos) and the
// facts behind them (Brik investment case deck, Salesforce, Stockport Council, Historic England listings).
// Everything here is shown to buyers, so every number has a source in the comment beside it.

export const CHARLIE = {
  name: 'Charlie Baxter',
  role: 'Co-founder and Sales Director, Brik Studios',
  bio: '10 years in property · personal portfolio in Stockport',
  initials: 'CB',
};

// Brik's two "if I were buying" picks, straight from the Charter House Overview video
export const PICKS = { 24: 'Charlie’s pick · two-bed', 21: 'Charlie’s pick · one-bed' };

const ENDS_PARK = [7, 14, 21];        // CG6 / RC1: the gallery stops before the bedroom window
const ENDS_HARVEY = [6, 13, 20, 27];  // HV6 / RH2: same on the Harvey Street wing

// Each pitch: badge (optional), head (one line, Charlie's voice), points (2–4 short lines)
export function pitch(u) {
  const top = u.floor === 3, ground = u.floor === 0;
  const p = { badge: PICKS[u.plot] || null, head: '', points: [], supply: null };
  if (u.type === '2A') {
    p.head = u.plot === 24 ? 'Comfortably the best two-bed in the entire Underbanks.' : 'The corner two-bed: light from both directions and the view down to the Market Hall.';
    p.points = [
      `Corner layout with ${u.windows.length} windows across Churchgate and Harvey Street, so you get light from both directions all day.`,
      'The window at the end of the open-plan kitchen-living looks straight down Churchgate to the Market Hall and St Mary’s Church. Only the four corner apartments get that view.',
      'There are only three two-beds in the whole building, one on each upper floor. The Print House had five out of 40.',
      'Most two-beds round here are bought by owner-occupiers and first-time buyers, so there are only ever one or two on the rental market. They always rent well and resell well.',
    ];
    if (top) p.points.splice(1, 0, 'Top floor: nobody above you, and the highest view down the street.');
    p.supply = { n: 3, of: 27, label: 'two-bed apartments in Charter House' };
  } else if (u.type === '1D') {
    p.head = 'The only corner one-bed in the building: unique and quirky.';
    p.points = [
      'Four windows across Churchgate and Harvey Street, so far more light than a standard one-bed.',
      'One of only four apartments with the view down Churchgate to the Market Hall and St Mary’s Church.',
      'Right on the corner, with windows onto both streets.',
    ];
  } else if (u.type === '1E') {
    p.head = 'The most affordable way into Charter House.';
    p.points = [
      'Faces the residents’ courtyard garden, so it’s the quietest outlook in the building, well away from the street.',
      'Same specification and finishes as every other apartment.',
      'Ground floor, close to the entrance, the bike store and the lift.',
    ];
  } else if (u.type === '1A') {
    const end = ENDS_PARK.includes(u.plot);
    p.head = u.plot === 21 ? 'My top pick for a one-bed in Charter House (and 21’s my lucky number).'
      : end ? 'The end unit on the park side, the best one-bed layout in the building.'
      : 'Park-facing: the kitchen-living looks out over the big trees and the new play park.';
    p.points = ['This is the side I’d pick: kitchen-living faces Churchgate, the massive mature trees and the new children’s play area.'];
    if (end) p.points.push('The courtyard gallery stops at the last front door, so your bedroom window is completely unblocked. More light, and nobody walks past it.');
    p.points.push('Bedroom and front door at the back, over the residents’ courtyard, so it sleeps quiet.');
    if (top) p.points.push('Top floor: nobody above you, looking out over the treetops.');
  } else if (u.type === '1C') {
    p.head = 'The only one-beds with both rooms on an outside wall.';
    p.points = [
      'Bedroom and kitchen-living both get a street window. Squarer layout with the bathroom tucked in the corner.',
      'Looks across Harvey Street to St Mary’s Gate, Hall & Co’s last scheme here, which is fully let and beat its rent forecast.',
    ];
    if (top) p.points.push('Top floor: nobody above you.');
  } else if (u.type === '1B') {
    const end = ENDS_HARVEY.includes(u.plot);
    p.head = u.plot === 27 ? 'Top floor at the end of the wing: high up, looking towards the brewery and the Underbank bridge.'
      : end ? 'End of the wing: the gallery stops at your door, so nobody walks past your bedroom.'
      : 'Classic one-bed: kitchen-living to the street, bedroom to the courtyard.';
    p.points = ['Kitchen-living faces Harvey Street; bedroom and front door are at the back on the steel and glass gallery, away from the street.'];
    if (end) p.points.push('Last door on the gallery, so your bedroom window is unblocked and it’s about as private as it gets.');
    p.points.push('A townhouse-style front door off the open gallery rather than a hotel-style carpeted corridor.');
  }
  return p;
}

// Proof points shown under every pitch (one line each, with the source in the comment)
export const PROOF = [
  { k: 'Rents', v: 'St Mary’s Gate, opposite: one-beds forecast at £900 pcm in 2023, now letting at £1,100–£1,250.' },     // Brik SMG rental review, May 2025
  { k: 'Supply', v: 'Conservation area since 1974 with a four-storey cap: future supply is a fraction of a percent of MediaCity’s.' }, // Brik investment case
  { k: 'Speed', v: 'Underbank Lofts sold all 25 apartments in 12 days. The Print House sold its first two phases in 5 and 7 days.' },      // Brik / 21 Living
  { k: 'Transport', v: 'Manchester Piccadilly from 8 minutes; London Euston from 1h 56m.' },                                    // Avanti / Brik deck
];

export const RESERVE = (fee = 3000) => `To reserve: a short reservation form, then a £${fee.toLocaleString('en-GB')} deposit within 24 hours. Once your form is in, the apartment is held for you.`;

// ---------------------------------------------------------------- The Print House: Charlie's pitch (Mark V walkthrough)
export const PH_PICKS = { 37: 'Charlie’s pick · one-bed', 35: 'Top-floor two-bed' };
export function phPitch(u) {
  const top = u.floor === 4, lg = u.floor === 0;
  const p = { badge: PH_PICKS[u.plot] || null, head: '', points: [], supply: null };
  if (u.type === '2A') {
    p.head = top ? 'The top-floor two-bed: one of only five in the whole building.' : 'One of only five two-beds out of 40, and they never last.';
    p.points = [
      'Dual aspect at the quiet south end of the block, with the big 8 ft windows on two sides.',
      'Only five two-beds out of 40 here, and only three in Charter House. Most get bought by owner-occupiers and first-time buyers, so there are only ever one or two to rent in the whole Underbanks.',
      'That scarcity is why they rent well and resell well: buyers pay over the odds to get one.',
    ];
    p.supply = { n: 5, of: 40, label: 'two-bed apartments in The Print House' };
  } else if (u.side) {
    p.head = 'Side block: just two front doors on your landing, it feels like a semi.';
    p.points = [
      'Up the lift or stairs, turn off, and it’s your own little private landing shared with one neighbour. Much less footfall past your door and bedroom.',
      'Kitchen-living faces Fletcher Street, set back about eight feet behind a hedge and a cobbled wall, with no pavement outside your window.',
      'Bedroom and front door at the back, looking into the residents’ garden. Most of these went at the start to existing clients and friends.',
    ];
  } else if (u.type === '1C') {
    p.head = 'The corner one-bed by the core: light from two sides.';
    p.points = [
      'An extra window onto Fletcher Street as well as the big 8 ft window facing St Joseph’s.',
      'Closest apartment to the lift and stairs, so the shortest walk along the gallery.',
    ];
  } else {
    p.head = u.plot === 37 ? 'My top pick for a one-bed: the top-floor loft, with 2.65 m ceilings and a big twin roof window looking out to the viaducts.' : 'Kitchen-living to St Joseph’s, bedroom to the garden: the quietest plot in Stockport.';
    p.points = [
      top ? 'The big twin roof window in the slate mansard gives loads of light: a much better set-up than the small Velux rooflights you see in most top-floor flats.'
        : 'Your 8 ft by 8 ft window runs from shin height right up to the ceiling. Loads of light, makes the room feel big and airy.',
      'It faces St Joseph’s Church and the primary school: dead quiet in the evenings and dead quiet at the weekend, unlike the blocks in the middle of the Underbanks.',
      'Front door and bedroom at the back on the steel walkway, looking down into the garden every day.',
    ];
  }
  if (top && u.type !== '2A') p.points.push('Top floor in the slate mansard: the only floor with 2.65 m ceilings, and nobody above you.');
  if (lg) p.points.push('Lower ground floor, at garden level: the most affordable way in.');
  p.points.push('Six and a half to eight minutes’ walk straight down to the station, and 30 seconds to the Underbanks.');
  return p;
}

// ---------------------------------------------------------------- hover cards on the map
// pos is [x, y, z] in model metres (y is height above ground at that point); 'brik' marks Brik-sold sites
export const AREA_CARDS = [
  {
    id: 'smg', name: 'St Mary’s Gate', kind: 'brik', pos: [-38, 15.5, 8], tag: 'Sold by Brik · fully let',
    lines: ['Hall & Co, sold by our team', 'Launched January 2023, completed March 2025', 'One-beds forecast at £900 pcm, now letting at £1,100–£1,250', 'Two-beds forecast at £1,100, now £1,300–£1,400'],
    kicker: 'Outperformed its rental forecast massively.',
  },
  {
    id: 'lofts', name: 'Underbank Lofts', kind: 'brik', pos: [-168, 15, 102], tag: 'Sold out in 12 days',
    lines: ['21 Living, 3–5 St Petersgate', 'Launched January 2026: all 25 apartments sold in 12 days', 'Heritage conversion plus a new-build extension', 'Right in the heart of the Underbanks'],
    video: 'lofts.mp4',
  },
  {
    id: 'albion', name: 'Albion House', kind: 'brik', pos: [-157, 14, 41], tag: 'Charlie owns here',
    lines: ['Hall & Co, sold by our team', 'Charlie bought apartment 2.01 here for himself', 'Proof we buy what we sell'],
    avatar: true,
  },
  {
    id: 'coopers', name: 'Coopers Brow', kind: 'brik', pos: [-95, 12, 81], tag: 'Sold by Brik',
    lines: ['Hall & Co, sold by our team', 'One of the boutique red-brick conversions that set the standard here'],
  },
  {
    id: 'print', name: 'The Print House', kind: 'brik', pos: [-40, 18, 213], tag: 'Phase three next',
    lines: ['21 Living, 61 Wellington Street', '40 apartments behind a Victorian frontage, round a big residents’ garden', 'Phase one sold out in 5 days, phase two in 7', 'Brik Studios’ new HQ is in the front building', 'Completion September 2027 · 8 minutes’ walk to the station'],
  },
  {
    id: 'charter', name: 'Charter House', kind: 'brik', pos: [11, 18, 10], tag: 'Private pre-launch',
    lines: ['Hall & Co, 48–72 Churchgate', '27 apartments on the corner opposite St Mary’s Gate', 'One-beds from £186,000; only three two-beds', 'Charlie’s pick: Apartment 24, the top-floor corner two-bed'],
  },
  {
    id: 'underbanks', name: 'The Underbanks', kind: 'area', pos: [-215, 10, 55], tag: '“Greater Manchester’s new Berlin”',
    lines: ['Conservation area since 1974; 42 listed buildings', '£1.8m National Lottery Heritage grant and £7m council investment', 'Independent bars, restaurants and the Produce Hall food hall', 'Named “Stockport’s Northern Quarter” by the Manchester Evening News'],
  },
  {
    id: 'market', name: 'Market Hall', kind: 'area', pos: null, tag: 'Grade II · 1861',
    lines: ['The “Glass Umbrella”, built 1861', 'Named Best Small Indoor Market 2023', 'Saturday markets and Foodie Friday on the doorstep'],
  },
  {
    id: 'stmarys', name: 'St Mary’s Church', kind: 'area', pos: null, tag: 'Grade I',
    lines: ['Stockport’s oldest church, founded around 1190', 'Grade I listed: the top 2.5% of listed buildings', 'Red sandstone chancel from the early 1300s'],
  },
  {
    id: 'brewery', name: 'Robinsons Unicorn Brewery', kind: 'area', pos: [-8, 24, 70], tag: 'Since 1849',
    lines: ['The Robinson family brewed here from 1849', 'Home of Trooper, the Iron Maiden beer', 'Brewing moved to a new site in Bredbury in 2025; the Victorian brewery still frames the view'],
  },
  {
    id: 'staircase', name: 'Staircase House', kind: 'area', pos: [-182, 14, -27], tag: 'c.1460',
    lines: ['Stockport’s oldest home, dating from about 1460', 'Now a museum on the Market Place'],
  },
  {
    id: 'bridge', name: 'St Petersgate Bridge', kind: 'area', pos: [-194, 12, 73], tag: 'Grade II · 1868',
    lines: ['Cast-iron bridge over Little Underbank, built 1866–68', 'The most photographed spot in the Underbanks'],
  },
];

// Regeneration: the fly-to destinations, with their headline numbers
export const REGEN = [
  {
    id: 'interchange', name: 'Stockport Interchange', pos: [-372, 20, 470], cam: [-250, 120, 300], tag: '£140m · opened 2024',
    lines: ['Opened March 2024, with a 2-acre rooftop park (Viaduct Park)', '18 bus stands, up to 164 departures an hour', '196 new homes in the 14-storey tower above', 'National Transport Awards Project of the Year 2024'],
  },
  {
    id: 'station', name: 'Stockport Station', pos: [-132, 22, 734], cam: [-30, 140, 560], tag: 'Manchester from 8 min',
    lines: ['Manchester Piccadilly from 8 minutes; London Euston from 1h 56m', 'Plans for new station buildings and a footbridge, £100m+ (October 2026)', 'Metrolink to Stockport confirmed June 2025 in the £2.5bn GM transport deal'],
  },
  {
    id: 'exchange', name: 'Stockport Exchange', pos: [-100, 30, 660], cam: [40, 110, 520], tag: '£145m business quarter',
    lines: ['375,000 sq ft of Grade A offices, the North West’s most accessible business hub', '115-bed Holiday Inn Express and a 1,000-space car park', 'Next to the station: the commuter flow walks past the Underbanks'],
  },
  {
    id: 'viaduct', name: 'Stockport Viaduct', pos: [-520, 34, 560], cam: [-380, 90, 380], tag: '1840 · 22 arches',
    lines: ['Built 1839–40 with around 11 million bricks', '34 m high, Grade II* listed', 'The skyline Print House plot 37 looks out on'],
  },
  {
    id: 'tcw', name: 'Town Centre West', pos: [-560, 25, 640], cam: [-420, 160, 420], tag: '£1bn plan',
    lines: ['Up to 4,000 new homes and 1m sq ft of workspace over 15 years', 'Stockport 8: £350m, about 1,300 homes', 'Weir Mill: 253 homes in a restored mill on the Mersey'],
  },
  {
    id: 'merseyway', name: 'Merseyway and Redrock', pos: [-402, 16, 286], cam: [-260, 110, 160], tag: '10m visits in 2025',
    lines: ['Merseyway: 10 million+ visits in 2025, up 40% on 2024', 'Redrock: £45m leisure quarter with a 10-screen cinema', 'Three minutes’ walk from the Underbanks'],
  },
];

export const AREA_HEADLINE = [
  ['£1bn', 'town centre regeneration'],
  ['8 min', 'to Manchester Piccadilly'],
  ['1h 56m', 'to London Euston'],
  ['2024', 'Sunday Times best place to live in the North West'],
];

// ---------------------------------------------------------------- forecast rents per apartment (Brik estimates)
// Base: Charter House 1 bed £1,300 / 2 bed £1,550 (Salesforce estimates); The Print House 1 bed £1,250 / 2 bed £1,525
// (Brik forecast Oct 2026: £1,250 and £1,500–1,550). Premiums for top floor, views and the better layouts; rounded to £25.
const r25 = (x) => Math.round(x / 25) * 25;
export function rentFor(u, ph) {
  let r, why = [];
  if (ph === 'ubl') {   // Underbank Lofts: Investment Report forecast (Oct 2026) 1 bed £1,250–1,300, 2 bed £1,500–1,550
    if (u.beds === 2) return { pcm: 1500, why: ['two-bed, Investment Report forecast'] };
    r = 1250;
    if (u.plot === 13) { r += 25; why.push('top-floor corner, vaulted, extra eaves space'); }
    if (u.plot === 1) why.push('the largest one-bed, lower ground');
    return { pcm: r, why };
  }
  if (ph === 'osl') {   // Oldham Street Lofts: Brik forecast £875 pcm for a one-bed at completion (late 2027)
    if (u.beds === 3) return { pcm: 1350, why: ['three-bed townhouse, Brik estimate'] };
    r = 875;
    if (u.type === '1B') { r += 25; why.push('corner, dual aspect'); }
    if (u.type === '1C+') { r += 25; why.push('the largest one-bed'); }
    if (u.plot === 19) { r -= 25; why.push('a little smaller'); }
    return { pcm: r, why };
  }
  const lo = u.beds === 2 ? 1450 : 1250, hi = u.beds === 2 ? 1550 : 1325;   // 1 bed £1,250–£1,325, 2 bed £1,450–£1,550
  if (ph) {
    r = lo;
    if (u.floor === 4) { r += 50; why.push('top floor'); }
    if (u.floor === 0) { r -= 50; why.push('lower ground'); }
    if (u.plot === 37) { r += 25; why.push('viaduct views'); }
    if (u.side) { r += 25; why.push('private side-block landing'); }
    if (u.type === '1C') { r += 25; why.push('corner, two aspects'); }
  } else {
    r = lo;
    if (u.type === '1C') { r += 25; why.push('facing St Mary’s Gate'); }
    if (u.floor === 3) { r += 50; why.push('top floor'); }
    if (u.type === '2A' || u.type === '1D') { r += 50; why.push('corner view to the Market Hall'); }
    if (u.type === '1A') { r += 25; why.push('park-facing'); if (ENDS_PARK.includes(u.plot)) { r += 25; why.push('end of the walkway'); } }
    if (u.type === '1B' && ENDS_HARVEY.includes(u.plot)) { r += 25; why.push('end of the walkway'); }
    if (u.type === '1E') { r -= 50; why.push('courtyard, ground floor'); }
  }
  return { pcm: Math.min(hi, Math.max(lo, r25(r))), why };
}

// ---------------------------------------------------------------- Oldham Street Lofts (Hyde): early access, not urgency
export const OSL_PICKS = { 17: 'Charlie’s pick · corner one-bed', 1: 'End townhouse' };
export function oslPitch(u) {
  const p = { badge: OSL_PICKS[u.plot] || null, head: '', points: [], supply: null };
  if (u.house) {
    p.head = u.plot === 1 ? 'The end townhouse on Henry Street: the biggest of the nine, on the splayed corner.' : 'A proper three-bed townhouse with its own front door on Syddall Street and a garden behind.';
    p.points = ['Three bedrooms over three floors: kitchen and dining to the front, living room onto the garden, a top-floor bedroom under the rooflights.',
      'Freehold, with a private south-south-east facing garden and its own bin and bike store.',
      'Nine in the whole scheme, all on one terrace stepping up Syddall Street.'];
    return p;
  }
  if (u.type === '1B') {
    p.head = 'The corner apartment: light from Syddall Street and Oldham Street, right behind the painted name.';
    p.points = ['Dual-aspect living room on the chamfered corner, with the tall warehouse windows on two sides.', 'Off the stair core, so there is no walkway past your windows.', 'Only three corner apartments in the building, one per floor.'];
  } else if (u.type.startsWith('1C')) {
    p.head = u.type === '1C+' ? 'The largest one-bed in the building, on the quiet Oldham Street wing.' : 'Ground floor on the Oldham Street wing, over the residents’ garden.';
    p.points = ['Living room windows look down onto the residents’ garden; the bedroom faces Oldham Street.', 'Front door straight off the stair landing.', 'A hall with storage and a separate double bedroom.'];
  } else {
    p.head = u.floor === 2 ? 'Top floor under the roof, with two tall windows onto Syddall Street.' : u.floor === 0 ? 'Ground floor beside the archway, with two tall windows onto Syddall Street.' : 'Classic Lofts layout: two tall warehouse windows in the living room, bedroom at the back.';
    p.points = ['Open-plan kitchen and living behind two 4×4-pane warehouse windows onto Syddall Street.', 'Your own front door off the covered steel-and-glass walkway, looking over the residents’ garden.', 'Double bedroom and shower room tucked away at the back.'];
    if (u.floor === 2) p.points.push('Top floor: nobody above you.');
  }
  return p;
}
export const OSL_PROOF = [
  { k: 'Rents', v: 'One-beds forecast at £875 pcm at completion, a 6.7% gross yield at £157,000. Nearby: Warrington Street, Ashton, £955 pcm; Longlands Mill, Stalybridge, £825 pcm.' },
  { k: 'Transport', v: 'Hyde Central station a 9-minute walk; Manchester 7.5 miles, Stockport 5 miles.' },
  { k: 'Build', v: 'New build by Ollier Smurthwaite Architects (planning 24/00783/FUL), with a 10-year build warranty. Completion expected late 2027.' },
  { k: 'Early access', v: 'This is the private preview, before the November launch to the full database.' },
];

// ---------------------------------------------------------------- Underbank Lofts (St Petersgate): the last two
export const UBL_PICKS = { 1: 'The largest one-bed', 13: 'Top-floor corner' };
export function ublPitch(u) {
  const p = { badge: UBL_PICKS[u.plot] || null, head: '', points: [], supply: null };
  if (u.plot === 1) {
    p.head = 'The largest one-bed at Underbank Lofts, and one of only two homes left.';
    p.points = ['484 sq ft with 2.5 m ceilings in the converted 1872 Institute building.',
      'Two big original sash windows onto the sunken garden light well: light and privacy below the residents’ garden.',
      'Open-plan kitchen and living, a double bedroom, shower room, utility and store.',
      '£195,000 · forecast £1,250 pcm, about 7.7% gross.'];
  } else if (u.plot === 13) {
    p.head = 'The top-floor corner under the roof of the 1872 building: vaulted ceilings and four conservation rooflights.';
    p.points = ['398 sq ft at full height and 660 sq ft in all, including the eaves room.',
      'Dual aspect over St Petersgate and the garden towards High Street.',
      'Open-plan kitchen and living in the corner, a double bedroom, two shower rooms.',
      '£205,000 · forecast £1,250–£1,300 pcm, about 7.3–7.6% gross.'];
  } else {
    p.head = 'Sold.'; p.points = ['Only Plots 1 and 13 remain at Underbank Lofts.'];
  }
  return p;
}
export const UBL_PROOF = [
  { k: 'Rents', v: 'One-beds forecast at £1,250–£1,300 pcm (Investment Report, Oct 2026). Achieved at St Mary’s Gate nearby, May 2025: £1,100–£1,150.' },
  { k: 'The building', v: 'The 1872 Institute for the Blind, the Deaf and the Dumb by T. H. Allen, in the St Peter’s Conservation Area, with a new-build extension on High Street.' },
  { k: 'Terms', v: '999-year lease, nil ground rent, service charge £1.99 per sq ft, 10-year build warranty. Completion Q4 2026.' },
  { k: 'Only two left', v: '23 of the 25 apartments are sold. Plot 1 and Plot 13 are the last.' },
];
