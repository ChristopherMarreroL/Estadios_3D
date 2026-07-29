"use client";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, ShoppingBag, X } from "lucide-react";
import { getSeatsForSection } from "@/data/seats";
import { MAX_SELECTED_SEATS } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatCurrency";
import { calculateTotals, useTicketStore } from "@/stores/ticketStore";
import type { StadiumSeat } from "@/types";
import { Button } from "@/components/ui/Button";
const labels: Record<StadiumSeat["status"], string> = {
  available: "Disponible",
  selected: "Seleccionado",
  occupied: "Ocupado",
  reserved: "Reservado",
  accessible: "Accesible",
};
export function SeatSelector() {
  const { section, selectedSeats, toggleSeat, removeSeat, setStep } =
    useTicketStore();
  const totals = calculateTotals(selectedSeats);
  if (!section) return null;
  const sectionSeats = getSeatsForSection(section.id, section.price);
  const selectedIds = new Set(selectedSeats.map((seat) => seat.id));
  return (
    <motion.aside
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass absolute inset-x-3 bottom-3 z-20 max-h-[55vh] overflow-y-auto rounded-sm p-4 md:inset-y-20 md:right-6 md:left-auto md:max-h-none md:w-[390px] md:p-5"
    >
      <button
        onClick={() => setStep("stadium")}
        className="mb-4 flex items-center gap-2 text-xs text-white/55 hover:text-white"
      >
        <ArrowLeft size={14} />
        Volver a la sección
      </button>
      <p className="utility text-[9px] text-[#f6cc7c]">{section.name}</p>
      <h2 className="display mt-1 text-3xl">
        Elige hasta {MAX_SELECTED_SEATS}
      </h2>
      <p className="mt-2 text-xs text-white/50">
        La fila A es la más cercana al terreno.
      </p>
      <div className="mt-5 rounded-sm border border-white/10 bg-[#03070f]/55 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="utility text-[8px] text-white/35">
            Terreno / home
          </span>
          <span className="h-px w-24 bg-gradient-to-r from-[#f6cc7c] to-transparent" />
        </div>
        <div className="space-y-2">
          {["A", "B", "C", "D"].map((row) => (
            <div
              key={row}
              className="grid grid-cols-[16px_repeat(10,1fr)] items-center gap-1"
            >
              <span className="utility text-[8px] text-white/35">{row}</span>
              {sectionSeats
                .filter((seat) => seat.row === row)
                .map((seat) => {
                  const selected = selectedIds.has(seat.id);
                  const blocked =
                    seat.status === "occupied" || seat.status === "reserved";
                  return (
                    <button
                      key={seat.id}
                      disabled={blocked}
                      title={`${labels[selected ? "selected" : seat.status]} · Fila ${seat.row}, asiento ${seat.number}`}
                      aria-label={`Fila ${seat.row}, asiento ${seat.number}, ${labels[selected ? "selected" : seat.status]}`}
                      onClick={() => toggleSeat(seat)}
                      className={`aspect-square min-h-5 rounded-t-md border text-[8px] transition ${selected ? "-translate-y-1 border-[#f6cc7c] bg-[#f6cc7c] text-[#071323] shadow-[0_0_12px_rgba(246,204,124,.35)]" : seat.status === "available" ? "border-[#5a7189] bg-[#26384e] text-white hover:-translate-y-0.5 hover:border-white" : seat.status === "accessible" ? "border-[#55a98a] bg-[#1e5747] text-white" : "border-[#303a45] bg-[#151d26] text-white/20"}`}
                    >
                      {seat.number}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[8px] text-white/45">
        <span>□ Disponible</span>
        <span className="text-[#f6cc7c]">■ Seleccionado</span>
        <span className="text-[#56616d]">■ No disponible</span>
        <span className="text-[#71d3a8]">□ Accesible</span>
      </div>
      <div className="mt-5 border-t border-white/10 pt-4">
        {selectedSeats.length === 0 ? (
          <p className="py-3 text-center text-xs text-white/45">
            Selecciona un asiento para continuar.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedSeats.map((seat) => (
              <div
                key={seat.id}
                className="flex items-center justify-between text-xs"
              >
                <span>
                  Fila {seat.row} · Asiento {seat.number}
                </span>
                <span className="flex items-center gap-2 text-[#f6cc7c]">
                  {formatCurrency(seat.price)}
                  <button
                    onClick={() => removeSeat(seat.id)}
                    aria-label={`Quitar asiento ${seat.number}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-dashed border-white/15 pt-3 font-semibold">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={!selectedSeats.length}
            onClick={() => setStep("seatView")}
          >
            <Eye size={14} />
            Ver vista
          </Button>
          <Button
            disabled={!selectedSeats.length}
            onClick={() => setStep("checkout")}
          >
            <ShoppingBag size={14} />
            Resumen
          </Button>
        </div>
      </div>
    </motion.aside>
  );
}
