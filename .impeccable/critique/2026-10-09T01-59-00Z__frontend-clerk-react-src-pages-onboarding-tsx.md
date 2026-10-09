---
target: onboarding
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Onboarding.tsx"
target_fingerprint: "sha256:3fe43b7e6f7eab65f6b5444176648e46c25259f464db6b3894cc211d56556e85"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Practica Profesionalizante I/404Bank2.0/frontend/clerk-react/src/pages/Onboarding.tsx
timestamp: 2026-10-09T01-59-00Z
slug: frontend-clerk-react-src-pages-onboarding-tsx
---
Method: dual-agent (A: design review · B: detector). Revisión desde código; sin automatización de navegador.

## Puntaje Nielsen: 15/40 (Pobre)
1 Visibilidad 2 · 2 Mundo real 2 · 3 Control 2 · 4 Consistencia 1 · 5 Prevención 1 · 6 Reconocimiento 2 · 7 Eficiencia 1 · 8 Estética 2 · 9 Recuperación 1 · 10 Ayuda 1

## Especificidad
Fuera del mundo: plantilla de auth con manchas rosas, círculo cuadriculado, Inter (no cargada → fuente del sistema), radios 7-12px, botón vino en vez de oro, grises fríos. Registro copia el fondo; Login usa un tercer estilo. Detector: overused-font Inter y codex-grid-background en Onboarding y Registro (verdaderos).

## Problemas prioritarios
- [P0] Probable: después de enviar, el OnboardingGuard reutilizado (tienePerfil=false) redirige de vuelta a /onboarding; reenviar da 409. Verificar en vivo. /impeccable harden
- [P0] País/provincia/ciudad dependen de countriesnow (sin manejo de error, sin res.ok, ciudades vacías bloquean el required); 250 países en inglés sin Argentina por defecto. /impeccable harden
- [P1] El CBU y el alias que devuelve el backend se descartan; sin "paso 2 de 4", sin explicación de por qué se pide el DNI ni aviso de banco simulado. /impeccable onboard + delight
- [P1] Accesibilidad: labels sin htmlFor, secciones en <p>, error sin role=alert arriba de todo, foco casi invisible. /impeccable audit
- [P2] Campos: DNI sin inputMode/pattern, sin type=tel, sin autocomplete, email no precargado, fecha sin máximo, espacios pasan; backend registra en Banco Central antes del insert local. /impeccable clarify

## Menores
Registro.tsx define formFieldLabel dos veces (TS1117, rompe npm run build); "Regístrate" (tuteo); tarjeta de Registro 150% de ancho; inputs 36px y 14px (zoom en iOS); pantallas de guard sin estilo; Login con "clave publishable".
