---
target: historial
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Historial.tsx"
target_fingerprint: "sha256:3fb4b7da28d35f61b47a55a8d39463197144e9f68f943c775298664695203143"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Historial.tsx
timestamp: 2026-10-09T03-19-28Z
slug: frontend-clerk-react-src-pages-historial-tsx
---
Method: dual-agent (A: design review · B: detector + evidence)

## Design Health Score
| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado del sistema | 2 | Carga en texto plano sin aria-live; tope de 50 silencioso |
| 2 | Mundo real | 2 | Fechas con segundos, estado crudo "aprobada", sin grupos por día |
| 3 | Control | 2 | Sin reintentar; filas sin acción |
| 4 | Consistencia | 1 | Flecha ↑ para entrantes; tarjetas sueltas vs. libro mayor de Home; CBU completo vs ···1234 |
| 5 | Prevención | 3 | "Últimos 30 días" filtra sobre 50 filas |
| 6 | Reconocimiento | 2 | Sin tipo de movimiento; CBU truncado pierde los últimos dígitos |
| 7 | Flexibilidad | 1 | Sin búsqueda, cargar más, ni comprobante por fila |
| 8 | Estética | 2 | Pastillas "aprobada" y "ARS" redundantes en cada fila |
| 9 | Errores | 1 | err.message crudo/inglés, sin reintentar |
| 10 | Ayuda | 4 | No hace falta |
| **Total** | | **20/40** | **Aceptable** |

## Design Specificity Verdict
Genérica: pila de tarjetas flotantes de fintech; no aplica el "Libro mayor en lista" de DESIGN.md que Home ya usa. Colores fuera de paleta (#0a6b6b, #4a4038, rgba(153,27,27)). Detector: 0 hallazgos en Historial.tsx y AppLayout.tsx. Sin overlay (ruta con sesión de Clerk).

## Priority Issues
- [P0] Historial incompleto: solo transferencias (LIMIT 50); préstamos, cuotas, frascos y dólares no aparecen. movimientosService.js ya arma el feed unificado y no se usa. Subtítulo "Todas tus transferencias". → clarify + harden
- [P1] Filas fuera del sistema: tarjetas sueltas, fechas con segundos, sin grupos por día, flecha ↑ en entrantes, CBU completo truncado en móvil. → distill + polish
- [P1] Error y carga sin terminar: mensajes crudos, sin reintentar, sin aria-live, tinte fuera de token. → harden
- [P2] Filas sin salida y duplicación con Comprobantes. → shape
- [P2] Accesibilidad: divs en lugar de ul/li, filtros sin aria-pressed/grupo, signo − sin texto para lector, badge 10.5px, verde #1e8e5a 4.14:1. → audit + harden

## Persona Red Flags
- Alex: sin búsqueda, totales del período ni cargar más.
- Sam: lista sin semántica, filtros sin estado, carga/errores no anunciados.
- Casey: CBU/nombres cortados, 50 tarjetas de ~88px sin anclas por día, media query muerta.
- Profesor evaluador: abre un frasco o préstamo y no lo ve en Historial.

## Minor Observations
pageWrapper centrado desalineado del h1; `* {box-sizing}` global en el módulo; fecha sin AT TIME ZONE UTC (posible corrimiento de 3 h); "..." vs "…"; "Todas"/"Todo".

## Questions to Consider
- ¿Historial y Comprobantes deberían ser una sola pantalla?
- ¿Libro mayor literal con totales por día?
- ¿Filtros en el servidor con "Cargar más" como borde explícito?
