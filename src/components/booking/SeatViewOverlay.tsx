"use client";
import { motion } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatCurrency";
import { useTicketStore } from "@/stores/ticketStore";
export function SeatViewOverlay() {
  const { section, selectedSeats, setStep } = useTicketStore();
  const seat = selectedSeats[0];
  if (!section || !seat) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#03070f]/80 via-transparent to-[#03070f]/50"
    >
      <div className="pointer-events-auto absolute right-5 bottom-5 left-5 flex flex-col gap-3 md:right-auto md:bottom-8 md:left-8 md:w-[390px]">
        <div className="glass rounded-sm p-4">
          <p className="utility text-[9px] text-[#f6cc7c]">Vista aproximada</p>
          <h2 className="display mt-1 text-3xl">{section.name}</h2>
          <div className="mt-3 flex gap-5 text-sm">
            <span>
              Fila <b>{seat.row}</b>
            </span>
            <span>
              Asiento <b>{seat.number}</b>
            </span>
            <span className="text-[#f6cc7c]">{formatCurrency(seat.price)}</span>
          </div>
          <p className="mt-4 flex gap-2 text-[11px] leading-5 text-white/50">
            <Info size={14} className="mt-0.5 shrink-0" />
            La posición y visibilidad son aproximadas y tienen fines
            demostrativos.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setStep("seats")}
          className="w-fit"
        >
          <ArrowLeft size={15} />
          Regresar a los asientos
        </Button>
      </div>
    </motion.div>
  );
}
