"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatCurrency";
import { ticketingProvider } from "@/services/ticketing";
import { calculateTotals, useTicketStore } from "@/stores/ticketStore";
export function CheckoutPreview() {
  const {
    event,
    section,
    selectedSeats,
    isProcessing,
    setProcessing,
    setStep,
    setOrderId,
  } = useTicketStore();
  const totals = calculateTotals(selectedSeats);
  const [error, setError] = useState<string | null>(null);
  if (!section) return null;
  const confirm = async () => {
    setError(null);
    setProcessing(true);
    try {
      const hold = await ticketingProvider.holdSeats(
        event.id,
        selectedSeats.map((seat) => seat.id),
      );
      const result = await ticketingProvider.createCheckout(event.id, hold.id);
      if (result.success) {
        setOrderId(result.orderId);
        setStep("confirmation");
      }
    } catch {
      setError("No se pudo completar la demostración. Intenta de nuevo.");
    } finally {
      setProcessing(false);
    }
  };
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-30 overflow-y-auto bg-[#03070f]/95 px-4 py-20 backdrop-blur-lg"
    >
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => setStep("seats")}
          className="flex items-center gap-2 text-xs text-white/55 hover:text-white"
        >
          <ArrowLeft size={14} />
          Cambiar asiento
        </button>
        <div className="mt-6 grid overflow-hidden rounded-sm border border-white/10 bg-[#0d1b2d] md:grid-cols-[1.2fr_.8fr]">
          <div className="p-6 md:p-9">
            <p className="utility text-[9px] text-[#f6cc7c]">
              Resumen simulado
            </p>
            <h1 className="display mt-2 text-5xl">Antes de entrar al play</h1>
            <div className="mt-8 border-y border-dashed border-white/15 py-5">
              <p className="text-lg font-semibold">
                {event.homeTeam} vs. {event.awayTeam}
              </p>
              <p className="mt-2 text-sm text-white/50">
                {event.date} · {event.time}
              </p>
              <p className="text-sm text-white/50">{event.venue}</p>
            </div>
            <p className="utility mt-6 text-[9px] text-white/35">Selección</p>
            <div className="mt-3 space-y-3">
              {selectedSeats.map((seat) => (
                <div key={seat.id} className="flex justify-between">
                  <div>
                    <p className="font-semibold">{section.name}</p>
                    <p className="text-xs text-white/45">
                      Fila {seat.row} · Asiento {seat.number}
                    </p>
                  </div>
                  <span className="text-[#f6cc7c]">
                    {formatCurrency(seat.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative border-t border-white/10 bg-[#071323] p-6 md:border-t-0 md:border-l md:p-9">
            <div className="absolute top-10 -left-3 hidden h-6 w-6 rounded-full bg-[#03070f] md:block" />
            <p className="utility text-[9px] text-white/35">Totales</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-white/55">Subtotal</dt>
                <dd>{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/55">Cargo simulado (8%)</dt>
                <dd>{formatCurrency(totals.fees)}</dd>
              </div>
              <div className="flex justify-between border-t border-white/15 pt-4 text-xl font-semibold">
                <dt>Total</dt>
                <dd className="text-[#f6cc7c]">
                  {formatCurrency(totals.total)}
                </dd>
              </div>
            </dl>
            <div className="mt-8 rounded-sm border border-[#f6cc7c]/20 bg-[#f6cc7c]/5 p-3 text-[11px] leading-5 text-[#d8c69f]">
              <LockKeyhole size={14} className="mb-2" />
              No se solicitarán datos ni se realizará ningún pago. Esta
              confirmación existe solo para demostrar el flujo.
            </div>
            {error && (
              <p role="alert" className="mt-3 text-xs text-[#ff8a93]">
                {error}
              </p>
            )}
            <Button
              onClick={confirm}
              disabled={isProcessing}
              className="mt-5 w-full"
            >
              {isProcessing
                ? "Preparando demostración…"
                : "Confirmar selección simulada"}
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
