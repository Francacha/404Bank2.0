---
target: tarjetas
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Tarjetas.tsx"
target_fingerprint: "sha256:18b5d41d7c3886aad9f285149193b261a0d4de886b49a4edc5d2700e6bc8520c"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Tarjetas.tsx
timestamp: 2026-10-09T14-46-20Z
slug: frontend-clerk-react-src-pages-tarjetas-tsx
---
Method: dual-agent (A: design review · B: detector + evidence)

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 2 | Estados crudos de la base ("pre aprobada"); el circuito de aprobación no se ve |
| 2 | Mundo real | 2 | "DEBITO"/"CREDITO" sin tilde; la tarjeta no parece tarjeta |
| 3 | Control | 2 | No se puede cancelar una solicitud; duplicados permitidos |
| 4 | Consistencia | 1 | Peor que la tarjeta de Home; CTA vino en vez de oro; tintes fuera de token |
| 5 | Prevención | 1 | Sin control de duplicados ni de tarjeta ya activa |
| 6 | Reconocimiento | 2 | No explica débito vs crédito |
| 7 | Flexibilidad | 2 | Primero el formulario, después la billetera |
| 8 | Estética | 2 | CVV con el mismo peso que el número |
| 9 | Errores | 1 | Mensajes del backend crudos; sin reintentar; rechazada sin salida |
| 10 | Ayuda | 1 | Nada sobre el proceso de aprobación |
| **Total** | | **16/40** | **Pobre** |

Specificity: genérica, scaffold CRUD; la tarjeta de Home es mejor. Detector: 0 hallazgos.

Priority issues:
- [P0] Seguridad: número completo y CVV en texto plano al navegador (SELECT t.*), incluidos clerk_id del personal; rutas de empleado/gerente sin requireRole → cualquier cliente puede aprobarse su tarjeta → harden
- [P1] Tarjeta visual genérica y distinta de Home → extract TarjetaVisual + polish
- [P1] IA invertida: formulario primero; circuito de aprobación invisible → layout
- [P2] Estados y copy pobres: estados crudos, errores crudos, sin reintentar, vacío de una línea → harden + clarify
- [P2] Accesibilidad y tokens: toggle sin aria-pressed, etiquetas 9.5px al 50%, ámbar Tailwind, monospace en vez de Space Grotesk → audit + typeset

Personas: Alex (nada que hacer con la tarjeta activa), Sam (toggle solo por color, 16 dígitos sin "terminada en"), Casey (número y CVV a la vista en público, doble toque duplica), Profesor (DevTools muestra CVV; un PUT se autoaprueba).

Preguntas: ¿para qué es /tarjetas si Home la muestra mejor? ¿Mostrar el CVV con "Ver datos" temporal o nunca? ¿Ofrecer "Crédito" sin límite viola Honest Scope?
