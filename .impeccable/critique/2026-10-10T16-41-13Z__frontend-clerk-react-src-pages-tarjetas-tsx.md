---
target: tarjetas
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Tarjetas.tsx"
target_fingerprint: "sha256:bf30ff84fc83194982b90535f01d94a1bacb147c6b70b00c3cb6be8b9242f06e"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Tarjetas.tsx
timestamp: 2026-10-10T16-41-13Z
slug: frontend-clerk-react-src-pages-tarjetas-tsx
---
Method: dual-agent (A: design review · B: detector + evidence). Tercera crítica.

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 3 | La cuenta regresiva se congela sin decir que está en pausa |
| 2 | Mundo real | 3 | "No se puede usar" sugiere usos que no existen |
| 3 | Control | 3 | Pausar, ocultar, +30 s; no se cancela una solicitud |
| 4 | Consistencia | 3 | Home ignora la pausa y usa el nombre de Clerk |
| 5 | Prevención | 3 | Bien |
| 6 | Reconocimiento | 3 | "Detalle" repite la tarjeta |
| 7 | Flexibilidad | 2 | Solo copiar número |
| 8 | Estética | 3 | Estados bien compuestos; Detalle redundante |
| 9 | Errores | 3 | Error de copia no ligado a una tarjeta |
| 10 | Ayuda | 2 | Sin tiempo estimado ni link a Ban |
| **Total** | | **28/40** | **Bueno** |

Detector: 0 hallazgos.

Priority issues:
- [P1] El ocultamiento automático casi nunca corre: la pausa por foco/hover deja la cuenta congelada (en celular, para siempre); pausa compartida entre tarjetas → harden
- [P1] Pausar no es honesto: Home no lo muestra; "no se puede usar" promete efectos inexistentes; débito no marcado como simulado → clarify
- [P2] Botones con etiqueta cambiante + aria-pressed (doble negación); disabled durante la búsqueda pierde el foco → audit
- [P2] Panel Detalle redundante; separa la pausa de su explicación → distill
- [P3] Error de copia sin tarjeta; "+30 s" sin nombre accesible ni re-anuncio; setTimeout sin limpieza; clamp de 11px; DESIGN.md desactualizado (chip de aviso)
