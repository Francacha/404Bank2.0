---
target: panel Admin
total_score: 14
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Admin.tsx"
target_fingerprint: "sha256:df161dc7f446346779464f08d647d83562137564c657bff567d622239e6ed83c"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Admin.tsx
timestamp: 2026-10-09T19-25-17Z
slug: frontend-clerk-react-src-pages-admin-tsx
---
Method: dual-agent (A: design review · B: detector + evidence). Crítica conjunta de Admin, Empleado y Gerente.

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 1 | Sin contadores, sin estado en curso, cargas fallidas silenciosas |
| 2 | Mundo real | 2 | Préstamo sin cuotas/TNA/total; "Mi cuenta" ambiguo |
| 3 | Control | 1 | "Aprobar" acredita plata en un clic; revocar sin confirmación |
| 4 | Consistencia | 1 | Tres shells propios, :root global con rojo #991b1b |
| 5 | Prevención | 1 | Aprobar y rechazar con el mismo peso; búsqueda sin resultado muestra todos |
| 6 | Reconocimiento | 2 | La cadena de aprobación no se ve |
| 7 | Flexibilidad | 1 | Sin filtros, orden, teclado |
| 8 | Estética | 3 | Calmo y en la paleta |
| 9 | Errores | 1 | Errores en caja verde; vacío falso; tabla de Admin desaparece |
| 10 | Ayuda | 1 | No explica la cadena ni la escala BCRA |
| **Total** | | **14/40** | **Pobre** (Empleado 16, Gerente 13, Admin 13) |

Detector: 0 hallazgos.

Priority issues:
- [P0] /api/prestamos pendientes/pre-aprobar/rechazar/pre-aprobados/aprobar sin requireRole: un cliente puede aprobarse su préstamo y acreditarse plata; nadie impide aprobar una solicitud propia → harden
- [P1] Decisiones irreversibles sin contexto, confirmación ni motivo de rechazo → clarify + harden
- [P1] Fallas deshonestas: vacío falso, error como éxito, tabla de Admin borrada → harden
- [P1] La bandeja no es la pantalla principal; sin contadores ni antigüedad → distill + shape
- [P2] Tres shells y desvío de tokens; sin responsive → extract + adapt
- [P2] Teclado y lector: filas y selector con onClick, tabs sin roles, botones sin contexto → audit

RoleGuard: igualdad estricta, admin no ve paneles de empleado/gerente; rol incorrecto va a /login.
Gerente promete "Asignación" de empleados sin UI.
