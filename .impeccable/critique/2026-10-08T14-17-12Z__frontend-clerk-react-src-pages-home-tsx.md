---
target: home
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/home.tsx"
target_fingerprint: "sha256:f302e8d989ab5bac4976226e2dc40640b410b74937bb742f1bcac4ae8a6f6e72"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/home.tsx
timestamp: 2026-10-08T14-17-12Z
slug: frontend-clerk-react-src-pages-home-tsx
---
Method: dual-agent (A: design review · B: detector). Revisión desde código; sin automatización de navegador.

## Puntaje Nielsen: 26/40 (Aceptable, antes 22)
1 Visibilidad 2 · 2 Mundo real 3 · 3 Control 3 · 4 Consistencia 2 · 5 Prevención 3 · 6 Reconocimiento 3 · 7 Eficiencia 2 · 8 Estética 3 · 9 Recuperación 2 · 10 Ayuda 3

## Especificidad
Estructura de plantilla fintech; contenido propio (alias/CBU, ARS/USD, situación BCRA, tarjeta de marca, Ban). Detector: 0 hallazgos.

## Problemas prioritarios
- [P0] .heroStateText (blanco 70%) usado en paneles blancos: carga y vacío invisibles (home.tsx:373,495,516,524). /impeccable harden
- [P1] Foco oro en superficies vino nunca aplica: .page button:focus-visible (0,2,1) gana a .hero :focus-visible / .banCard:focus-visible / .sidebar :focus-visible (0,2,0). /impeccable audit
- [P1] Saldo sin reintento ni role=alert, texto crudo del backend; Transferir activo con error; 404 de mis-transferencias sin cuentas = error falso. /impeccable harden
- [P2] Cuenta principal no determinística (getMisCuentas sin ORDER BY); cuentas extra sin alias/copia. /impeccable clarify
- [P2] Movimientos: jerarquía invertida, flecha arriba para entrante, filas sin acción, div en vez de lista. /impeccable typeset

## Menores
`* {box-sizing}` global en home.module.css; tarjeta azul fría y situación 5 negra; hex repetidos; labels de tarjeta 8.5px; punto inactivo 1.3:1; mensaje de USD abierto permanente; tarjetaIdx sin clamp; API_URL localhost.
