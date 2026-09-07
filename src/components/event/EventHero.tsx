"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function EventHero() {
  return (
    <section className="pointer-events-none absolute inset-0 z-20 flex items-end bg-gradient-to-t from-[#03070f] via-transparent to-transparent px-5 pb-8 md:px-10 md:pb-10">
      <div className="flex w-full flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="utility text-[10px] text-[#f6cc7c]">
            Santo Domingo · Juan Marichal
          </p>
          <h1 className="display mt-3 text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.85]">
            Tu lugar en
            <br />
            <span className="text-[#f6cc7c]">el Quisqueya.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
            Recorre el estadio. Elige una fila y una butaca para ver cómo cambia
            tu perspectiva del play.
          </p>
        </div>
        <div className="pointer-events-auto">
          <Link
            href="/localidades"
            className="flex items-center justify-between gap-8 rounded bg-[#f6cc7c] px-6 py-4 font-semibold text-[#071323] transition hover:bg-[#ffe2ab]"
          >
            Elegir mi butaca <ArrowRight size={19} />
          </Link>
          <p className="mt-3 text-xs text-white/50">
            Simulación aproximada · Catálogo oficial de localidades
          </p>
        </div>
      </div>
      <p className="utility absolute top-24 left-5 text-[9px] text-white/50 md:left-10">
        Arrastra para recorrer el estadio
      </p>
    </section>
  );
}
