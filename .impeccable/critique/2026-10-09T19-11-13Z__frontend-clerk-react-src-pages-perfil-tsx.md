---
target: perfil
total_score: 14
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Perfil.tsx"
target_fingerprint: "sha256:9baf11004e49241e181f4e680cd9db3112649eea5ec864ca45a86ff9213eccc3"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Perfil.tsx
timestamp: 2026-10-09T19-11-13Z
slug: frontend-clerk-react-src-pages-perfil-tsx
---
Method: dual-agent (A: design review · B: detector + evidence)

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 2 | Spinner sin confirmación ni error; overlay solo en hover |
| 2 | Mundo real | 2 | Perfil bancario sin DNI, CBU, alias ni domicilio; "Último acceso" es la sesión actual |
| 3 | Control | 1 | Nada editable; la foto se sube sin vista previa |
| 4 | Consistencia | 2 | Íconos con stroke fijo, padding distinto, nombre y email repetidos |
| 5 | Prevención | 1 | Sin control de tamaño/tipo de imagen |
| 6 | Reconocimiento | 2 | Cambiar foto invisible en reposo y en celular |
| 7 | Flexibilidad | 1 | Sin copiar CBU/alias |
| 8 | Estética | 2 | Repite nombre y email |
| 9 | Errores | 0 | Falla de subida solo en consola |
| 10 | Ayuda | 1 | No explica cómo cambiar datos |
| **Total** | | **14/40** | **Pobre** |

Specificity: plantilla genérica de ajustes. Detector: 0 hallazgos.

Seguridad (backend): GET /api/personas devuelve DNI, email y teléfono de todas las personas a cualquier usuario autenticado; sin requireRole; no lo usa el frontend.

Priority issues:
- [P0] Cambio de contraseña deshabilitado aunque Clerk lo provee; fila de contraseña sin acción → harden + clarify
- [P0-seg] /api/personas expone PII de todos los clientes → harden
- [P1] Falta la identidad bancaria (DNI, CBU, alias, contacto, domicilio) → distill + shape
- [P1] Subir foto inaccesible y con fallas silenciosas → harden
- [P2] "Último acceso" engañoso → clarify
- [P3] Desvíos del sistema (íconos, padding, dl, * global) → polish

Personas: Jordan (no encuentra su CBU), Sam (avatar fuera del teclado), Casey (foto invisible en táctil), Profesor (contraseña "próximamente", PII expuesta).
