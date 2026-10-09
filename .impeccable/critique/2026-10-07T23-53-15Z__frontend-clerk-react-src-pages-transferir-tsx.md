---
target: transferir
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Transferir.tsx"
target_fingerprint: "sha256:7f5eaf79ca67493d3513b9b96e1dd46f77be174c42724e44d7b95ea84523558c"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Transferir.tsx
timestamp: 2026-10-07T23-53-15Z
slug: frontend-clerk-react-src-pages-transferir-tsx
---
Method: dual-agent (A: design review · B: detector). Revisión desde código; sin automatización de navegador.

## Puntaje Nielsen: 25/40 (Aceptable, antes 21)
1 Visibilidad 3 · 2 Mundo real 3 · 3 Control 3 · 4 Consistencia 2 · 5 Prevención 2 · 6 Reconocimiento 3 · 7 Eficiencia 2 · 8 Estética 3 · 9 Recuperación 2 · 10 Ayuda 2

## Especificidad
Contenido y marca específicos (voseo, parseo es-AR, bloqueo de moneda, Ban en el recibo); estructura de página genérica. Detector: 8 overused-font (Space Grotesk), falsos positivos por DESIGN.md.

## Problemas prioritarios
- [P1] Error mapping: "Saldo insuficiente en Banco Central" (backend :110) se muestra como caída del sistema; 500/502 prometen "tu dinero no se movió"; res.json() sin try (Transferir.tsx mensajeAmigable). /impeccable clarify
- [P1] Carrera en la búsqueda (respuesta vieja pisa input nuevo; Enter ignora buscando) y contactos sin lookup (sin moneda/validación); moneda no se resetea; sin guard de doble envío. /impeccable harden
- [P1] Rail ≤980px roto y 2 ítems de nav muertos (Transferir.module.css .navItem span:last-child). /impeccable adapt
- [P2] Lector de pantalla: destinatario encontrado no se anuncia; foco perdido tras "Nueva transferencia"; stepper sin semántica; radios sin flechas. /impeccable audit
- [P2] Móvil/primer uso: contactos abajo en ≤860px; CBU con espacios tratado como alias; monto 0 sin mensaje; checkbox 16px; contactos muestran vacío mientras cargan. /impeccable layout

## Menores
--muted 3.9:1 en opciones inactivas/subtítulo; "Ya le llegó" en transferencias externas; check verde con estado no aprobado; "Ver comprobante" lleva a la lista; fecha del cliente; Transferir.module.css también lo importan Frascos e Inversiones.
