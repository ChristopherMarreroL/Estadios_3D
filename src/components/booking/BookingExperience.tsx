"use client";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { EventHero } from "@/components/event/EventHero";
import { SectionPanel } from "./SectionPanel";
import { SeatSelector } from "./SeatSelector";
import { SeatViewOverlay } from "./SeatViewOverlay";
import { CheckoutPreview } from "./CheckoutPreview";
import { ConfirmationTicket } from "./ConfirmationTicket";
import { SceneErrorBoundary } from "@/components/stadium/SceneErrorBoundary";
import { useTicketStore } from "@/stores/ticketStore";
const StadiumScene = dynamic(
  () =>
    import("@/components/stadium/StadiumScene").then((mod) => mod.StadiumScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#03070f]">
        <div className="text-center">
          <span className="display text-5xl text-[#f6cc7c]">411</span>
          <p className="utility mt-2 text-[8px] text-white/35">
            Encendiendo las luces
          </p>
        </div>
      </div>
    ),
  },
);
export function BookingExperience() {
  const step = useTicketStore((state) => state.step);
  return (
    <main className="noise relative h-[100svh] min-h-[650px] overflow-hidden bg-[#03070f]">
      <Header />
      <div
        className={`absolute inset-0 ${step === "checkout" || step === "confirmation" ? "invisible" : ""}`}
      >
        <SceneErrorBoundary>
          <StadiumScene />
        </SceneErrorBoundary>
      </div>
      {step !== "hero" && step !== "confirmation" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute top-20 left-5 z-10 hidden md:block"
        >
          <p className="utility text-[8px] text-white/35">
            Arrastra para rotar · rueda para acercar
          </p>
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        {step === "hero" && <EventHero key="hero" />}
        {step === "stadium" && <SectionPanel key="stadium" />}
        {step === "seats" && <SeatSelector key="seats" />}
        {step === "seatView" && <SeatViewOverlay key="view" />}
        {step === "checkout" && <CheckoutPreview key="checkout" />}
        {step === "confirmation" && <ConfirmationTicket key="confirmation" />}
      </AnimatePresence>
    </main>
  );
}
