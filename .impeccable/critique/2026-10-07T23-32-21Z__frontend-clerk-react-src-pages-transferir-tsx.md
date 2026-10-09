---
target: transferir
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Transferir.tsx"
target_fingerprint: "sha256:b7540bd7b9f0a423a02abb9aeff7c6079f95c4c7a41e814d0cdeb00b5151bab5"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Transferir.tsx
timestamp: 2026-10-07T23-32-21Z
slug: frontend-clerk-react-src-pages-transferir-tsx
closed: true
---
Method: dual-agent (A: design review · B: detector). Revisión desde código; sin automatización de navegador.

## Puntaje Nielsen: 21/40 (Aceptable)
1 Visibilidad 2 · 2 Mundo real 3 · 3 Control 2 · 4 Consistencia 2 · 5 Prevención de errores 1 · 6 Reconocimiento 3 · 7 Eficiencia 2 · 8 Estética 3 · 9 Recuperación 2 · 10 Ayuda 1

## Especificidad
Mayormente intercambiable con shell de marca. Detector: 0 hallazgos (no evalúa lógica de flujo ni el CSS directamente).

## Problemas prioritarios
- [P1] Monto/moneda sin saldo ni moneda destino; errores recién al confirmar (Transferir.tsx:150-155, 389-404). /impeccable harden
- [P1] Éxito borra la transacción; solo queda un <p> verde (Transferir.tsx:210-213, 451). /impeccable delight + clarify
- [P1] Destinatario desactualizado al editar el input después de buscar (Transferir.tsx:342). /impeccable harden
- [P2] Accesibilidad: label sin htmlFor, toggle sin aria, sin aria-live, outline:none, sin <form> (Transferir.tsx:338-346, 390-403; css:432,620). /impeccable audit
- [P2] Responsive ≤980px: `.navItem span:last-child` oculta el ícono, no el texto (css:766, también home.module.css:876); contactos abajo en móvil; type=number. /impeccable adapt

## Menores
Botón primario vino en vez de oro (css:444,722); CBU sin píldora mono; --red #991b1b vs #a3312c; "Cerrar sesion" sin tilde; nav con 2 ítems muertos; alias sin encodeURIComponent; h1→h3; contraste etiqueta #8a8078 sobre papel ~3.4:1.
