import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quisqueya 3D — Selección visual de asientos",
  description:
    "Prototipo conceptual para explorar el Estadio Quisqueya Juan Marichal.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
