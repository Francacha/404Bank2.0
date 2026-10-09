---
target: home
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/home.tsx"
target_fingerprint: "sha256:9e388e1a7eb0a1db0fe6d90fae933d4e2049e31634c3bbc0503027875be0036b"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/home.tsx
timestamp: 2026-10-08T15-58-58Z
slug: frontend-clerk-react-src-pages-home-tsx
---
Method: dual-agent (A: design review · B: detector). Revisión desde código; sin automatización de navegador.

## Puntaje Nielsen: 28/40 (Bueno, antes 26)
1 Visibilidad 3 · 2 Mundo real 3 · 3 Control 3 · 4 Consistencia 2 · 5 Prevención 3 · 6 Reconocimiento 3 · 7 Eficiencia 2 · 8 Estética 3 · 9 Recuperación 3 · 10 Ayuda 3

## Especificidad
Superficie propia (hero vino/oro, alias/CBU, Central de Deudores en voseo, Ban); esqueleto de dashboard genérico. Préstamos/cuotas y frascos no llegan a Home. Detector: 0.

## Problemas prioritarios
- [P1] Títulos en system-ui: index.css (plantilla Vite) h1,h2 { font-family: var(--heading) } pisa a Manrope en toda la app. /impeccable typeset
- [P1] Falta la plata que importa: próxima cuota, deuda, frascos; débitos de cuotas (movimientos_prestamo) no aparecen en movimientos. /impeccable layout
- [P1] En celular los movimientos quedan ~3 pantallas abajo (tarjeta, situación y Ban antes). /impeccable adapt
- [P2] Mensajes de estado contradictorios: "No tenés cuentas activas" para solo-USD/bloqueado; éxito+error USD a la vez; copia que falla en silencio; "Copiado" que persiste al cambiar de moneda. /impeccable harden
- [P2] Bugs visuales: .movRow:last-child borra todos los divisores; saldo con overflow-wrap anywhere parte números; texto de tarjeta 8.5px; colores fuera de paleta (tarjeta azul, situaciones 2/3/5); CBU en dos líneas a 360; `* {box-sizing}` global. /impeccable polish

## Menores
Situación 2 con ícono de check; tabs ARS/USD vs Pesos/Dólares; orden de foco vs order:-1 en móvil; disabled nav sin explicación accesible; dos formateadores de plata; "Otra cuenta" sin espacio; transferencia propia duplicada; estado del movimiento ignorado; selectores .hero/.banCard duplicados.
