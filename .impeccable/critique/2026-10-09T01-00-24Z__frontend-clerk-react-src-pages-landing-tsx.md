---
target: landing
total_score: 15
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Landing.tsx"
target_fingerprint: "sha256:fef2c9d688497de34a694f238772c25e7e76146fa9ec61a7628e292b74cd664b"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Landing.tsx
timestamp: 2026-10-09T01-00-24Z
slug: frontend-clerk-react-src-pages-landing-tsx
---
Method: dual-agent (A: design review · B: detector). Revisión desde código; sin automatización de navegador.

## Puntaje Nielsen: 15/32 (47%, Poor) — 7 y 10 n/a (landing)
1 Visibilidad 2 · 2 Mundo real 3 · 3 Control 2 · 4 Consistencia 1 · 5 Prevención 2 · 6 Reconocimiento 3 · 7 n/a · 8 Estética 1 · 9 Recuperación 1 · 10 n/a

## Especificidad
Plantilla SaaS (hero + 10 tarjetas + stats + beneficios + CTA + footer). Lo único propio: cotizaciones del dólar en vivo. 404 como marca de agua al 4%; Ban sin rol. Fuera del sistema: Segoe/system-ui, grises fríos Tailwind, CTA blancos, sombras negras. Detector: 0 (no tiene regla para tokens/fuente).

## Problemas prioritarios
- [P0] Afirmaciones falsas y productos fantasma: "autenticación en dos pasos" (no existe), "tasas competitivas" (TNA 56%/CFTEA 93%), "sin comisiones ocultas", plazos fijos/fondos, prendarios, seguros, promociones, cuenta sueldo, Pymes; redes sociales href="#". /impeccable clarify + distill
- [P1] Fuera del sistema de diseño (fuente, paleta, CTA sin oro, sombras, breakpoints). /impeccable colorize + typeset
- [P1] Prueba y narrativa invertidas: cotizaciones en el medio (h3), producto real ausente, copy genérico, "Nosotros" vacío. /impeccable bolder / layout
- [P2] Layout: logo 150px en nav de 68px (PNG 2816px), Ban corrido en móvil (margin-right), globo lejos de Ban (PNG con aire), cotizaciones 2 columnas en 375px, tarjetas apretadas 1025-1200, <br> forzados. /impeccable adapt
- [P2] Accesibilidad: títulos h3/h4/h5 salteados, footer 3.9:1 y 2.4:1, sin focus-visible, sin reduced-motion, sin aria-live en cotizaciones, emoji en globo, logo no es link. /impeccable audit

## Menores
CSS muerto; color hardcodeado en 13 íconos; index.css de Vite; banEsp.gif 5.2MB sin usar; hover en tarjetas no clickeables; fetch sin r.ok; la landing se pinta antes del redirect si hay sesión.
