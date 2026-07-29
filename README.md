# Quisqueya 3D

Prototipo visual e independiente para explorar el Estadio Quisqueya Juan Marichal, comprender sus zonas y simular la selección de asientos antes de una futura conexión autorizada con un proveedor de boletería.

> Este proyecto es un prototipo conceptual e independiente. No representa una integración oficial ni una afiliación con LIDOM, los equipos participantes o UEPA Tickets.

## Problema y propuesta

Los mapas planos no siempre comunican distancia, orientación o calidad de vista. Quisqueya 3D convierte nombres de secciones y números de asiento en una experiencia espacial: el visitante explora un estadio simplificado, elige una zona, prueba una vista aproximada y recorre un checkout completamente simulado.

## Estado actual

La primera entrega incluye portada, estadio 3D construido con geometrías básicas, siete secciones interactivas, dugouts azul y rojo, marcador central, marca 411 FT, publicidad ficticia, iluminación nocturna, mapa de asientos, vista aproximada, resumen y confirmación. Todos los datos son locales. No hay pagos, reservas, autenticación ni API privada.

## Tecnologías

Next.js App Router, React, TypeScript, Tailwind CSS, Three.js, React Three Fiber, Drei, GSAP, Framer Motion, Zustand, ESLint y Prettier.

## Requisitos

- Node.js 20.9 o superior
- npm 10 o superior
- Navegador con WebGL

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Comandos

```bash
npm run dev       # desarrollo
npm run build     # build de producción y validación TypeScript
npm run start     # servir el build
npm run lint      # ESLint
npm run format    # Prettier
npm run format:check
```

## Estructura

- `src/app`: entrada App Router y estilos globales.
- `src/components/stadium`: escena, geometrías y cámara.
- `src/components/booking`: flujo de sección, asiento y confirmación.
- `src/data`: evento, secciones y asientos simulados.
- `src/services/ticketing`: contrato y adaptadores.
- `src/stores`: estado global de la experiencia.
- `docs`: visión, investigación, análisis y decisiones.
- `public/models`: destino del modelo GLB futuro.

## Sustituir el estadio provisional

1. Exportar desde Blender un GLB optimizado a `public/models/estadio-quisqueya.glb`.
2. Conservar los nombres de objetos descritos en `docs/StadiumAnalysis.md`.
3. Revisar escala, origen, materiales y compresión.
4. Cambiar `MODEL_ENABLED` a `true` en `src/components/stadium/StadiumModel.tsx`.
5. Validar hover y selección sin alterar permanentemente los materiales originales.

El componente del modelo real no se monta mientras la bandera está desactivada; por eso la ausencia del GLB no rompe la aplicación.

## Capturas

Pendientes de añadir después de validar la dirección visual con las partes interesadas.

## Roadmap

Ver [docs/Roadmap.md](docs/Roadmap.md). La próxima fase se concentra en investigación visual y precisión geométrica antes de producir el modelo Blender.

## Uso de identidad

Los nombres de equipos contextualizan la demostración. No se incluyen logos oficiales. Las etiquetas “Licey” y “Escogido”, así como todas las marcas publicitarias, son placeholders reemplazables. Ningún QR generado tiene validez.
