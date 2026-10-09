---
version: 1
slug: "frontend-clerk-react-src-pages-landing-tsx"
primary_target: "frontend/clerk-react/src/pages/Landing.tsx"
related_targets: ["frontend/clerk-react/src/pages/Landing.module.css"]
---

# Landing (/)

Scope: página pública para visitantes sin sesión. Visitor mode: Persuade.
Audiencia: un profesor o un estudiante que llega por primera vez. Tiene que entender en segundos qué es 404Bank y abrir una cuenta.
Prueba: el simulador de préstamos con las mismas cuentas del backend (endpoint público de simulación), la cotización del dólar en vivo y la lista de lo que funciona hoy.
Restricciones: solo servicios reales. Sin 2FA, sin "tasas competitivas", sin redes sociales. Un "Nosotros" que diga que es un banco simulado de Práctica Profesionalizante I. CTA a /register.

## Direction contract

THESIS: La landing prueba el banco dejando que cualquiera calcule un préstamo real antes de registrarse. Rechaza el molde hero + grilla de íconos + beneficios + CTA.

OWN-WORLD: el mundo de DESIGN.md. Hero en gradiente vino (#4a0817 → #2a0410 → #150208). Fondo papel #f4f2ee con tarjetas blancas. El oro #e8b84b se reserva para "Abrir cuenta". Texto en Manrope, cifras en Space Grotesk. Píldoras de alias y CBU. Ban recortado sobre el vino.

STORY: el visitante entiende que 404Bank es un banco digital (simulado) cuyas cuentas de préstamo son reales. Ve el dólar de hoy y lo que realmente puede hacer. Cree que es honesto y abre su cuenta.

FIRST VIEWPORT: nav con el logo como link, "Iniciar sesión" fantasma y "Abrir cuenta" oro. A la izquierda (5/12), el titular "Filas, papeles y letra chica: error 404." en Space Grotesk de unos 56px, un subtítulo y el CTA oro. A la derecha (7/12), la tarjeta blanca del simulador sobre el vino: monto, cuotas segmentadas, "Vas a devolver" a 44px, la cuota y el CFTEA, con Ban asomando desde el borde. Al pie del hero, la franja del dólar en vivo. Interacción insignia: al tipear el monto, las cifras se recalculan con una transición corta.

FORM: el simulador primero, puesto 5 de mi lista ordenada, seed key add9586f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
