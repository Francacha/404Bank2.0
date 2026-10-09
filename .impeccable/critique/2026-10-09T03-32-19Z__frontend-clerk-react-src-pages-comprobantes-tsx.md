---
target: comprobantes
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Comprobantes.tsx"
target_fingerprint: "sha256:1d6039ab92a6789b235a946cf748a882aa2d185fe3827c16f8935673e0ff6ca7"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Comprobantes.tsx
timestamp: 2026-10-09T03-32-19Z
slug: frontend-clerk-react-src-pages-comprobantes-tsx
---
Method: dual-agent (A: design review · B: detector + evidence)

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 2 | Error de descarga arriba de todo, fuera de vista |
| 2 | Mundo real | 2 | Monto escondido tras la fecha con segundos; sin signo ni estado |
| 3 | Control | 2 | Sin reintentar |
| 4 | Consistencia | 1 | Distinto de Historial: filas, botones, copy, tinte rojo frío, radio 18 |
| 5 | Prevención | 3 | Lectura, bajo riesgo |
| 6 | Reconocimiento | 1 | Desde Home/Transferir cae en una lista genérica y hay que buscar |
| 7 | Flexibilidad | 1 | Sin búsqueda ni deep link; tope 50 sin aviso |
| 8 | Estética | 2 | 50 botones vino idénticos como lo más fuerte |
| 9 | Errores | 1 | Texto crudo del backend, sin reintentar |
| 10 | Ayuda | 2 | No explica comprobantes de ingresos |
| **Total** | | **17/40** | **Pobre** |

Specificity: genérica; duplica una función de Historial con peor calidad. Detector: 0 hallazgos. Sin overlay (requiere sesión). Backend: verifica titularidad (403), 404 antes de 403 permite sondear IDs.

Priority issues:
- [P0] Duplica Historial y rompe el contexto desde Home/Transferir → deep link /historial?op=, Transferir descarga directo, quitar /comprobantes → distill + clarify
- [P1] El monto no protagoniza la fila → anatomía de Historial → polish
- [P1] PDF fuera de marca: verde/rojo viejos, labels 9pt #8a8078, sin logo, hora en zona del servidor, media hoja vacía, sin nota de banco simulado → polish
- [P2] Estados de error/carga: sin role, sin reintentar, error global → harden
- [P3] CSS: `* {}` global, sin focus-visible propio, radio 18, tinte rojo → audit

Personas: Jordan (dos destinos con el mismo trabajo), Sam (N botones "Descargar" sin contexto, errores no anunciados), Casey (filas de ~120px, CBU de 22 dígitos cortado), Profesor (duplicación y PDF pelado; el 403 es buen punto para demostrar).

Preguntas: ¿qué trabajo hace /comprobantes que no haga Historial? ¿El comprobante debería ser una vista en la app y el PDF solo exportación? ¿El PDF debería llevar la marca y la nota de banco simulado?
