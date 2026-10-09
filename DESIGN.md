---
name: 404Bank
description: Banco digital simulado — libro mayor cálido en vino, papel y oro.
colors:
  ink: "#1a1512"
  muted: "#8a8078"
  muted-text: "#6f665e"
  paper: "#f4f2ee"
  card: "#ffffff"
  line: "rgba(26, 21, 18, 0.08)"
  line-strong: "rgba(26, 21, 18, 0.16)"
  wine: "#7a1128"
  brand-wine: "#4f0919"
  wine-dark: "#2a0410"
  wine-darker: "#150208"
  accent: "#e8b84b"
  accent-hover: "#f0c862"
  wine-hero: "#4a0817"
  green: "#187a4c"
  red: "#a3312c"
typography:
  display:
    fontFamily: "'Space Grotesk', sans-serif"
    fontSize: "46px"
    fontWeight: 700
    letterSpacing: "-1px"
  headline:
    fontFamily: "'Manrope', 'Segoe UI', Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 800
    letterSpacing: "-0.4px"
  title:
    fontFamily: "'Manrope', 'Segoe UI', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 800
  body:
    fontFamily: "'Manrope', 'Segoe UI', Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
  label:
    fontFamily: "'Manrope', 'Segoe UI', Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    letterSpacing: "0.6px"
  mono:
    fontFamily: "monospace"
    fontSize: "12.5px"
rounded:
  sm: "10px"
  md: "14px"
  lg: "16px"
  card: "22px"
  hero: "26px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "28px"
  page-y: "36px"
  page-x: "44px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.wine-dark}"
    rounded: "{rounded.lg}"
    padding: "12px 22px"
  button-secondary-on-wine:
    backgroundColor: "rgba(255, 255, 255, 0.08)"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "12px 22px"
  button-ghost:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "42px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "12px"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "24px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "rgba(255, 255, 255, 0.68)"
    rounded: "{rounded.md}"
    padding: "11px 16px"
  nav-item-active:
    backgroundColor: "rgba(255, 255, 255, 0.1)"
    textColor: "#ffffff"
  chip-segmented-active:
    backgroundColor: "#ffffff"
    textColor: "{colors.wine-dark}"
    rounded: "{rounded.pill}"
    padding: "7px 16px"
  card-simulator:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hero}"
    padding: "28px 28px 24px"
  ledger-data-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.wine}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: 404Bank

## Overview

**Creative North Star: "El Libro Mayor Cálido"**

404Bank se ve como un libro mayor bancario moderno: cifras claras sobre papel cálido, con el vino como firma institucional. La app es un shell de dos zonas — una barra lateral vino profundo que da peso y confianza, y un área de trabajo color papel donde viven tarjetas blancas con los datos. El oro aparece solo donde está la acción principal; el resto es tinta cálida, gris piedra y blanco.

La densidad es cómoda, no aireada: tipografía chica pero pesada (13–15px en 600–800), números grandes en Space Grotesk para saldos y montos. Las formas son suaves y seguras de sí — esquinas generosas, píldoras para chips y toggles, avatares circulares. La personalidad (Ban, el "404") vive en la marca y el copy; la interfaz de tareas se mantiene directa.

El sistema normativo es el de la app autenticada (`AppLayout`). La landing pública (`/`, `Landing.module.css`) vive en el mismo mundo: hero en gradiente vino (#4a0817 → Vino Bodega → Vino Noche), fondo Papel, tarjetas blancas, oro solo para el CTA primario, texto en Manrope y cifras en Space Grotesk. Como no usa AppLayout, redefine los mismos tokens en su propio `.page` (mismos valores, nunca en `:root`). Su única diferencia sancionada es tipográfica: ver The Persuade Display Rule.

**Key Characteristics:**
- Shell vino oscuro + lienzo papel cálido (#f4f2ee), nunca gris frío.
- Saldos y montos en Space Grotesk 700; todo lo demás en Manrope.
- Oro (#e8b84b) reservado a la acción primaria y acentos de identidad.
- Tarjetas blancas con sombra ambiental mínima, sin bordes duros.
- Esquinas suaves (14–26px) y píldoras para controles segmentados.

## Colors

Una paleta cálida y contenida: tintas marrón-negras, papel, vino en tres profundidades y un solo oro.

### Primary
- **Vino Institucional** (#7a1128): links de panel, foco de inputs, acentos de texto sobre papel.
- **Vino Marca** (#4f0919): el color de marca fijado en PRODUCT.md; logo, inicio del gradiente del hero de saldo (≈ #4a0817).
- **Vino Bodega** (#2a0410) y **Vino Noche** (#150208): gradiente vertical de la barra lateral y del hero de saldo; texto sobre oro.

### Secondary
- **Oro Sello** (#e8b84b): botón primario sobre vino, avatar del usuario en la sidebar. Nunca como fondo de superficies grandes.

### Tertiary
- **Verde Acreditado** (#187a4c): ingresos, éxito, estados activos. Oscurecido desde #1e8e5a para llegar a 5.3:1 sobre blanco (AA en texto chico).
- **Rojo Débito** (#a3312c): egresos, mora, errores, cuentas bloqueadas.

### Neutral
- **Tinta Cálida** (#1a1512): texto principal y títulos.
- **Piedra** (#8a8078): solo decoración y texto grande o deshabilitado (3.9:1 sobre blanco, no alcanza AA en texto chico).
- **Piedra Legible** (#6f665e): subtítulos, etiquetas, pistas y metadatos en texto chico (5.6:1 sobre blanco, 5.0:1 sobre papel).
- **Papel** (#f4f2ee): fondo del área de trabajo y relleno de inputs.
- **Blanco Tarjeta** (#ffffff): superficies de tarjetas y botones fantasma.
- **Línea** (rgba(26, 21, 18, 0.08)): bordes de chips, inputs y divisores.

### Named Rules
**The One Gold Rule.** El oro marca la acción principal de una vista — una sola por zona. Si dos cosas son oro, ninguna es primaria. En la landing el oro es "Abrir mi cuenta gratis" (hero y cierre de Nosotros, una por zona); el "Abrir cuenta" del nav es secundario translúcido a propósito, y el "error 404." del titular en oro es acento de identidad, no acción.

**The Warm Neutral Rule.** Los neutros son cálidos (base marrón). Grises fríos tipo Tailwind (#6b7280, #111827) son deriva heredada; no se usan en trabajo nuevo.

**The Readable Stone Rule.** Todo texto secundario de lectura usa Piedra Legible (`--muted-text`). Piedra (`--muted`) queda para íconos, bordes y texto grande.

**The Money Color Rule.** Verde y rojo solo significan dinero que entra o sale (o estado sano/en problema). Nunca decorativos.

## Typography

**Display Font:** Space Grotesk (with sans-serif)
**Body Font:** Manrope (with 'Segoe UI', Arial, sans-serif)
**Label/Mono Font:** monospace del sistema, para CBU y números de cuenta

**Character:** Manrope en pesos altos da una voz amable y firme; Space Grotesk aporta el carácter técnico del "404" y hace que las cifras se lean como protagonistas.

### Hierarchy
- **Display** (700, 46px, -1px): saldo principal en el hero.
- **Headline** (800, 25px, -0.4px): título de página en la topbar.
- **Title** (800, 14px): títulos de tarjetas/paneles.
- **Body** (600, 13.5–14.5px): ítems de navegación, contenido de tarjetas, inputs.
- **Label** (600, 13.5px, 0.6px, MAYÚSCULAS): etiquetas sobre cifras ("SALDO DISPONIBLE").
- **Mono** (12.5px): CBU, alias técnicos, números de cuenta, dentro de una píldora translúcida.
- **Display Persuade** (solo landing; Space Grotesk 700): titular del hero en clamp(38px, 5.2vw, 64px), line-height 1.04, -0.03em (36px en celular); títulos de sección en clamp(28px, 3.4vw, 40px), line-height 1.1, -0.02em.

### Named Rules
**The Figures Lead Rule.** Todo monto importante usa Space Grotesk; el texto que lo rodea se achica y se aclara para que la cifra mande.

**The Persuade Display Rule.** Extensión sancionada: en la landing (superficie Persuade), los títulos de display — el titular del hero y los títulos de sección — van en Space Grotesk 700 con tracking negativo ajustado (-0.03em / -0.02em). En la app los títulos siguen en Manrope 800; esta extensión no se traslada a vistas autenticadas. Los títulos de tarjeta dentro de la landing ("Simulá un préstamo", "Dólar hoy") siguen en Manrope 800.

## Layout

Shell de dos columnas: sidebar fija de 264px (sticky, alto completo) y main fluido con padding 36px 44px 60px y gap vertical de 28px entre bloques. El contenido se organiza en un hero de saldo a ancho completo seguido de grillas de paneles (p. ej. `1.1fr 1.3fr 1fr`, gap 20px). Espaciado interno típico: 24px en tarjetas, 12px entre acciones, 6px en controles segmentados.

La landing (sin shell) usa un contenedor de 1240px centrado con padding lateral clamp(20px, 5vw, 72px). El hero es una grilla `5fr 6fr` (texto | simulador, gap clamp(32px, 5vw, 72px)) que colapsa a una columna en 980px; las secciones sobre papel abren con padding superior clamp(56px, 8vw, 96px) y 28px entre cabecera y contenido.

Breakpoints observados: 980px (grillas colapsan) y 640px (móvil; la sidebar deja de ser lateral). Valores puntuales en 720/860/900/1220px existen por página y no forman escala.

## Elevation & Depth

Mayormente plano con capas tonales: papel → tarjeta blanca → hero vino. Las tarjetas llevan una sombra ambiental casi imperceptible; la profundidad real la da el contraste vino/papel, no la sombra.

La tarjeta del simulador de la landing, única tarjeta blanca apoyada sobre vino, lleva `0 24px 60px rgba(21, 2, 8, 0.45)` (teñida de Vino Noche). Es de uso único sobre vino, no una sombra de vocabulario, y no aplica sobre papel.

### Shadow Vocabulary
- **Ambiental** (`box-shadow: 0 2px 14px rgba(26, 21, 18, 0.05)`): tarjetas y paneles en reposo.
- **Elevada vino** (`box-shadow: 0 12px 32px rgba(79, 9, 25, 0.13)`): elementos destacados que flotan sobre papel.
- **Anillo de foco** (`box-shadow: 0 0 0 3px rgba(126, 8, 39, 0.14)`): foco en controles.

### Named Rules
**The Paper-Not-Plastic Rule.** Nada de sombras negras pesadas sobre papel; si algo necesita destacarse, usa vino o blanco, no oscuridad.

## Shapes

Esquinas suaves y escalonadas por tamaño: 10–12px en inputs y alertas, 14px en ítems de nav y botones chicos, 16px en botones de acción, 22px en tarjetas, 26px en el hero. Píldoras (999px) para chips, tabs segmentados, CBU y botones fantasma de topbar. Avatares siempre circulares.

## Components

### Buttons
- **Shape:** esquinas suaves (16px) en acciones; píldora (999px) en botones de topbar.
- **Primary:** fondo Oro Sello, texto Vino Bodega, 800, padding 12px 22px, ícono a la izquierda con gap 9px.
- **Secondary sobre vino:** blanco translúcido 8% con borde blanco 25%, texto blanco 700.
- **Ghost (sobre papel):** blanco, borde Línea, píldora, 42px de alto, texto Tinta 700.
- **Hover / Focus:** transiciones de fondo/color de 0.15s ease; disabled baja a 0.7 de opacidad.
- **Primary en la landing:** misma receta a mayor escala (52px de alto, padding 0 28px, 15.5px 800); ocupa todo el ancho en celular.

### Chips / Segmented controls
- **Style:** contenedor píldora translúcido (blanco 10% sobre vino, Papel sobre blanco), padding 4px.
- **State:** opción activa en blanco con texto Vino Bodega 800; inactivas en blanco 70%.

### Cards / Containers
- **Corner Style:** 22px (paneles), 26px (hero).
- **Background:** Blanco Tarjeta; el hero usa gradiente 135° #4a0817 → Vino Bodega → Vino Noche.
- **Shadow Strategy:** Ambiental.
- **Border:** ninguno.
- **Internal Padding:** 24px (paneles), 34px 38px (hero).

### Inputs / Fields
- **Style:** relleno Papel, borde 1.5px Línea, 12px de radio, padding 12px 16px, 14.5px.
- **Focus:** el borde pasa a Vino Institucional.

### Navigation
- **Style:** sidebar con gradiente vertical Vino Bodega → Vino Noche; marca "404Bank" en Space Grotesk 26px (404 en 700, Bank en 500).
- **Items:** Manrope 14.5px 600, blanco 68%, radio 14px; hover blanco 6%; activo blanco 10% y 700.
- **Footer:** usuario con avatar oro y nombre en blanco 700, separado por línea blanca 8%.
- **Componente único:** todo el shell (sidebar, topbar con usuario y "Cerrar sesión", barra inferior móvil) vive en `src/components/AppLayout.tsx`. Las páginas lo usan con `<AppLayout title subtitle>`; Chat usa `variant="fill"` para ocupar el alto de la pantalla. Nunca copiar el sidebar dentro de una página.
- **Tablet (≤980px):** rail de 84px solo con íconos; el texto queda oculto a la vista pero accesible (tooltip con `title`).
- **Celular (≤640px):** la marca queda arriba y la navegación pasa a una barra inferior al pulgar (Inicio, Transferir, Tarjetas, Historial, Más). "Más" abre un panel blanco con el resto de las secciones; el ítem activo lleva el ícono en oro.
- **Nav de la landing:** sobre el gradiente vino, sin sidebar. Marca "404Bank" como link (Space Grotesk 26px, 22px en celular); links en blanco 72% Manrope 14.5px 600 (ocultos ≤640px); "Iniciar sesión" como texto blanco 85%; "Abrir cuenta" en píldora translúcida (blanco 8%, borde blanco 35%, hover 16%). Secundario a propósito: el único oro del primer viewport es el CTA del titular.
- **Secciones sin implementar** (Recargas, Cambio de Contraseña) se muestran deshabilitadas con "(próximamente)", nunca como botones que no hacen nada.
- **Tokens:** `.page` del shell (`AppLayout.module.css`) es la única fuente de los tokens de color en las páginas de cliente; ningún CSS de página redefine `:root`. Además de los colores de arriba expone `--red-tint`, `--green-tint` (fondos suaves de error/éxito), `--shadow-lift` (sombra Elevada vino) y `--focus-ring`.

### Hero de saldo (signature)
Bloque vino a ancho completo: etiqueta en mayúsculas blanco 60%, saldo en Display, CBU en píldora mono, tabs ARS/USD segmentados y fila de acciones (oro primaria + secundarias translúcidas).

### Simulador de préstamos (signature, landing)
Tarjeta blanca sobre el vino del hero (radio 26px, 22px en celular; padding 28px 28px 24px), con Ban asomando desde el borde superior. Título en Title ("Simulá un préstamo"); etiquetas de campo 12px 700 en mayúsculas, Piedra Legible.
- **Monto:** campo Papel de 54px, borde 1.5px Línea, radio 14px, con prefijo "$" en Space Grotesk 20px Piedra Legible y valor en Space Grotesk 22px 700 tabular; foco con borde Vino Institucional + anillo de foco.
- **Cuotas:** control segmentado en píldora Papel (padding 4px, 6 opciones en grilla); opciones en Space Grotesk 15px 700 Piedra Legible; la activa es un chip blanco con texto Vino Bodega 800 y sombra mínima `0 1px 4px rgba(26, 21, 18, 0.12)`.
- **Resultado:** separado por línea discontinua Línea fuerte; etiqueta "Vas a devolver" y el total en Space Grotesk clamp(34px, 4vw, 46px) 700, -0.03em; debajo la cuota ("12 cuotas de $ …").
- **Tasas:** una sola fila `dl` de tres columnas divididas por hairline Línea fuerte (CFTEA en Vino Institucional, TNA, intereses e IVA), cifras Space Grotesk 17px.
- **Recalculo:** mientras recalcula, el resultado viejo baja a opacidad 0.45; las cifras nuevas entran con 0.35s `cubic-bezier(0.16, 1, 0.3, 1)` (6px hacia arriba). Sin animación con `prefers-reduced-motion`.

### Libro mayor en lista (landing)
Una tarjeta blanca (radio 22px, sombra Ambiental) con filas divididas por Línea, padding 18px 28px (16px 18px en celular). Cada fila: nombre en Manrope 16px 800 Tinta, detalle en 14.5px Piedra Legible y un chip de dato en Papel con Space Grotesk 13.5px 700 Vino Institucional, en píldora. Sirve para servicios (nombre | detalle | dato) y para pasos numerados (número en Space Grotesk 34px Vino Institucional | título + texto | pieza opcional como la píldora mono de alias). Reemplaza la grilla de íconos.

### Franja del dólar (landing)
Al pie del hero, sobre vino, separada por una línea blanca 12%. Cabecera "Dólar hoy" (Manrope 15px 800 blanco) con hora en blanco 60%; cuatro casas en columnas divididas por línea blanca 14% (dos columnas ≤980px). Nombre de casa 12px 700 en mayúsculas blanco 62%; valores Compra/Venta en Space Grotesk 17px 700 tabular, con su rótulo en Manrope 11.5px blanco 62%.

## Do's and Don'ts

### Do:
- **Do** usar Papel (#f4f2ee) como fondo de toda vista autenticada y tarjetas blancas encima.
- **Do** poner montos en Space Grotesk 700 y CBU/números de cuenta en mono dentro de píldora.
- **Do** reservar el Oro Sello (#e8b84b) para una sola acción primaria por zona.
- **Do** usar verde/rojo solo para sentido del dinero y estado.
- **Do** mantener a Ban y los logos de `src/assets` como portadores de la personalidad.
- **Do** en una superficie sin AppLayout (como la landing), repetir los tokens en su propio `.page` con los mismos valores; nunca en `:root` ni con valores nuevos.
- **Do** presentar servicios o pasos como libro mayor: una tarjeta blanca con filas divididas por Línea y el dato en chip Papel, no una grilla de íconos.

### Don't:
- **Don't** introducir grises fríos (#6b7280, #111827, #f9fafb) ni Segoe UI como fuente de trabajo nuevo; son deriva heredada (la landing ya se alineó).
- **Don't** usar el violeta de plantilla de `index.css` (#aa3bff); es residuo de Vite.
- **Don't** usar sombras negras pesadas sobre papel.
- **Don't** usar esquinas rectas o radios menores a 10px en superficies.
- **Don't** llevar los títulos en Space Grotesk de la landing a vistas autenticadas; ahí los títulos son Manrope 800.
