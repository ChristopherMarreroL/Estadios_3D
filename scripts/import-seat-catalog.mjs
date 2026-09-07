import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// Parse only JSON literals from the archived public assets; never execute them.
const raw = readFileSync('artifacts/uepa-reference/plano-sala.js.txt', 'utf8');
const labels = readFileSync('artifacts/uepa-reference/zone-labels.js.txt', 'utf8');
const zones = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1));
const names = JSON.parse(labels.match(/var objsZoneGroupsCache = (\[.*?\]);/s)[1])[0];
const seen = new Set();
const groups = Object.entries(names).map(([id, name]) => ({
  id: Number(id), name: name.trim().replace(/\s+/g, ' '),
  sectors: zones.filter(z => z.idGrupoZonas === Number(id)).map(z => {
    assert.equal(z.idPlanoSala, 531);
    const rows = new Map();
    const seats = z.butacas ?? [];
    for (const seat of seats) {
      assert.equal(seat.idZona, z.idZona);
      const key = `${z.idZona}:${seat.idButaca}`;
      assert(!seen.has(key), `Duplicate seat ${key}`);
      seen.add(key);
      const row = String(seat.litFila);
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push({ id: seat.idButaca, label: String(seat.litButaca) });
    }
    if (z.numerada) assert.equal(z.aforo, seats.length, z.litZona);
    return { id: z.idZona, name: z.litZona.trim().replace(/\s+/g, ' '), sourceName: z.litZona,
      numbered: z.numerada, declaredCapacity: z.aforo, seatCount: seats.length,
      rows: [...rows].map(([label, seats]) => ({ label, seats })) };
  }).sort((a,b) => a.name.localeCompare(b.name, 'es', { numeric: true }))
}));
const catalog = {
  source: { url: 'https://licey.uepatickets.com/beisbol/en/comprarEvento?idEvento=2248',
    assetUrl: 'https://licey.uepatickets.com/beisbol/en/cachejs/PlanoSala-718-88365719.js',
    labelsUrl: 'https://d34zr2xn9tb12e.cloudfront.net/beisbol/cachejs/MultiLngZonesRoom-718-en_US-88365719.js',
    event: 'Abono Licey 2026 - 2027', retrievedDate: '2026-09-06', planId: 531,
    sha256: createHash('sha256').update(raw).digest('hex') },
  availability: 'unknown', geometry: 'unmapped',
  totalSeats: seen.size, totalSectors: zones.length, groups
};
writeFileSync('src/data/seat-catalog.json', JSON.stringify(catalog));
console.log(JSON.stringify({totalSeats:seen.size,totalSectors:zones.length, groups:groups.map(g=>({name:g.name,sectors:g.sectors.length,seats:g.sectors.reduce((n,s)=>n+s.seatCount,0)}))},null,2));
