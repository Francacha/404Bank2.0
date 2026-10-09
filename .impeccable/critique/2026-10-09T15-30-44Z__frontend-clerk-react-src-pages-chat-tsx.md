---
target: chat
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Chat.tsx"
target_fingerprint: "sha256:958a7493c6b4bfe1856c661de8b9218600cf64840d1782d576cb059665dbba1b"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Chat.tsx
timestamp: 2026-10-09T15-30-44Z
slug: frontend-clerk-react-src-pages-chat-tsx
---
Method: dual-agent (A: design review · B: detector + evidence)

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 2 | Puntos de "escribiendo" sin anuncio; errores ocultos |
| 2 | Mundo real | 2 | Ban cita secciones y sucursales inexistentes |
| 3 | Control | 1 | Sin nueva conversación, reintentar; se pierde al salir |
| 4 | Consistencia | 2 | "B" en vez del personaje; "Chat" vs "Chat con Ban" |
| 5 | Prevención | 2 | Sin maxLength frente al tope de 2000 |
| 6 | Reconocimiento | 2 | Sugerencias desaparecen tras el primer mensaje |
| 7 | Flexibilidad | 2 | Input de una línea |
| 8 | Estética | 3 | Calmo y prolijo |
| 9 | Errores | 1 | Toda falla dice "No entendí bien tu consulta" |
| 10 | Ayuda | 2 | No dice qué puede y qué no puede hacer Ban |
| **Total** | | **19/40** | **Pobre** |

Specificity: chatbot genérico con colores de la marca. Detector: 0 hallazgos. Sin XSS (texto plano). No se envían datos del usuario a Gemini.

Priority issues:
- [P0] Ban inventa estructura y sucursales (prompt: "Atencion al cliente > Turnos", horario de sucursales); QA muerto con rutas falsas → clarify
- [P1] Errores culpan al usuario, sin reintentar; el fallback entra al historial → harden
- [P1] Respuestas sin formato (asteriscos, saltos perdidos); montos sin Space Grotesk → polish
- [P1] Accesibilidad: sin role=log/aria-live, input sin label, pierde foco en cada envío, outline none, animación sin reduced-motion, 10.5px → audit + harden
- [P2] Ban sin presencia, alcance no explicado, móvil (input lejos, tab bar) → delight + adapt

Personas: Jordan (cree que Ban ve su cuenta), Sam (no escucha respuestas, pierde foco), Casey (input empujado, dos toques para llegar), Profesor (sucursales inventadas, asteriscos, sin rate limit).

Preguntas: ¿Ban como ayuda contextual? ¿darle lectura de saldo? ¿cómo suena Ban?
