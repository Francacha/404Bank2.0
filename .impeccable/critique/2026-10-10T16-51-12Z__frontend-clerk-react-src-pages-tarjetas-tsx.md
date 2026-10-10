---
target: tarjetas
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Tarjetas.tsx"
target_fingerprint: "sha256:e4ad30f67f757cc324603e762ae61f36c50e1133791b9bbfd0ee8578432184de"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Tarjetas.tsx
timestamp: 2026-10-10T16-51-12Z
slug: frontend-clerk-react-src-pages-tarjetas-tsx
---
Method: dual-agent (A: design review · B: detector + evidence). Cuarta crítica.

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 3 | Al ocultarse los datos el foco cae al body sin aviso |
| 2 | Mundo real | 3 | "Queda pausada en todo 404Bank" exagera: el personal no la ve |
| 3 | Control | 3 | No se cancela una solicitud; hay que ocultar datos para pausar |
| 4 | Consistencia | 3 | Titular de respaldo distinto en Inicio y Tarjetas; DESIGN.md con 2 datos viejos |
| 5 | Prevención | 3 | Aviso a 10 s (WCAG pide 20 s) |
| 6 | Reconocimiento | 4 | Estado, fecha y acciones junto a cada tarjeta |
| 7 | Flexibilidad | 2 | Solo copiar número; rechazo sin link al formulario |
| 8 | Estética | 3 | "Pausada" repetido 3 veces; huecos desparejos a todo el ancho |
| 9 | Errores | 3 | Errores ligados a su tarjeta |
| 10 | Ayuda | 2 | Sin estimación de tiempo ni link a Ban |
| **Total** | | **30/40** | **Bueno** |

Detector: 0 hallazgos. tsc limpio. ESLint: 4 avisos (export junto a componente; setState en effects).

Priority issues:
- [P1] Foco perdido al ocultarse los datos y al llegar +30 s al máximo; aviso a 10 s en vez de 20 s → harden
- [P2] La pausa no tiene efecto y el texto exagera → clarify (o bloquear Ver datos y mostrarla al personal)
- [P2] Esperar una solicitud es un callejón: sin estimación, sin cancelar, rechazo sin link → onboard/clarify
- [P3] "Pausada" repetido y chip "Activa" sin información → distill
- [P3] La pausa por hover no tiene límite; reveal con el mouse ya encima no se frena → harden
Backend: admin puede preaprobar y aprobar la misma solicitud; tarjeta pausada sigue mostrando datos.
