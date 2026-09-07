"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import catalog from "@/data/seat-catalog.json";
import { simulateSector, SIMULATION_GROUP_IDS } from "@/lib/seat-simulation";
import { SceneErrorBoundary } from "@/components/stadium/SceneErrorBoundary";
import { useReducedMotion } from "framer-motion";
import {
  isDemoOccupied,
  occupancyKey,
  seatNeighbors,
  type OccupancyOverrides,
} from "@/lib/seat-occupancy";

const Scene = dynamic(
  () =>
    import("@/components/stadium/SeatSimulationScene").then(
      (m) => m.SeatSimulationScene,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-white/60">
        Cargando el estadio…
      </div>
    ),
  },
);
const groups = [...catalog.groups].sort(
  (a, b) =>
    (SIMULATION_GROUP_IDS.includes(a.id)
      ? SIMULATION_GROUP_IDS.indexOf(a.id)
      : 99) -
    (SIMULATION_GROUP_IDS.includes(b.id)
      ? SIMULATION_GROUP_IDS.indexOf(b.id)
      : 99),
);
const selectClass =
  "mt-2 w-full rounded border border-white/20 bg-[#101f32] p-3 text-sm";
const controlClass =
  "rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-30";
const sectorData = new Map(
  groups.flatMap((g) =>
    g.sectors.map(
      (s) =>
        [
          s.id,
          {
            simulated: simulateSector(g.id, s),
            allSeats: s.rows.flatMap((r) =>
              r.seats.map((seat) => ({ ...seat, row: r.label })),
            ),
          },
        ] as const,
    ),
  ),
);

export function SeatCatalogExplorer() {
  const [groupId, setGroupId] = useState(2287);
  const [sectorId, setSectorId] = useState(11626);
  const [seatId, setSeatId] = useState<number | null>(1200);
  const [overview, setOverview] = useState(false);
  const [reset, setReset] = useState(0);
  const [occupancy, setOccupancy] = useState(65);
  const [overrides, setOverrides] = useState<OccupancyOverrides>({});
  const [animate, setAnimate] = useState(true);
  const reducedMotion = useReducedMotion();
  const group = groups.find((g) => g.id === groupId)!;
  const sector =
    group.sectors.find((s) => s.id === sectorId) ?? group.sectors[0];
  const { simulated, allSeats } = sectorData.get(sector.id)!;
  const selected = allSeats.find((s) => s.id === seatId) ?? allSeats[0] ?? null;
  const seat = simulated.find((s) => s.id === selected?.id) ?? null;
  const spectators = simulated.filter(
    (s) => s.id !== seat?.id && isDemoOccupied(s, occupancy, overrides),
  );
  const neighbors = seatNeighbors(simulated, seat);
  const rowIndex = sector.rows.findIndex((r) => r.label === selected?.row);
  const row = sector.rows[rowIndex];
  const seatIndex = row?.seats.findIndex((s) => s.id === selected?.id) ?? -1;
  const choose = (id: number) => {
    setSeatId(id);
    setOverview(false);
  };
  const changeRow = (index: number) => {
    const next = sector.rows[index];
    if (next)
      choose(
        next.seats[Math.min(Math.max(seatIndex, 0), next.seats.length - 1)].id,
      );
  };
  return (
    <main className="min-h-screen bg-[#03070f] px-4 py-5 text-white md:px-8">
      <nav className="flex items-center justify-between gap-4 text-sm">
        <Link href="/" className="display text-xl text-[#f6cc7c]">
          ← Quisqueya 3D
        </Link>
        <a
          href={catalog.source.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-white/60 underline"
        >
          Plano oficial ↗
        </a>
      </nav>
      <header className="my-6">
        <p className="utility text-[10px] text-[#f6cc7c]">
          Estadio Quisqueya Juan Marichal
        </p>
        <h1 className="display mt-2 text-4xl md:text-5xl">
          El play desde tu butaca
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-white/60">
          Cambia de fila o de asiento y compara el ángulo hacia el terreno.
          Nombres oficiales; posiciones y alturas aproximadas.
        </p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section
          id="seat-preview"
          className="order-1 min-w-0 lg:sticky lg:top-4 lg:order-2"
          aria-label="Simulación de la butaca"
        >
          <div className="overflow-hidden rounded-lg border border-white/20 bg-[#101f32]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div aria-live="polite">
                <h2 className="font-semibold">{sector.name}</h2>
                <p className="text-sm text-[#f6cc7c]">
                  {selected
                    ? `Fila ${selected.row} · Butaca ${selected.label}`
                    : "Zona sin numeración"}
                </p>
              </div>
              {seat && (
                <button
                  onClick={() => setOverview(!overview)}
                  className={controlClass}
                >
                  {overview ? "Volver a mi butaca" : "Ubicar mi butaca"}
                </button>
              )}
            </div>
            <div className="relative h-[42svh] min-h-[280px] lg:h-[53svh]">
              <SceneErrorBoundary>
                <Scene
                  seat={seat}
                  overview={overview}
                  reset={reset}
                  spectators={spectators}
                  animateSpectators={animate && !reducedMotion}
                />
              </SceneErrorBoundary>
              {!seat && (
                <div className="absolute inset-x-3 bottom-3 rounded bg-[#071323]/95 p-3 text-sm">
                  {sector.numbered
                    ? "La simulación de esta zona aún no está configurada. Puedes consultar sus butacas abajo."
                    : "Esta zona no tiene butacas numeradas."}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 px-4 py-3 text-xs text-white/65">
              <span>
                {overview || !seat
                  ? "Arrastra para recorrer el estadio"
                  : "Arrastra para mirar · Flechas con el visor enfocado"}
              </span>
              {seat && (
                <button
                  onClick={() => {
                    setOverview(false);
                    setReset((n) => n + 1);
                  }}
                  className="text-[#f6cc7c] underline"
                >
                  Mirar al terreno
                </button>
              )}
            </div>
          </div>
          {selected && (
            <div
              className="mt-3 flex flex-wrap gap-2"
              aria-label="Comparar localidades"
            >
              <button
                className={controlClass}
                disabled={seatIndex <= 0}
                onClick={() => choose(row.seats[seatIndex - 1].id)}
              >
                ← Butaca anterior
              </button>
              <button
                className={controlClass}
                disabled={seatIndex >= row.seats.length - 1}
                onClick={() => choose(row.seats[seatIndex + 1].id)}
              >
                Butaca siguiente →
              </button>
              <button
                className={controlClass}
                disabled={rowIndex <= 0}
                onClick={() => changeRow(rowIndex - 1)}
              >
                Fila anterior
              </button>
              <button
                className={controlClass}
                disabled={rowIndex >= sector.rows.length - 1}
                onClick={() => changeRow(rowIndex + 1)}
              >
                Fila posterior
              </button>
            </div>
          )}
          {seat && (
            <fieldset className="mt-4 rounded-lg border border-white/15 bg-[#0a1423] p-4">
              <legend className="px-2 text-sm text-[#f6cc7c]">
                Público de demostración
              </legend>
              <div className="flex flex-wrap items-center gap-4">
                <label htmlFor="crowd-density" className="text-sm">
                  Ocupación simulada: {occupancy}%
                </label>
                <input
                  id="crowd-density"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={occupancy}
                  onChange={(e) => {
                    setOccupancy(Number(e.target.value));
                    setOverrides({});
                  }}
                  className="w-40 accent-[#f6cc7c]"
                />
                <button
                  className={controlClass}
                  disabled={Boolean(reducedMotion)}
                  onClick={() => setAnimate(!animate)}
                >
                  {animate && !reducedMotion
                    ? "Pausar celebración"
                    : "Animar celebración"}
                </button>
              </div>
              <p className="mt-2 text-xs text-white/55">
                {spectators.length} espectadores en este sector. Las butacas
                libres quedan vacías; tu butaca representa tus ojos sentado. No
                es disponibilidad real de venta.
                {reducedMotion
                  ? " Movimiento desactivado por tu preferencia de accesibilidad."
                  : ""}
              </p>
              {neighbors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {neighbors.map((n) => {
                    const occupied = isDemoOccupied(
                      n.seat,
                      occupancy,
                      overrides,
                    );
                    return (
                      <button
                        key={n.label}
                        aria-pressed={occupied}
                        onClick={() =>
                          setOverrides((current) => ({
                            ...current,
                            [occupancyKey(n.seat)]: !occupied,
                          }))
                        }
                        className={controlClass}
                      >
                        {n.label} · {n.seat.row}/{n.seat.label}:{" "}
                        {occupied ? "ocupada" : "libre"}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-xs text-white/45">
                Pulsa un vecino para ocupar o vaciar su butaca y comparar la
                visibilidad. El deslizador reinicia estos ajustes.
              </p>
            </fieldset>
          )}
          <p className="mt-3 text-xs leading-5 text-white/50">
            Simulación conceptual: distancias, sentido de numeración y
            visibilidad sin mediciones del estadio. La ubicación cambia por
            butaca; no garantiza una vista real sin obstáculos.
          </p>
        </section>
        <aside className="order-2 rounded-lg border border-white/15 bg-[#0a1423] p-4 lg:order-1">
          <label htmlFor="catalog-group" className="text-sm text-white/65">
            División
          </label>
          <select
            id="catalog-group"
            value={groupId}
            onChange={(e) => {
              const g = groups.find((g) => g.id === Number(e.target.value))!;
              setGroupId(g.id);
              setSectorId(g.sectors[0].id);
              setSeatId(null);
              setOverview(false);
            }}
            className={selectClass}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <label
            htmlFor="catalog-sector"
            className="mt-5 block text-sm text-white/65"
          >
            Sector
          </label>
          <select
            id="catalog-sector"
            value={sector.id}
            onChange={(e) => {
              setSectorId(Number(e.target.value));
              setSeatId(null);
              setOverview(false);
            }}
            className={selectClass}
          >
            {group.sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs text-white/50">
            {sector.rows.length} filas · {sector.seatCount} butacas en este
            sector
          </p>
          {selected && (
            <>
              <label
                htmlFor="catalog-row"
                className="mt-5 block text-sm text-white/65"
              >
                Fila
              </label>
              <select
                id="catalog-row"
                value={rowIndex}
                onChange={(e) => changeRow(Number(e.target.value))}
                className={selectClass}
              >
                {sector.rows.map((r, i) => (
                  <option key={r.label} value={i}>
                    Fila {r.label}
                  </option>
                ))}
              </select>
              <h2 className="mt-5 text-sm text-white/65">
                Butacas de la fila {selected.row}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.seats.map((s) => (
                  <button
                    key={s.id}
                    aria-label={`${sector.name}, fila ${row.label}, butaca ${s.label}`}
                    aria-pressed={selected.id === s.id}
                    onClick={() => choose(s.id)}
                    className={`min-h-11 min-w-11 rounded border px-2 text-sm ${selected.id === s.id ? "border-[#f6cc7c] bg-[#f6cc7c] text-black" : "border-white/20 bg-[#101f32] hover:border-[#f6cc7c]"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/45">
                Identificador: {selected.id}. El orden izquierda/derecha se
                conserva del catálogo y es provisional en 3D.
              </p>
              <a
                href="#seat-preview"
                className="mt-4 block rounded bg-[#f6cc7c] px-4 py-3 text-center text-sm font-semibold text-[#071323] lg:hidden"
              >
                Ver esta butaca en 3D ↑
              </a>
            </>
          )}
          {!sector.numbered && (
            <p className="mt-5 text-sm text-white/60">
              Capacidad declarada: {sector.declaredCapacity}. Zona sin butacas
              numeradas.
            </p>
          )}
          <details className="mt-6 border-t border-white/15 pt-4 text-xs leading-5 text-white/50">
            <summary className="cursor-pointer">Sobre estos datos</summary>
            <p className="mt-2">
              11,975 registros en el catálogo de abonos 2026–2027, consultado el
              6 de septiembre de 2026. Los conteos no indican disponibilidad ni
              aforo certificado. Esta experiencia no reserva asientos.
            </p>
          </details>
        </aside>
      </div>
    </main>
  );
}
