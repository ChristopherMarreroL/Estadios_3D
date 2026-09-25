# Torres de luz fuera de las gradas — 24 de septiembre de 2026

Las torres de primera y tercera estaban plantadas sobre la terraza de Palco A / AA, alrededor de `(±79, −15)`. Desde A11 / K–L esos mástiles ocupaban el encuadre. En el Quisqueya real no están entre las butacas.

## Referencia

Para la Serie del Caribe 2022, Musco Lighting y el Ministerio de Deportes dejaron **ocho torres**: cuatro nuevas a unos 6 m detrás de la cerca de los jardines y cuatro antiguas **detrás y a los laterales del Grand Stand**. Las antiguas de jardines quedaron a unos 30 m de la cerca. Fuentes: [El Nacional](https://elnacional.com.do/deportes/estadio-quisqueya-estrenara-luces-led_457415.html), [CDN](https://cdndeportes.com.do/supervisan-instalacion-de-nuevas-luces-en-el-estadio-quisqueya/).

Esta pasada solo mueve las dos torres que invadían las gradas. Las cuatro de jardines no se tocan. Las cotas siguen siendo de maqueta: 24 proyectores por torre, no el recuento LED certificado (134 en el sistema real).

## Cambio

| Torre | En las gradas | Primera corrección (lejos) | Ahora (junto al bowl) |
|---|---|---|---|
| Tercera | (−79, −15, 35) | (−102, −58, 38) | (−92, −48, 38) |
| Primera | (79, −15, 35) | (102, −58, 38) | (92, −48, 38) |

Quedan unos 8 m detrás de la última fila de las alas, fuera de la cubierta, con los paneles mirando al infield `(0, −24, 1)`. No se movieron butacas.

## Validación

`scripts/blender/refine_light_towers.py` sobre el `.blend` principal. Comparativas en `artifacts/blender/light-towers-near-20260924/`: `a11-k` y `wing`. Informe en `checks.json`. `bun scripts/verify-light-towers.ts` comprueba despeje > 8 m (y < 20 m, para no volver a alejarlas), huella de asientos intacta y los 144 proyectores exportados.

URL del modelo: `20260924-seat-walkways` (incluye torres y pasillos C/D).
