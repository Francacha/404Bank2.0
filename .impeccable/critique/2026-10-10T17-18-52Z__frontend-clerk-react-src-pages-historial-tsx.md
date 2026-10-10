---
target: historial
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Historial.tsx"
target_fingerprint: "sha256:7c1df392f0fe7593784f030e6dbeb15fc35c06d2b9d4513bf876a428f041eaae"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Historial.tsx
timestamp: 2026-10-10T17-18-52Z
slug: frontend-clerk-react-src-pages-historial-tsx
---
Method: dual-agent (A: revisión de diseño · B: detector + evidencia)

## Design Health Score
| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado del sistema | 3 | Tope de 50 avisado solo al pie |
| 2 | Mundo real | 3 | Compra de dólares en dos filas sin cotización; "Dólares" con dos sentidos |
| 3 | Control | 3 | Filtros no viven en la URL |
| 4 | Consistencia | 3 | Chevron desaparece en celular; CBU sin píldora mono |
| 5 | Prevención | 3 | Filtro de período sobre un set cortado en 50 |
| 6 | Reconocimiento | 2 | Títulos truncados no se recuperan; el detalle no muestra el concepto |
| 7 | Flexibilidad | 1 | Sin búsqueda, cargar más, rango ni totales |
| 8 | Estética | 3 | Meta repite la categoría; usuario/Cerrar sesión flotan sobre los filtros |
| 9 | Errores | 3 | Error del PDF sin reintento explícito |
| 10 | Ayuda | 2 | No explica por qué préstamos/frascos/dólares no tienen comprobante |
| **Total** | | **26/40** | **Aceptable (borde alto)** |

## Veredicto de especificidad
Específico por el sistema (libro mayor por día, cifras tabulares es-AR, egresos en tinta, voseo, íconos por categoría); genérico en la composición (pills + tarjetas + filas expandibles). Falta lo que lo haría resumen bancario: totales del período y la compra de dólares como una sola operación. Detector: 0 hallazgos (tsx + css). Overlay en navegador no disponible (sin automatización interactiva).

## Problemas prioritarios
1. [P1] Historial cortado en 50 sin salida; filtros de período/categoría corren sobre esos 50 (movimientosService.js:7, Historial.tsx:163-172). Fix: "Cargar más" con cursor por fecha; aviso junto a los filtros. → harden
2. [P1] Compra de dólares = dos filas huérfanas, meta redundante, sin cotización ni comprobante. Fix: agrupar en "Compraste US$ 200" con débito en pesos y cotización. → clarify
3. [P2] Truncado irrecuperable; el detalle no muestra concepto ni título completo (Historial.module.css:157-167, Historial.tsx:355-374). → clarify
4. [P2] Celular: ~430px de cromo y 3 filas de filtros antes del primer movimiento; categorías cortadas en "Pr" sin pista; sin chevron (css:345). Además usuario + "Cerrar sesión" del shell quedan sueltos arriba de los filtros en ancho lectura (AppLayout.module.css:305-311, afecta todas las páginas de lectura). → adapt
5. [P2] "Dólares" como categoría y como moneda (Historial.tsx:32, 263). → clarify

## Personas
- Alex: sin búsqueda, rango, exportación, URL con filtros; tope 50 sin salida.
- Sam: detalle sin role=region; región viva anuncia al montar; CBU de 22 dígitos leído de corrido; error de PDF no dice qué movimiento.
- Casey: mucho cromo antes del contenido, sin chevron, títulos con "…", pista de categorías cortada sin aviso.

## Menores
- `.mono` es Space Grotesk; DESIGN.md pide mono en píldora para CBU.
- CBU sin agrupar ni copiar (Historial.tsx:363, 368).
- Préstamo: "Acreditado en" sin aclarar cuenta; dólares sin aclarar CBU USD/ARS.
- Meta "Dólares · 12:16" repite el título (Historial.tsx:78).
- Nota del tope al pie (Historial.tsx:403).
- rgba 7% del esqueleto fuera de paleta (css:305).
- Sin totales por día/período.

## Preguntas
1. ¿Feed o resumen de cuenta? ¿Dónde está "cuánto me queda" y cuánto entró/salió?
2. Si comprar dólares es una decisión, ¿por qué son dos asientos?
3. ¿Búsqueda o Ban respondiendo "cuánto gasté en frascos este mes"?
