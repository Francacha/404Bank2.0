---
target: prestamos
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Prestamos.tsx"
target_fingerprint: "sha256:697734b529cfb11236025fba52245fea0b5b3fa25609f41c91cc91222db29908"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Prestamos.tsx
timestamp: 2026-10-09T00-43-41Z
slug: frontend-clerk-react-src-pages-prestamos-tsx
---
Method: dual-agent (A: design review · B: detector). Revisión desde código; sin automatización de navegador.

## Puntaje Nielsen: 21/40 (Aceptable)
1 Visibilidad 2 · 2 Mundo real 2 · 3 Control 2 · 4 Consistencia 2 · 5 Prevención 1 · 6 Reconocimiento 2 · 7 Eficiencia 2 · 8 Estética 3 · 9 Recuperación 3 · 10 Ayuda 2

## Especificidad
Datos muy propios (TNA/TEA/CFTEA con IVA, punitorios, situación BCRA, mora en voseo); forma genérica (columna de formulario + tarjetas). Detector: 0.

## Problemas prioritarios
- [P0] El costo no manda y no hay paso de revisión: total y CFTEA chicos, sin punitorios, un clic crea la deuda. /impeccable clarify
- [P1] Elegir plan en un <select> de 6 sin montos; la API ya devuelve los 6. /impeccable layout
- [P1] Accesibilidad: labels sin htmlFor, outline:none en inputs, botón-acordeón sin aria-expanded y con divs adentro, glifo ▾ y emojis leídos, sin live regions, h1→h3. /impeccable audit
- [P1] Bugs: simulación sin abort (respuesta vieja pisa nueva, números viejos visibles), sin monto máximo, situación ≥3 no bloquea antes de enviar, cuota vencida sin punitorios en la fila. /impeccable harden
- [P2] Móvil y tokens: sin regla ≤640 (filas de cuota se rompen), Préstamos detrás de "Más", `* {}` global, colores fuera de tokens, "pendiente" en ámbar de alerta. /impeccable adapt

## Menores
Fecha con hora en cuotas mensuales; TNA sin formato es-AR; éxito que no se limpia; formulario en mora casi invisible (opacidades multiplicadas); rechazos sin motivo; "BCRA" para banco simulado.
