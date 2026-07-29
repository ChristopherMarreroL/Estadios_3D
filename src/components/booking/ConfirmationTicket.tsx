"use client";
import { motion } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatCurrency";
import { calculateTotals, useTicketStore } from "@/stores/ticketStore";
const qr = Array.from(
  { length: 81 },
  (_, index) =>
    [
      0, 1, 2, 6, 7, 8, 9, 10, 12, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 38,
      40, 42, 44, 46, 48, 50, 52, 54, 58, 60, 62, 64, 66, 68, 70, 72, 73, 74,
      78, 79, 80,
    ].includes(index) || index % 7 === 0,
);
export function ConfirmationTicket() {
  const { event, section, selectedSeats, orderId, restart } = useTicketStore();
  const totals = calculateTotals(selectedSeats);
  if (!section) return null;
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-40 flex min-h-screen items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,#153c72_0%,#03070f_55%)] p-4 py-20"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <motion.span
          key={index}
          initial={{ y: -100, opacity: 0, rotate: 0 }}
          animate={{ y: "90vh", opacity: [0, 1, 1, 0], rotate: 240 }}
          transition={{ delay: index * 0.08, duration: 2.4, ease: "easeInOut" }}
          className={`pointer-events-none absolute top-0 h-2 w-1 ${index % 3 === 0 ? "bg-[#f6cc7c]" : index % 3 === 1 ? "bg-[#1468d4]" : "bg-[#d13c48]"}`}
          style={{ left: `${8 + index * 7.5}%` }}
        />
      ))}
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ y: 25, scale: 0.97 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 18 }}
          className="relative overflow-hidden rounded-sm bg-[#f5f2e9] text-[#071323] shadow-[0_35px_100px_rgba(0,0,0,.55)]"
        >
          <div className="bg-[#0d1b2d] p-6 text-white">
            <div className="flex items-center justify-between">
              <span className="display text-2xl">Quisqueya 3D</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#267054]">
                <Check size={17} />
              </span>
            </div>
            <p className="utility mt-7 text-[8px] text-[#f6cc7c]">
              Selección confirmada · demostración
            </p>
            <h1 className="display mt-1 text-5xl">Nos vemos en el play.</h1>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-[1fr_110px]">
            <div>
              <p className="text-lg font-bold">
                {event.homeTeam}
                <br />
                vs. {event.awayTeam}
              </p>
              <p className="mt-3 text-xs text-[#5b6672]">
                {event.date} · {event.time}
              </p>
              <div className="my-5 border-t border-dashed border-[#071323]/20" />
              <p className="utility text-[8px] text-[#68717d]">Ubicación</p>
              <p className="mt-1 font-bold">{section.name}</p>
              <p className="mt-1 text-sm">
                {selectedSeats
                  .map((seat) => `Fila ${seat.row} · Asiento ${seat.number}`)
                  .join(" / ")}
              </p>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="utility text-[8px] text-[#68717d]">
                    Total simulado
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {formatCurrency(totals.total)}
                  </p>
                </div>
                <p className="utility text-[7px] text-[#68717d]">{orderId}</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center border-t border-dashed border-[#071323]/20 pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
              <div
                aria-label="Código QR de demostración"
                className="grid h-[90px] w-[90px] grid-cols-9 bg-white p-1"
              >
                {qr.map((filled, index) => (
                  <span
                    key={index}
                    className={filled ? "bg-[#071323]" : "bg-white"}
                  />
                ))}
              </div>
              <p className="utility mt-2 text-center text-[6px] text-[#68717d]">
                QR no válido
              </p>
            </div>
          </div>
        </motion.div>
        <p className="mt-4 text-center text-xs text-white/40">
          Este boleto no tiene validez comercial ni representa una reserva real.
        </p>
        <Button
          variant="secondary"
          onClick={restart}
          className="mx-auto mt-5 flex"
        >
          <RotateCcw size={15} />
          Volver al inicio
        </Button>
      </div>
    </motion.section>
  );
}
