"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import catalog from "@/data/seat-catalog.json";
import { simulateSector, SIMULATION_GROUP_IDS } from "@/lib/seat-simulation";
import { SceneErrorBoundary } from "@/components/stadium/SceneErrorBoundary";
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
  { ssr: false, loading: () => <p className="p-8">Cargando el estadio…</p> },
);
const groups = SIMULATION_GROUP_IDS.map((id) =>
  catalog.groups.find((g) => g.id === id)!,
);
const sectorData = new Map(
  groups.flatMap((g) =>
    g.sectors.map((s) => [s.id, simulateSector(g.id, s)] as const),
  ),
);
const controlClass =
  "rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-30";

export function SeatCatalogExplorer() {
  const [groupId, setGroupId] = useState(2287);
  const [sectorId, setSectorId] = useState<number | null>(null);
  const [seatId, setSeatId] = useState<number | null>(null);
  const [step, setStep] = useState<"sector" | "seat" | "preview">("sector");
  const [overview, setOverview] = useState(true);
  const reset = 0;
  const [sectorPage, setSectorPage] = useState(0);
  const [occupancy, setOccupancy] = useState(65);
  const [overrides, setOverrides] = useState<OccupancyOverrides>({});
  const [animate, setAnimate] = useState(true);
  const reducedMotion = useReducedMotion();
  const group = groups.find((g) => g.id === groupId)!;
  const visibleSectors = useMemo(
    () => group.sectors.slice(sectorPage * 6, sectorPage * 6 + 6),
    [group, sectorPage],
  );
  const visibleSeats = useMemo(
    () => visibleSectors.flatMap((s) => sectorData.get(s.id)!),
    [visibleSectors],
  );
  const sector =
    group.sectors.find((s) => s.id === sectorId) ?? group.sectors[0];
  const simulated = sectorData.get(sector.id)!;
  const selected = simulated.find((s) => s.id === seatId) ?? null;
  const seat = selected;
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
  const chooseSector = (id: number) => {
    setSectorId(id);
    setSeatId(null);
    setStep("seat");
    setOverview(true);
  };
  return (
    <main className="min-h-screen bg-[#071323] px-4 py-5 text-white md:px-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="display text-xl text-[#f6cc7c]">
          ← Quisqueya 3D
        </Link>
        <span className="utility text-[10px] text-white/50">Juan Marichal</span>
      </nav>
      <header className="my-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="utility text-xs text-[#f6cc7c]">Tu lugar en el play</p>
          <h1 className="display mt-2 text-4xl md:text-5xl">
            {step === "sector"
              ? "Elige dónde vivir el juego"
              : step === "seat"
                ? sector.name
                : "Así se ve desde tu butaca"}
          </h1>
        </div>
        <nav aria-label="Pasos de selección" className="flex gap-3 text-sm">
          <button
            className={
              step === "sector" ? "text-[#f6cc7c]" : "text-white/60 underline"
            }
            onClick={() => {
              setStep("sector");
              setOverview(true);
            }}
          >
            1. Sector
          </button>
          <span className="text-white/30">/</span>
          <button
            disabled={sectorId === null}
            className={
              step === "seat"
                ? "text-[#f6cc7c]"
                : "text-white/60 underline disabled:opacity-30"
            }
            onClick={() => {
              setStep("seat");
              setOverview(true);
            }}
          >
            2. Butaca
          </button>
          <span className="text-white/30">/</span>
          <span
            className={step === "preview" ? "text-[#f6cc7c]" : "text-white/30"}
          >
            3. Tu vista
          </span>
        </nav>
      </header>
      {step === "sector" && (
        <div
          className="mb-4 flex flex-wrap gap-2"
          aria-label="Divisiones del estadio"
        >
          {groups.map((g) => (
            <button
              key={g.id}
              aria-pressed={g.id === groupId}
              className={`${controlClass} ${g.id === groupId ? "bg-[#f6cc7c] text-[#071323]" : ""}`}
              onClick={() => {
                setGroupId(g.id);
                setSectorPage(0);
                setSectorId(null);
                setSeatId(null);
              }}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
      {step === "sector" && (
        <div
          className="mb-4 flex flex-wrap gap-2"
          aria-label="Tramos de sectores"
        >
          {Array.from(
            { length: Math.ceil(group.sectors.length / 6) },
            (_, page) => (
              <button
                key={page}
                aria-pressed={page === sectorPage}
                className={`${controlClass} ${page === sectorPage ? "bg-white/15" : ""}`}
                onClick={() => setSectorPage(page)}
              >
                {group.sectors[page * 6].name.replace("PALCO - ", "")} /{" "}
                {group.sectors[
                  Math.min(page * 6 + 5, group.sectors.length - 1)
                ].name.replace("PALCO - ", "")}
              </button>
            ),
          )}
        </div>
      )}
      <div
        className={`grid gap-5 ${step === "seat" ? "lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]" : ""}`}
      >
        <section className="min-w-0" aria-label="Estadio interactivo">
          <div className="overflow-hidden rounded-xl border border-white/20 bg-[#101f32]">
            <div
              className="flex items-center justify-between gap-3 p-4 text-sm"
              aria-live="polite"
            >
              <span>
                {step === "sector"
                  ? "Pulsa un sector sobre la grada"
                  : `${sector.name}${selected ? ` · Fila ${selected.row} · Butaca ${selected.label}` : " · Elige una butaca en el plano"}`}
              </span>
              {step === "preview" && (
                <button
                  className={controlClass}
                  onClick={() => setOverview(!overview)}
                >
                  {overview ? "Volver a mi butaca" : "Ubicar mi butaca"}
                </button>
              )}
            </div>
            <div className="relative h-[52svh] min-h-[360px] lg:h-[62svh]">
              <SceneErrorBoundary>
                <Scene
                  seat={seat}
                  overview={overview}
                  reset={reset}
                  spectators={step === "preview" ? spectators : []}
                  animateSpectators={
                    step === "preview" && animate && !reducedMotion
                  }
                  selectionSectors={
                    step === "sector"
                      ? visibleSectors.map((s) => ({
                          id: s.id,
                          name: s.name,
                          seats: sectorData.get(s.id)!,
                        }))
                      : []
                  }
                  onSelectSector={chooseSector}
                  focusSeats={
                    step === "seat"
                      ? simulated
                      : step === "sector"
                        ? visibleSeats
                        : undefined
                  }
                  reducedMotion={Boolean(reducedMotion)}
                />
              </SceneErrorBoundary>
            </div>
            <div className="px-4 py-3 text-xs text-white/60">
              {step === "preview" && !overview
                ? "Arrastra para mirar a tu alrededor · Usa las flechas con el visor enfocado"
                : "Arrastra para girar · Acerca con dos dedos o la rueda del ratón"}
            </div>
          </div>
          {step === "sector" && (
            <p className="mt-3 text-xs text-white/55">
              Selecciona una división para ver sus sectores. Nombres del
              catálogo oficial; ubicación 3D aproximada.
            </p>
          )}
          {step === "preview" && (
            <>
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
                    libres quedan vacías; tu butaca representa tus ojos sentado.
                    No es disponibilidad real de venta.
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

              <div className="my-5 flex flex-wrap gap-3">
                <button
                  className={controlClass}
                  onClick={() => {
                    setStep("seat");
                    setOverview(true);
                  }}
                >
                  ← Cambiar butaca
                </button>
                <a
                  href={catalog.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded bg-[#f6cc7c] px-5 py-3 font-semibold text-[#071323]"
                >
                  Ir a la venta oficial ↗
                </a>
              </div>
              <p className="text-xs text-white/50">
                Esta vista no reserva la butaca ni verifica su disponibilidad.
                En la venta oficial debes seleccionarla de nuevo.
              </p>
            </>
          )}
        </section>
        {step === "seat" && (
          <aside className="min-w-0 rounded-xl bg-[#f5f2e9] p-5 text-[#071323]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="utility text-xs text-[#267054]">Toca tu butaca</p>
                <h2 className="display mt-1 text-3xl">{sector.name}</h2>
              </div>
              <button
                className="text-sm underline"
                onClick={() => {
                  setStep("sector");
                  setOverview(true);
                }}
              >
                Cambiar sector
              </button>
            </div>
            <p className="mt-2 text-sm text-[#526174]">
              {sector.rows.length} filas · {sector.seatCount} butacas
            </p>
            <div
              className="my-5 max-h-[54svh] overflow-auto rounded-lg border border-[#26384e]/20 bg-white p-4"
              aria-label={`Plano de butacas de ${sector.name}`}
            >
              <div className="min-w-max">
                {[...sector.rows].reverse().map((r) => (
                  <div
                    key={r.label}
                    className="my-2 flex items-center justify-center gap-2"
                  >
                    <span className="w-5 text-xs font-bold">{r.label}</span>
                    {r.seats.map((s) => (
                      <button
                        key={s.id}
                        aria-label={`${sector.name}, fila ${r.label}, butaca ${s.label}`}
                        aria-pressed={selected?.id === s.id}
                        onClick={() => setSeatId(s.id)}
                        className={`h-10 min-w-10 rounded-t-xl rounded-b-md border-2 text-xs font-semibold transition-colors ${selected?.id === s.id ? "border-[#071323] bg-[#f6cc7c]" : "border-[#267054]/40 bg-[#267054]/10 hover:bg-[#267054]/25"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                    <span className="w-5 text-xs font-bold">{r.label}</span>
                  </div>
                ))}
                <div className="utility mt-6 border-t-4 border-[#267054] pt-2 text-center text-xs text-[#267054]">
                  ↓ Hacia el terreno / Home plate
                </div>
              </div>
            </div>
            <div
              className="border-t border-[#26384e]/20 pt-4"
              aria-live="polite"
            >
              <p className="font-semibold">
                {selected
                  ? `Fila ${selected.row} · Butaca ${selected.label}`
                  : "Elige una butaca en el plano"}
              </p>
              <p className="mt-1 text-xs text-[#526174]">
                Butacas numeradas del catálogo. Disponibilidad sin verificar.
              </p>
            </div>
            <button
              disabled={!selected}
              className="mt-4 w-full rounded-lg bg-[#071323] p-4 font-semibold text-[#f6cc7c] disabled:opacity-35"
              onClick={() => {
                setStep("preview");
                window.scrollTo({ top: 0, behavior: "instant" });
                setOverview(false);
              }}
            >
              Probar esta butaca →
            </button>
          </aside>
        )}
      </div>
    </main>
  );
}
