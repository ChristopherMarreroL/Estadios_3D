"use client";
import { RotateCcw } from "lucide-react";
import { PrototypeBadge } from "./PrototypeBadge";
import { useTicketStore } from "@/stores/ticketStore";
export function Header() {
  const { step, setStep, resetCamera } = useTicketStore();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4 md:px-8">
      <button
        className="pointer-events-auto flex items-center gap-3 text-left"
        onClick={() => setStep("hero")}
        aria-label="Volver a la portada"
      >
        <span className="display text-xl tracking-wide">Q3D</span>
        <span className="hidden h-5 w-px bg-white/20 sm:block" />
        <span className="hidden sm:block">
          <PrototypeBadge />
        </span>
      </button>
      {step !== "hero" && step !== "confirmation" && (
        <button
          onClick={resetCamera}
          className="pointer-events-auto flex items-center gap-2 rounded-sm border border-white/15 bg-[#071323]/70 px-3 py-2 text-xs text-white backdrop-blur-md transition hover:bg-[#10243d]"
        >
          <RotateCcw size={14} />
          <span className="hidden sm:inline">Vista general</span>
        </button>
      )}
    </header>
  );
}
