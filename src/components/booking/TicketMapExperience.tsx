"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  MapPin,
  RotateCcw,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { SceneErrorBoundary } from "@/components/stadium/SceneErrorBoundary";
import {
  availableCount,
  purchasedSpectators,
  MAX_TICKETS,
  ticketSeats,
  ticketSectors,
  TICKET_CATEGORIES,
  toggleTicket,
  type TicketSeat,
  type TicketSector,
} from "@/lib/ticket-inventory";
import { formatCurrency } from "@/lib/formatCurrency";
import catalog from "@/data/seat-catalog.json";
import "./ticket-experience.css";

const SelectionScene = dynamic(
  () =>
    import("@/components/stadium/TicketSelectionScene").then(
      (m) => m.TicketSelectionScene,
    ),
  {
    ssr: false,
    loading: () => <div className="scene-loading">Cargando el estadio 3D…</div>,
  },
);
const PreviewScene = dynamic(
  () =>
    import("@/components/stadium/SeatSimulationScene").then(
      (m) => m.SeatSimulationScene,
    ),
  {
    ssr: false,
    loading: () => <div className="scene-loading">Preparando tu vista…</div>,
  },
);

function TicketPrompt({
  kind,
  seat,
  onConfirm,
  onClose,
}: {
  kind: "add" | "remove";
  seat: TicketSeat;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const remove = kind === "remove";
  useEffect(() => {
    const d = dialog.current!;
    const focused = document.activeElement as HTMLElement | null;
    d.showModal();
    return () => {
      d.close();
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="ticket-confirm"
      aria-labelledby="ticket-confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className={
          remove ? "ticket-confirm-mark is-remove" : "ticket-confirm-mark"
        }
      >
        {remove ? <Trash2 size={22} /> : <Ticket size={22} />}
      </div>
      <h2 id="ticket-confirm-title">
        {remove ? "¿Quitar esta entrada?" : "¿Añadir al carrito?"}
      </h2>
      <p>
        {seat.category} · {seat.sector}
        <strong>
          Fila {seat.row} · Butaca {seat.label}
        </strong>
        <span>{formatCurrency(seat.price)}</span>
      </p>
      <div className="ticket-confirm-actions">
        <button type="button" autoFocus={remove} onClick={onClose}>
          {remove ? "Conservarla" : "Seguir mirando"}
        </button>
        <button
          type="button"
          autoFocus={!remove}
          className={remove ? "ticket-confirm-danger" : "ticket-confirm-yes"}
          onClick={onConfirm}
        >
          {remove ? "Quitar entrada" : "Añadir al carrito"}
        </button>
      </div>
    </dialog>
  );
}

function SeatPreview({
  seat,
  onClose,
}: {
  seat: TicketSeat;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reset, setReset] = useState(0),
    [crowd, setCrowd] = useState(true);
  const reduced = useReducedMotion();
  const spectators = useMemo(() => purchasedSpectators(seat.key), [seat.key]);
  useEffect(() => {
    const d = dialog.current!;
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    d.showModal();
    return () => {
      d.close();
      document.body.style.overflow = overflow;
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="ticket-preview"
      aria-labelledby="preview-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <p className="ticket-kicker">Desde tu butaca</p>
          <h2 id="preview-title">
            {seat.sector} · Fila {seat.row} · Butaca {seat.label}
          </h2>
        </div>
        <button
          className="ticket-icon"
          onClick={onClose}
          aria-label="Cerrar vista 3D"
        >
          <X size={20} />
        </button>
      </header>
      <div className="seat-preview-canvas">
        <SceneErrorBoundary>
          <PreviewScene
            seat={seat.simulation}
            overview={false}
            reset={reset}
            spectators={crowd ? spectators : []}
            animateSpectators={crowd && !reduced}
            reducedMotion={Boolean(reduced)}
          />
        </SceneErrorBoundary>
      </div>
      <footer>
        <div className="ticket-actions">
          <button onClick={() => setReset((n) => n + 1)}>
            <RotateCcw size={15} /> Mirar al terreno
          </button>
          <button aria-pressed={crowd} onClick={() => setCrowd(!crowd)}>
            {crowd ? "Ocultar público" : "Mostrar público"}
          </button>
          <button onClick={onClose}>
            <ArrowLeft size={15} /> Volver a elegir
          </button>
        </div>
        <p>
          Arrastra para mirar alrededor. Vista aproximada; el público ocupa
          los asientos comprados del inventario de demostración, en todos los
          sectores.
        </p>
      </footer>
    </dialog>
  );
}

export function TicketMapExperience() {
  const [sector, setSector] = useState<TicketSector | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<TicketSeat | null>(null),
    [hover, setHover] = useState("");
  const [reset, setReset] = useState(0),
    [roof, setRoof] = useState(false),
    [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState<{
    kind: "add" | "remove";
    seat: TicketSeat;
  } | null>(null);
  const reduced = useReducedMotion();
  const tickets = selected.map((k) => ticketSeats.get(k)!);
  const total = tickets.reduce((sum, s) => sum + s.price, 0);
  function chooseSector(s: TicketSector) {
    setSector(s);
    setReset((n) => n + 1);
    setMessage("");
    setHover("");
  }
  function chooseSeat(s: TicketSeat) {
    if (!s.available) {
      setMessage("Esta butaca está agotada en la demostración.");
      return;
    }
    if (selected.includes(s.key)) {
      setPrompt({ kind: "remove", seat: s });
      setMessage("");
      return;
    }
    if (selected.length >= MAX_TICKETS) {
      setMessage(`Puedes elegir hasta ${MAX_TICKETS} entradas.`);
      return;
    }
    setPrompt({ kind: "add", seat: s });
    setMessage("");
  }
  function confirmPrompt() {
    if (!prompt) return;
    const key = prompt.seat.key;
    if (prompt.kind === "add")
      setSelected((current) => toggleTicket(current, key));
    else setSelected((current) => current.filter((k) => k !== key));
    setPrompt(null);
  }
  const filtered = ticketSectors.filter((s) =>
    `${s.label} ${s.category.name}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  return (
    <main className="ticket-experience">
      <nav className="ticket-nav">
        <Link href="/" className="ticket-brand">
          QUISQUEYA <span>3D</span>
        </Link>
        <span className="ticket-demo">Demostración · sin venta real</span>
      </nav>
      <header className="ticket-heading">
        <div>
          <p className="ticket-kicker">Béisbol · Santo Domingo</p>
          <h1>Tu entrada empieza aquí.</h1>
          <p>
            <MapPin size={15} /> Estadio Quisqueya Juan Marichal{" "}
            <span>· Evento de demostración</span>
          </p>
        </div>
        <div className="ticket-heading-note">
          <span>EXPLORA. ELIGE. VIVE EL PLAY.</span>
          <p>Un estadio completo para encontrar tu lugar.</p>
        </div>
      </header>
      <div className="ticket-layout">
        <section
          className="ticket-explore"
          aria-label="Elegir entradas en el estadio"
        >
          <div className="ticket-map-bar">
            <div>
              <span className="ticket-step">{sector ? "02" : "01"}</span>
              <div>
                <h2>
                  {sector
                    ? `${sector.category.name} · ${sector.label}`
                    : "Explora el estadio en 3D"}
                </h2>
                <p>
                  {sector
                    ? `${availableCount(sector, selected)} disponibles de ${sector.seats.length} · ${formatCurrency(sector.category.price)} por entrada (demo)`
                    : "El color te muestra dónde quedan entradas"}
                </p>
              </div>
            </div>
            {sector && (
              <button
                onClick={() => {
                  setSector(null);
                  setReset((n) => n + 1);
                  setHover("");
                }}
              >
                <ArrowLeft size={15} /> Todo el estadio
              </button>
            )}
          </div>
          <div className="ticket-stadium-canvas">
            {!preview && (
              <SceneErrorBoundary>
                <SelectionScene
                  sector={sector}
                  selected={selected}
                  onSector={chooseSector}
                  onSeat={chooseSeat}
                  onHover={setHover}
                  reset={reset}
                  roof={roof}
                  reducedMotion={Boolean(reduced)}
                />
              </SceneErrorBoundary>
            )}
            <div className="ticket-scene-tools">
              <button
                onClick={() => setReset((n) => n + 1)}
                aria-label="Restablecer cámara"
              >
                <RotateCcw size={17} />
              </button>
              <button aria-pressed={roof} onClick={() => setRoof(!roof)}>
                {roof ? "Ocultar cubierta" : "Ver cubierta"}
              </button>
            </div>
            <div className="ticket-scene-caption">
              {hover ||
                (sector
                  ? "Pulsa una butaca de color. Te preguntaremos antes de añadirla al carrito."
                  : "Pulsa un sector · Arrastra para girar · Acerca con dos dedos o la rueda")}
            </div>
          </div>
          <div className="ticket-legend">
            <span>
              <i style={{ background: "#b6c0c6" }} /> Agotado
            </span>
            <span>
              <i style={{ background: "#dce5dc" }} /> Pocas disponibles
            </span>
            <span>
              <i style={{ background: "#7baf72" }} /> Más disponibles
            </span>
            <span>
              <i style={{ background: "#122a46" }} /> Tu selección
            </span>
          </div>
          <div className="ticket-categories">
            {TICKET_CATEGORIES.map((c) => (
              <span key={c.id}>
                <i style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
          <p className="ticket-map-footnote">
            Disponibilidad y precios de demostración. La cubierta se oculta al
            inicio para facilitar la selección. Ubicación 3D aproximada.
          </p>
          <details className="ticket-accessible">
            <summary>
              {sector
                ? `Filas y butacas de ${sector.label}`
                : "Buscar un sector o elegir sin usar el 3D"}
            </summary>
            {sector ? (
              <>
                <p>
                  Las filas avanzan desde el terreno hacia atrás. También puedes
                  elegir aquí.
                </p>
                <div className="ticket-row-list">
                  {[...new Set(sector.seats.map((s) => s.row))].map((row) => (
                    <div className="ticket-row" key={row}>
                      <b>Fila {row}</b>
                      <div>
                        {sector.seats
                          .filter((s) => s.row === row)
                          .map((s) => (
                            <button
                              key={s.key}
                              disabled={!s.available}
                              aria-pressed={selected.includes(s.key)}
                              aria-label={`${sector.label}, fila ${row}, butaca ${s.label}, ${s.available ? "disponible" : "agotada"}`}
                              onClick={() => chooseSeat(s)}
                              style={
                                {
                                  "--seat-color": sector.category.color,
                                } as React.CSSProperties
                              }
                            >
                              {s.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label htmlFor="sector-search">Sector o localidad</label>
                <input
                  id="sector-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Por ejemplo: A6, AAA o Preferencias"
                />
                <div className="ticket-sector-list">
                  {filtered.map((s) => (
                    <button key={s.id} onClick={() => chooseSector(s)}>
                      <i style={{ background: s.category.color }} />
                      <b>{s.label}</b>
                      <span>{availableCount(s, selected)} disponibles</span>
                    </button>
                  ))}
                  {!filtered.length && (
                    <p>No encontramos ese sector. Prueba con A6 o AAA.</p>
                  )}
                </div>
              </>
            )}
          </details>
          <p className="ticket-map-footnote">
            Se muestran las localidades numeradas con posición 3D asignada. VIP,
            balcones y zonas sin numeración todavía no están incluidos.
          </p>
        </section>
        <aside className="ticket-basket" aria-label="Resumen de entradas">
          <div className="basket-heading">
            <Ticket size={22} />
            <h2>Tus entradas</h2>
            <span>{tickets.length}</span>
          </div>
          <p className="basket-event">
            Licey en el Quisqueya
            <small>Evento de demostración · Fecha por confirmar</small>
          </p>
          {!tickets.length ? (
            <div className="ticket-empty">
              <div className="empty-ticket">
                Q<span>3D</span>
              </div>
              <h3>Encuentra tu lugar.</h3>
              <p>
                Entra a un sector y elige una butaca de color. Aquí verás su
                precio y podrás sentarte virtualmente.
              </p>
              <span>Hasta {MAX_TICKETS} entradas por selección</span>
            </div>
          ) : (
            <div className="ticket-items">
              {tickets.map((s) => (
                <article key={s.key} className="ticket-item">
                  <div>
                    <span>{s.category}</span>
                    <button
                      className="ticket-icon ticket-remove"
                      aria-label={`Quitar ${s.sector} fila ${s.row} butaca ${s.label}`}
                      onClick={() => setPrompt({ kind: "remove", seat: s })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <h3>
                    {s.sector}{" "}
                    <span>
                      Fila {s.row} · Butaca {s.label}
                    </span>
                  </h3>
                  <div>
                    <strong>{formatCurrency(s.price)}</strong>
                    <button
                      className="ticket-preview-button"
                      onClick={() => setPreview(s)}
                      aria-label={`Ver desde ${s.sector} fila ${s.row} butaca ${s.label}`}
                    >
                      <Eye size={15} /> Ver mi vista
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div aria-live="polite" role="status" className="ticket-status">
            {message}
          </div>
          <div className="ticket-total">
            <span>
              Total estimado{" "}
              <small>
                {tickets.length} {tickets.length === 1 ? "entrada" : "entradas"}{" "}
                · precios demo
              </small>
            </span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <a
            className="ticket-checkout"
            href={catalog.source.url}
            target="_blank"
            rel="noreferrer"
          >
            Consultar venta oficial ↗
          </a>
          <p className="ticket-disclaimer">
            Esta selección no reserva entradas ni se transfiere a UepaTickets.
            Confirma evento, precios y disponibilidad en la venta oficial.
          </p>
        </aside>
      </div>
      <footer className="ticket-bottom">
        <span>QUISQUEYA 3D</span>
        <span>Elige tu lugar antes de llegar al play.</span>
      </footer>
      {preview && (
        <SeatPreview seat={preview} onClose={() => setPreview(null)} />
      )}
      {prompt && (
        <TicketPrompt
          kind={prompt.kind}
          seat={prompt.seat}
          onConfirm={confirmPrompt}
          onClose={() => setPrompt(null)}
        />
      )}
    </main>
  );
}
