# Accesos abiertos y orientación desde las butacas

Se corrigieron los seis bloques provisionales de acceso que estaban sobre las escaleras y tapaban parte de la vista desde C13 y el lado opuesto. Ahora son pasos abiertos con bordes bajos de concreto de 28 cm, ajustados a los peldaños existentes. Los pasamanos y sus anclajes se conservan. La señalización ACCESO se trasladó al suelo del descanso posterior, detrás de las filas.

Esta es una corrección conceptual de la maqueta, no una reconstrucción verificada de los accesos reales del Quisqueya. No se simularon túneles ni se certifica accesibilidad o seguridad arquitectónica. Cubiertas, barandas, butacas, público y otros obstáculos siguen visibles.

## Otras mejoras

- Botón **Mirar al terreno** para recuperar la orientación desde la misma butaca después de mirar alrededor.
- El arrastre enfoca el visor para usar las flechas del teclado. Se ignoran botones secundarios y punteros adicionales; al soltar, cancelar o perder la captura se termina el arrastre. La limpieza del controlador también libera la captura y cancela transiciones pendientes.
- La cabecera permite que los controles salten de línea en pantallas estrechas.

## Resultado y evidencia

Se comprobaron 116 puntos del terreno desde cada una de las 11.367 butacas: 1.318.572 rayos. Las mallas de los accesos y sus letreros interceptaban 15.393 rayos; tras la corrección interceptan 0 de los puntos muestreados. No se detectaron nuevas intersecciones. Este análisis se limita a esas mallas: no mide la visibilidad completa, las personas ni todos los puntos posibles del terreno.

Comparativas con cámaras idénticas, altura de ojos de 1,15 m y campo vertical de 60°, en `artifacts/blender/access-views-20260923/`:

| Imágenes antes/después | Butaca | Cambio visible |
| --- | --- | --- |
| `c13-front` | C13 / A / 12 | Se elimina la pared lateral que ocupaba el encuadre |
| `c13-back` | C13 / H / 15 | Desaparece el bloque delante del terreno; 8 rayos bloqueados → 0 |
| `opposite-back` | C6 / H / 1 | Mismo resultado en el lado contrario; 8 rayos bloqueados → 0 |

Desde C13/A/12 no había intersecciones con los 116 puntos del terreno muestreados, aunque la pared sí ocupaba parte del encuadre lateral. Por eso se complementan las pruebas geométricas con imágenes.

Se conservaron vértices, caras y transformaciones de todas las otras mallas, incluidas las 11.367 butacas y A6, comprobados mediante SHA-256. Distancia mínima de los ojos a la geometría final de los accesos: 0,764 m. GLB final: 24.019.888 → 24.106.196 bytes (+0,36 %).

## Verificación

- `bun scripts/verify-access-views.ts`: seis accesos exportados sin las paredes altas, letreros a nivel del descanso, pasamanos y escalones conservados, informe de rayos correcto.
- Pruebas `verify-seat-simulation.ts`, `verify-a6-detail.ts`, `verify-phase3.ts` y `verify-seat-occupancy.ts`: correctas.
- TypeScript y lint: correctos.
- Reconstrucción repetida sin renders: correcta, sin duplicar geometría y conservando las métricas originales.
- Revisión de las tres imágenes finales. Navegador en C13/H/15 con público al 65 %: vista corregida, arrastre y flecha izquierda, recuperación de la orientación con el nuevo botón.

## Reproducción y respaldo

Ejecutar Blender sobre el archivo principal con `--python scripts/blender/refine_access_views.py`. El script modifica solo los seis accesos y sus letreros. Conserva nombres para compatibilidad y los respaldos `-pre-access-20260923` de Blender y GLB. En una repetición idéntica conserva las métricas originales del informe; `CIRCULATION_SKIP_RENDER=1` omite los renders. Las imágenes anteriores no se sobrescriben.

Informe automático: `artifacts/blender/access-views-20260923/checks.json`. URL del modelo versionada como `20260923-open-access` para renovar la caché del visor.

No se hicieron push, merge ni publicaciones.
