---
target: inversiones
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Inversiones.tsx"
target_fingerprint: "sha256:d6a91ff4b5066ef65bfcd505a903e34a7fa05e263e389557a28b9c1af788b110"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Inversiones.tsx
timestamp: 2026-10-09T15-04-56Z
slug: frontend-clerk-react-src-pages-inversiones-tsx
---
Method: dual-agent (A: design review · B: detector + evidence)

| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Estado | 1 | Cotización cargada una vez, sin hora; feedback arriba fuera de vista |
| 2 | Mundo real | 2 | Nav "Inversiones", título "Compra de dólares", frascos debajo |
| 3 | Control | 1 | Sin revisión ni cancelar; no se puede vender dólares |
| 4 | Consistencia | 1 | Ignora revisión+recibo de Transferir; clases CSS inexistentes; 3 botones oro |
| 5 | Prevención | 1 | Un toque mueve plata; botón de frasco deshabilitado sin motivo |
| 6 | Reconocimiento | 2 | Saldo ARS fuera del formulario de frasco |
| 7 | Flexibilidad | 2 | Sin montos rápidos |
| 8 | Estética | 2 | La cotización no se destaca |
| 9 | Errores | 2 | Mensajes del backend crudos, con "tú" y detalle técnico en 500 |
| 10 | Ayuda | 2 | "La cotización final la confirma el servidor" |
| **Total** | | **16/40** | **Pobre** |

Specificity: genérica; la pantalla menos trabajada del cliente. Detector: 0 hallazgos. Sin overlay.

Priority issues:
- [P0] Mueve plata sin revisión y la cotización mostrada no es la cobrada; backend con lost update (saldo absoluto, lectura fuera de la transacción) y sin redondeo → harden + shape
- [P1] Si dolarapi falla, ofrece abrir cuenta USD a quien ya la tiene y crea duplicada → harden
- [P1] Resultado invisible: successMsg/pageHeader/pageTitle no existen; sin aria-live; sin recibo → polish
- [P2] IA: dos productos bajo un título equivocado; frascos sin entrada desde Home → clarify/distill
- [P2] Accesibilidad: sin aria-describedby/invalid, barra sin progressbar, emoji como estado, opacidad .6 → audit + harden

Personas: Jordan (no entiende "dólar vendedor", no encuentra frascos), Sam (mensajes no anunciados), Casey (feedback fuera de vista, frascos a tres pantallas), Profesor (sin confirmación, sin venta, saldo pisado).

Preguntas: ¿bloquear la cotización 60 s? ¿frascos son inversión o hábito de ahorro? ¿por qué no se puede vender si el backend lo soporta?
