---
target: home
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/home.tsx"
target_fingerprint: "sha256:23599fca02c028e75eabd811653e183676a9813ada36eaf0061a80428e7f2f73"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/home.tsx
timestamp: 2026-10-08T13-52-08Z
slug: frontend-clerk-react-src-pages-home-tsx
---
Method: dual-agent (A: design review · B: detector). Revisión desde código; sin automatización de navegador.

## Puntaje Nielsen: 22/40 (Aceptable)
1 Visibilidad 2 · 2 Mundo real 3 · 3 Control 3 · 4 Consistencia 2 · 5 Prevención 3 · 6 Reconocimiento 3 · 7 Eficiencia 2 · 8 Estética 2 · 9 Recuperación 1 · 10 Ayuda 1

## Especificidad
Parcialmente propia (situación BCRA, CBU, ARS/USD, hero vino y oro); el resto es dashboard fintech genérico. Faltan alias y Ban. Detector: 0 hallazgos en home y shell.

## Problemas prioritarios
- [P1] Alcance deshonesto: tile "Recargas" sin onClick (home.tsx:448); saludo con fallback 'Franco' (home.tsx:261). /impeccable harden
- [P1] Estados faltantes/falsos: situación crediticia sin error (queda "Consultando…"), tarjetas sin loading (flash de vacío) y pendientes filtradas, error de movimientos = "sin movimientos", error de abrir USD oculta saldo ARS (error compartido). /impeccable harden
- [P1] Teclado/lector: foco vino sobre hero vino invisible; "Ver todas"/"Ver historial" son <a> sin href; tabs ARS/USD sin aria-pressed; títulos de panel en <span>; "Copiado" no se anuncia. /impeccable audit
- [P2] Navegación triplicada (hero + tiles + sidebar/tab bar) y segundo oro en estado USD vacío. /impeccable distill
- [P2] Responsive: panel huérfano en ≤1220; hero con padding de escritorio en celular; filas de cuentas adicionales sin wrap. /impeccable adapt

## Menores
Código muerto masAbierto (home.tsx:102); "Cuentas" vs "Inicio"; flechas entrante/saliente inconsistentes; tarjeta con gradiente azul frío y labels 8.5px; colores hardcodeados; "deuda(s)"; fecha de vencimiento puede correrse un día (UTC-3); estado de transferencia ignorado.
