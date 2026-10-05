# Divisiones de palcos corporativos — 5 de octubre de 2026

Se sustituyeron los 13 separadores heredados (12 módulos provisionales) por 18 muretes que delimitan los 17 sectores actuales PC 1–PC 17. Se calculan con la misma longitud física de arco y anchos de fila que `simulateSector`; terminan dentro de la plataforma. Material verde, altura y espesor provisionales.

Referencia visual: [foto publicada en marzo de 2024](https://listindiario.com/files/vertical_main_image/uploads/2024/03/07/65ea692b484af.jpeg). Se observan muretes verdes entre palcos frontales junto al dugout. Esta foto no certifica medidas ni el estado actual de todos los sectores.

Blender y GLB actualizados localmente; URL versionada para invalidar caché. Respaldos con sufijo `pre-corporate-dividers-20261005`. Script reproducible: `scripts/blender/fix_corporate_dividers.py`.

Verificación: cero intersecciones de superficies entre muretes y butacas corporativas mediante BVH; 18 muretes para 17 sectores. Resto de atributos de mallas e índices conservados en GLB, incluidos los UV originales que el exportador reescribía. TypeScript, simulación de 11.367 cámaras y ocupación pasaron. Render revisado en `artifacts/blender/corporate-dividers-20261005/closeup.png`. No se publicó ningún cambio.
