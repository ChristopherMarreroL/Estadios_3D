"use client";
import { motion } from "framer-motion";
import { ArrowRight, Eye, MapPin, Ticket } from "lucide-react";
import { sections } from "@/data/sections";
import { formatCurrency } from "@/lib/formatCurrency";
import { useTicketStore } from "@/stores/ticketStore";
import { Button } from "@/components/ui/Button";
export function SectionPanel() {
  const { section, selectSection, setHoveredSection, setStep } =
    useTicketStore();
  return (
    <motion.aside
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="glass absolute inset-x-3 bottom-3 z-20 max-h-[43vh] overflow-y-auto rounded-sm p-4 md:inset-y-20 md:right-6 md:left-auto md:max-h-none md:w-[350px] md:p-5"
    >
      <div className="mb-4 flex items-start justify-between border-b border-white/10 pb-4">
        <div>
          <p className="utility text-[9px] text-[#f6cc7c]">Mapa del estadio</p>
          <h2 className="display mt-1 text-2xl">Elige tu ángulo</h2>
        </div>
        <span className="utility rounded-sm bg-[#267054]/25 px-2 py-1 text-[8px] text-[#71d3a8]">
          480 disponibles
        </span>
      </div>
      {section ? (
        <div>
          <div
            className={`mb-4 h-1 w-12 ${section.teamIdentity === "licey" ? "bg-[#1468d4]" : section.teamIdentity === "escogido" ? "bg-[#d13c48]" : "bg-[#f6cc7c]"}`}
          />
          <p className="utility text-[9px] text-white/45">
            {section.category} · lado {section.side}
          </p>
          <h3 className="display mt-2 text-4xl leading-none">{section.name}</h3>
          <p className="mt-4 text-sm leading-6 text-white/65">
            {section.description}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4">
            <div>
              <dt className="utility text-[8px] text-white/40">Desde</dt>
              <dd className="mt-1 text-lg font-semibold text-[#f6cc7c]">
                {formatCurrency(section.price)}
              </dd>
            </div>
            <div>
              <dt className="utility text-[8px] text-white/40">Disponibles</dt>
              <dd className="mt-1 text-lg font-semibold">
                {section.availableSeats}
              </dd>
            </div>
          </dl>
          <ul className="mt-4 space-y-2 text-xs text-white/65">
            <li className="flex gap-2">
              <Eye size={14} className="text-[#f6cc7c]" />
              Vista aproximada antes de elegir
            </li>
            <li className="flex gap-2">
              <MapPin size={14} className="text-[#f6cc7c]" />
              Orientación clara dentro del play
            </li>
          </ul>
          <Button onClick={() => setStep("seats")} className="mt-5 w-full">
            <Ticket size={15} />
            Ver asientos
          </Button>
          <Button
            variant="ghost"
            onClick={() => useTicketStore.getState().resetCamera()}
            className="mt-1 w-full"
          >
            Elegir otra sección
          </Button>
        </div>
      ) : (
        <div
          className="space-y-2"
          role="list"
          aria-label="Secciones disponibles"
        >
          {sections.map((item) => (
            <button
              key={item.id}
              onMouseEnter={() => setHoveredSection(item.id)}
              onMouseLeave={() => setHoveredSection(null)}
              onFocus={() => setHoveredSection(item.id)}
              onBlur={() => setHoveredSection(null)}
              onClick={() => selectSection(item)}
              className="group flex w-full items-center justify-between rounded-sm border border-white/8 bg-white/[.025] p-3 text-left transition hover:border-white/25 hover:bg-white/[.06]"
            >
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-[11px] text-white/45">
                  {item.availableSeats} asientos · {formatCurrency(item.price)}
                </p>
              </div>
              <ArrowRight
                size={15}
                className="text-white/25 transition group-hover:translate-x-1 group-hover:text-[#f6cc7c]"
              />
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-3 text-[9px] text-white/45">
        <span>● Disponible</span>
        <span className="text-[#f6cc7c]">◆ Selección</span>
        <span className="text-[#6f7e90]">■ Ocupado</span>
      </div>
    </motion.aside>
  );
}
