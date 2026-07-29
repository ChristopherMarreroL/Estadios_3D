"use client";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PrototypeBadge } from "@/components/layout/PrototypeBadge";
import { featuredEvent } from "@/data/events";
import { useTicketStore } from "@/stores/ticketStore";
export function EventHero() {
  const setStep = useTicketStore((state) => state.setStep);
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -18 }}
      className="absolute inset-0 z-20 flex items-end bg-gradient-to-r from-[#03070f] via-[#03070f]/85 to-transparent px-5 pt-24 pb-10 md:items-center md:px-[7vw] md:pb-0"
    >
      <div className="max-w-2xl">
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <PrototypeBadge />
        </motion.div>
        <motion.h1
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.65 }}
          className="display mt-5 text-[clamp(4.8rem,13vw,10.5rem)] leading-[.72] text-[#f5f2e9]"
        >
          Quisqueya
          <span className="block text-[#f6cc7c] sm:ml-3 sm:inline">3D</span>
        </motion.h1>
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:flex md:gap-7"
        >
          <div>
            <p className="display text-xl leading-none md:text-4xl">
              Tigres del Licey
            </p>
            <p className="utility mt-1 text-[9px] text-[#78adff]">Lado azul</p>
          </div>
          <span className="display text-2xl text-white/35">vs.</span>
          <div>
            <p className="display text-xl leading-none md:text-4xl">
              Leones del Escogido
            </p>
            <p className="utility mt-1 text-[9px] text-[#ff8a93]">Lado rojo</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.58 }}
          className="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#b6c2d1]"
        >
          <span className="flex items-center gap-2">
            <CalendarDays size={15} className="text-[#f6cc7c]" />
            {featuredEvent.date} · {featuredEvent.time}
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={15} className="text-[#f6cc7c]" />
            {featuredEvent.venue}
          </span>
        </motion.div>
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Button onClick={() => setStep("stadium")} className="group">
            Explorar asientos en 3D
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />
          </Button>
        </motion.div>
      </div>
      <div className="absolute right-0 bottom-0 hidden h-full w-[31vw] items-end justify-center overflow-hidden border-l border-white/10 bg-[#0d1b2d]/45 pb-12 lg:flex">
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#f6cc7c]/35 to-transparent" />
        <div className="text-center">
          <span className="display text-[11rem] leading-none text-white/[.045]">
            411
          </span>
          <p className="utility -mt-8 text-[9px] text-white/45">
            Center field · Santo Domingo
          </p>
        </div>
      </div>
    </motion.section>
  );
}
