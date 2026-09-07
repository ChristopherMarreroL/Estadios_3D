# Dugouts parcialmente hundidos — 7 de septiembre de 2026

Referencia: fotografía aportada por el usuario, con techo bajo y piso interior por debajo del terreno. Dimensiones provisionales, sin levantamiento del estadio.

- Ambos dugouts bajados 1,35 m: techo máximo 1,37 m y piso interior -1,17 m respecto al origen del terreno (superficie próxima a 0,09 m).
- Huecos en el terreno y la base, seis escalones en cada extremo, muro de contención y protección frontal.
- Conservadas las coordenadas de las 11.367 butacas; verificación por hash de sus vértices antes y después.
- Comprobados los rayos desde todas las butacas de A6 hacia home y el cuadro: ninguno intercepta los techos. Esto no certifica visibilidad completa ni ausencia de otros obstáculos.
- Comparación visual desde la misma cámara: artifacts/blender/dugout-20260907/a6-before.png y a6-after.png.
- Modelos Blender y GLB guardados. Respaldos previos con sufijo pre-sunken-dugout-20260907.

Reproducción: scripts/blender/sink_dugouts.py. Las alturas se fijan respecto al máximo actual del techo para evitar descensos acumulados. El script lee las posiciones de A6 en artifacts/blender/dugout-a6-seats.json.
