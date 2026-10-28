/*
 * Generuje js/data/shapes.js: kontury państw (gotowe ścieżki SVG), mini-mapę świata i sąsiedztwa.
 * Źródło: Natural Earth 1:50m / 1:110m (public domain) z paczki world-atlas.
 *
 * Uruchomienie: cd tools && npm install && node build-shapes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import * as topojson from 'topojson-client';
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoDistance, geoNaturalEarth1, geoPath } from 'd3-geo';

const root = new URL('../', import.meta.url);
const atlas = (file) => JSON.parse(readFileSync(new URL(`node_modules/world-atlas/${file}`, import.meta.url)));

const EARTH_RADIUS_KM = 6371;
const SIZE = 240; // kontur mieści się w kwadracie SIZE×SIZE
const TOLERANCE_PX = 0.4; // uproszczenie Douglasa-Peuckera
const MIN_RING_AREA_PX = 1; // drobniejsze wysepki są niewidoczne
const LINK_KM = 500; // wyspa zostaje, jeśli leży tak blisko już zachowanej części kraju (Svalbard, Azory, Galapagos odpadają)
const TINY_KM2 = 2000; // mniejsze państwa są nierozpoznawalne po konturze

// Nazwy w Natural Earth; dodatkowe nazwy są scalane z krajem.
const NE_NAMES = {
  al: 'Albania', ad: 'Andorra', at: 'Austria', by: 'Belarus', be: 'Belgium', ba: 'Bosnia and Herz.',
  bg: 'Bulgaria', hr: 'Croatia', cy: ['Cyprus', 'N. Cyprus'], me: 'Montenegro', cz: 'Czechia', dk: 'Denmark',
  ee: 'Estonia', fi: ['Finland', 'Åland'], fr: 'France', gr: 'Greece', es: 'Spain', nl: 'Netherlands',
  ie: 'Ireland', is: 'Iceland', xk: 'Kosovo', li: 'Liechtenstein', lt: 'Lithuania', lu: 'Luxembourg',
  lv: 'Latvia', mk: 'Macedonia', mt: 'Malta', md: 'Moldova', mc: 'Monaco', de: 'Germany', no: 'Norway',
  pl: 'Poland', pt: 'Portugal', ru: 'Russia', ro: 'Romania', sm: 'San Marino', rs: 'Serbia', sk: 'Slovakia',
  si: 'Slovenia', ch: 'Switzerland', se: 'Sweden', ua: 'Ukraine', va: 'Vatican', hu: 'Hungary',
  gb: 'United Kingdom', it: 'Italy',

  af: 'Afghanistan', sa: 'Saudi Arabia', am: 'Armenia', az: 'Azerbaijan', bh: 'Bahrain', bd: 'Bangladesh',
  bt: 'Bhutan', bn: 'Brunei', cn: 'China', ph: 'Philippines', ge: 'Georgia', in: 'India', id: 'Indonesia',
  iq: 'Iraq', ir: 'Iran', il: 'Israel', jp: 'Japan', ye: 'Yemen', jo: 'Jordan', kh: 'Cambodia', qa: 'Qatar',
  kz: 'Kazakhstan', kg: 'Kyrgyzstan', kr: 'South Korea', kp: 'North Korea', kw: 'Kuwait', la: 'Laos',
  lb: 'Lebanon', mv: 'Maldives', my: 'Malaysia', mm: 'Myanmar', mn: 'Mongolia', np: 'Nepal', om: 'Oman',
  pk: 'Pakistan', ps: 'Palestine', sg: 'Singapore', lk: 'Sri Lanka', sy: 'Syria', tj: 'Tajikistan',
  th: 'Thailand', tw: 'Taiwan', tl: 'Timor-Leste', tr: 'Turkey', tm: 'Turkmenistan', uz: 'Uzbekistan',
  vn: 'Vietnam', ae: 'United Arab Emirates',

  dz: 'Algeria', ao: 'Angola', bj: 'Benin', bw: 'Botswana', bf: 'Burkina Faso', bi: 'Burundi', td: 'Chad',
  cd: 'Dem. Rep. Congo', dj: 'Djibouti', eg: 'Egypt', er: 'Eritrea', sz: 'eSwatini', et: 'Ethiopia',
  ga: 'Gabon', gm: 'Gambia', gh: 'Ghana', gn: 'Guinea', gw: 'Guinea-Bissau', gq: 'Eq. Guinea', cm: 'Cameroon',
  ke: 'Kenya', km: 'Comoros', cg: 'Congo', ls: 'Lesotho', lr: 'Liberia', ly: 'Libya', mg: 'Madagascar',
  mw: 'Malawi', ml: 'Mali', ma: 'Morocco', mr: 'Mauritania', mu: 'Mauritius', mz: 'Mozambique', na: 'Namibia',
  ne: 'Niger', ng: 'Nigeria', za: 'South Africa', cf: 'Central African Rep.', cv: 'Cabo Verde', rw: 'Rwanda',
  sn: 'Senegal', sc: 'Seychelles', sl: 'Sierra Leone', so: ['Somalia', 'Somaliland'], sd: 'Sudan',
  ss: 'S. Sudan', tz: 'Tanzania', tg: 'Togo', tn: 'Tunisia', ug: 'Uganda', ci: 'Côte d\'Ivoire',
  st: 'São Tomé and Principe', zm: 'Zambia', zw: 'Zimbabwe',

  ag: 'Antigua and Barb.', bs: 'Bahamas', bb: 'Barbados', bz: 'Belize', dm: 'Dominica', do: 'Dominican Rep.',
  gd: 'Grenada', gt: 'Guatemala', ht: 'Haiti', hn: 'Honduras', jm: 'Jamaica', ca: 'Canada', cr: 'Costa Rica',
  cu: 'Cuba', mx: 'Mexico', ni: 'Nicaragua', pa: 'Panama', kn: 'St. Kitts and Nevis', lc: 'Saint Lucia',
  vc: 'St. Vin. and Gren.', sv: 'El Salvador', us: 'United States of America', tt: 'Trinidad and Tobago',

  ar: 'Argentina', bo: 'Bolivia', br: 'Brazil', cl: 'Chile', ec: 'Ecuador', gy: 'Guyana', co: 'Colombia',
  py: 'Paraguay', pe: 'Peru', sr: 'Suriname', uy: 'Uruguay', ve: 'Venezuela',

  au: 'Australia', fj: 'Fiji', ki: 'Kiribati', fm: 'Micronesia', nr: 'Nauru', nz: 'New Zealand', pw: 'Palau',
  pg: 'Papua New Guinea', ws: 'Samoa', to: 'Tonga', tv: 'Tuvalu', vu: 'Vanuatu', mh: 'Marshall Is.',
  sb: 'Solomon Is.',
};

// Wyjątki od reguły odrzucania odległych terytoriów.
const KEEP_AREA_SHARE = { us: 0.05 }; // USA zachowują Alaskę (nie Hawaje)
const DROP_PART = { no: ([, lat]) => lat > 72 }; // Svalbard łączy się z lądem łańcuchem przez Wyspę Niedźwiedzią

// --- Lista krajów z aplikacji (jedno źródło prawdy) ---

function loadCountries() {
  const context = { window: {} };
  vm.runInNewContext(readFileSync(new URL('js/data/countries.js', root), 'utf8'), context);
  return context.window.Quizorama.data.countries;
}

// --- Geometria ---

const polygonsOf = (geometry) => {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
};
const asPolygon = (coordinates) => ({ type: 'Polygon', coordinates });

// Zostawia główną część kraju i wyspy „połączone” z nią łańcuchem odległości ≤ LINK_KM.
function dropDistantParts(code, polygons) {
  const dropPart = DROP_PART[code] || (() => false);
  const parts = polygons.filter((coords) => !dropPart(geoCentroid(asPolygon(coords)))).map((coords) => ({
    coords,
    area: geoArea(asPolygon(coords)),
    centroid: geoCentroid(asPolygon(coords)),
    vertices: coords[0].filter((_, i) => i % 4 === 0),
  }));
  const main = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const keepShare = KEEP_AREA_SHARE[code];
  const kept = new Set([main]);
  for (const p of parts) if (keepShare && p.area >= main.area * keepShare) kept.add(p);

  const linkRad = LINK_KM / EARTH_RADIUS_KM;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of parts) {
      if (kept.has(p)) continue;
      const near = [...kept].some((k) => k.vertices.some((v) => geoDistance(p.centroid, v) <= linkRad));
      if (near) {
        kept.add(p);
        changed = true;
      }
    }
  }
  return { polygons: parts.filter((p) => kept.has(p)).map((p) => p.coords), dropped: polygons.length - kept.size };
}

// Zbiera pierścienie po rzutowaniu (kontekst dla geoPath).
function projectRings(projection, geojson) {
  const rings = [];
  let ring = null;
  geoPath(projection, {
    moveTo(x, y) { ring = [[x, y]]; rings.push(ring); },
    lineTo(x, y) { ring.push([x, y]); },
    closePath() {},
    arc() {},
  })(geojson);
  return rings;
}

// Odległość punktu od odcinka a–b; dla odcinka zerowej długości — od punktu a.
function segmentDistance([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (!len) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * (px - ax) - dx * (py - ay)) / len;
}

function simplifyRing(points, tolerance) {
  if (points.length <= 3) return points;
  const last = points.length - 1;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[last] = 1;

  // Pierścień zamknięty (np. po przecięciu na antypołudniku) zaczyna się i kończy w tym samym punkcie —
  // dzielimy go w punkcie najdalszym od początku, inaczej cały kształt zapada się do odcinka.
  let split = 1;
  for (let i = 1; i < last; i++) {
    if (Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1])
      > Math.hypot(points[split][0] - points[0][0], points[split][1] - points[0][1])) split = i;
  }
  keep[split] = 1;
  const stack = [[0, split], [split, last]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxDist = 0, index = -1;
    for (let i = a + 1; i < b; i++) {
      const dist = segmentDistance(points[i], points[a], points[b]);
      if (dist > maxDist) { maxDist = dist; index = i; }
    }
    if (maxDist > tolerance) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const ringArea = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
  const [nx, ny] = pts[(i + 1) % pts.length];
  return s + x * ny - nx * y;
}, 0)) / 2;

const num = (n) => {
  const s = (Math.round(n * 10) / 10).toString();
  return s.replace(/^(-?)0\./, '$1.');
};

// Ścieżka SVG ze współrzędnymi względnymi (krótsza), precyzja 0,1 px.
function toPath(rings) {
  let d = '';
  for (const ring of rings) {
    const pts = ring.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    const [x0, y0] = pts[0];
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      if (dx || dy) deltas.push(`${num(dx)} ${num(dy)}`);
    }
    d += `M${num(x0)} ${num(y0)}l${deltas.join(' ')}z`;
  }
  return d.replace(/ -/g, '-');
}

function renderShape(projection, geojson, { tolerance, minArea, keepLargest = true }) {
  const rings = projectRings(projection, geojson).map((r) => simplifyRing(r, tolerance)).filter((r) => r.length >= 3);
  const largest = Math.max(...rings.map(ringArea));
  const visible = rings.filter((r) => ringArea(r) >= minArea || (keepLargest && ringArea(r) === largest));
  return toPath(visible);
}

// --- Budowanie ---

const countries = loadCountries();
const topo50 = atlas('countries-50m.json');
const geoms = topo50.objects.countries.geometries;
const byName = new Map(geoms.map((g) => [g.properties.name, g]));

const out = { countries: {}, neighbors: {}, world: null };
const missing = [];
const tiny = [];
const report = [];
const codeOfGeom = new Map();

// Mini-mapa świata (110m wystarcza w tej skali).
const worldProjection = geoNaturalEarth1().fitSize([360, 180], { type: 'Sphere' });
const landTopo = atlas('land-110m.json');
const landGeometry = topojson.merge(landTopo, landTopo.objects.land.geometries);
const land = { // bez Antarktydy — tylko zajmuje miejsce na małej mapie
  type: 'MultiPolygon',
  coordinates: polygonsOf(landGeometry).filter((p) => geoCentroid(asPolygon(p))[1] > -60),
};
out.world = {
  viewBox: '0 0 360 180',
  d: renderShape(worldProjection, land, { tolerance: 0.3, minArea: 0.5 }),
};

for (const c of countries) {
  const names = [].concat(NE_NAMES[c.code] || []);
  const parts = names.map((n) => byName.get(n)).filter(Boolean);
  if (!parts.length) {
    missing.push(c.code);
    out.countries[c.code] = { tiny: true };
    continue;
  }
  for (const g of parts) codeOfGeom.set(g, c.code);

  const merged = parts.length > 1 ? topojson.merge(topo50, parts) : topojson.feature(topo50, parts[0]).geometry;
  const { polygons, dropped } = dropDistantParts(c.code, polygonsOf(merged));
  const geometry = { type: 'MultiPolygon', coordinates: polygons };
  const areaKm2 = geoArea(geometry) * EARTH_RADIUS_KM ** 2;
  const [lon, lat] = geoCentroid(geometry);
  const loc = worldProjection([lon, lat]).map((v) => Math.round(v * 10) / 10);

  if (areaKm2 < TINY_KM2) {
    tiny.push(`${c.code} (${Math.round(areaKm2)} km²)`);
    out.countries[c.code] = { tiny: true, loc };
    continue;
  }

  const projection = geoAzimuthalEqualArea().rotate([-lon, -lat]).fitSize([SIZE, SIZE], geometry);
  const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(geometry);
  const pad = 4;
  const viewBox = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map((v) => Math.round(v)).join(' ');
  out.countries[c.code] = {
    viewBox,
    loc,
    d: renderShape(projection, geometry, { tolerance: TOLERANCE_PX, minArea: MIN_RING_AREA_PX }),
  };
  if (dropped) report.push(`${c.code}: odrzucono ${dropped} odległych części`);
}

// Sąsiedzi (wspólna granica w topologii 50m).
const neighborIdx = topojson.neighbors(geoms);
geoms.forEach((g, i) => {
  const code = codeOfGeom.get(g);
  if (!code) return;
  const set = new Set(out.neighbors[code] || []);
  for (const j of neighborIdx[i]) {
    const other = codeOfGeom.get(geoms[j]);
    if (other && other !== code) set.add(other);
  }
  if (set.size) out.neighbors[code] = [...set].sort();
});

const js = `// Wygenerowane przez tools/build-shapes.mjs — nie edytuj ręcznie.
// Dane: Natural Earth (public domain), przez world-atlas.
(function (Q) {
  'use strict';
  Q.data = Q.data || {};
  Q.data.shapes = ${JSON.stringify(out)};
})(window.Quizorama = window.Quizorama || {});
`;
writeFileSync(new URL('js/data/shapes.js', root), js);

const drawn = Object.values(out.countries).filter((s) => s.d).length;
console.log(`Kraje: ${countries.length}, z konturem: ${drawn}, pominięte (małe): ${tiny.length}, brak w danych: ${missing.join(', ') || '—'}`);
console.log(`Małe: ${tiny.join(', ')}`);
console.log(report.join('\n'));
console.log(`Rozmiar js/data/shapes.js: ${(Buffer.byteLength(js) / 1024).toFixed(0)} KB`);
