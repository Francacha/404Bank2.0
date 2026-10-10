---
target: tarjetas
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Tarjetas.tsx"
target_fingerprint: "sha256:a034ea447aece5c6fbe0864b12979ab3877a1052f7047e74baeb6f314e0efa9b"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Tarjetas.tsx
timestamp: 2026-10-10T16-00-06Z
slug: frontend-clerk-react-src-pages-tarjetas-tsx
---
Method: dual-agent (A: design review · B: detector + evidence). Re-crítica después del rediseño.

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 3 | Pasos sin fechas ni tiempo estimado |
| 2 | Mundo real | 3 | Bien; "Aprobación del gerente" expone burocracia interna, con honestidad |
| 3 | Control | 2 | No se cancela una solicitud; 30 s sin extender; sin pausar tarjeta |
| 4 | Consistencia | 3 | Chip "En revisión" en oro compite con el CTA |
| 5 | Prevención | 3 | Tras pedir, el botón oro cambia al otro tipo |
| 6 | Reconocimiento | 3 | Motivos y razones visibles |
| 7 | Flexibilidad | 2 | Solo "Copiar número" |
| 8 | Estética | 3 | Columnas desbalanceadas en 0 y 2 tarjetas |
| 9 | Errores | 3 | Reintentar, errores en línea, motivo de rechazo |
| 10 | Ayuda | 2 | Sin "suele tardar", sin link a Ban |
| **Total** | | **27/40** | **Bueno** (antes 16) |

Detector: 0 hallazgos.

Priority issues:
- [P1] Composición de dos columnas rota en 2 de 4 estados (sin tarjetas; dos tarjetas sin solicitudes) → layout
- [P1] Foco perdido al revelar y al ocultarse los datos (WCAG 2.4.3) → audit + harden
- [P2] Temporizador de 30 s no extensible; "Número copiado" no se resetea → harden
- [P2] Tras pedir, el formulario invita a un segundo pedido → clarify
- [P3] Rechazos se acumulan; chip oro en "En revisión" → distill + colorize

Backend menor: aprobar sin AND estado en el UPDATE; /:id/datos sin idValido; Cache-Control solo en éxito.
Menores: CSS muerto de la marca vieja; DESIGN.md desactualizado sobre la marca de la tarjeta; columna derecha angosta a 1366; gutter 16 vs 20 en celular; titular desde Clerk.
