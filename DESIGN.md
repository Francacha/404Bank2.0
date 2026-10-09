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
  green: "#1e8e5a"
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
---

# Design System: 404Bank

## Overview

**Creative North Star: "El Libro Mayor Cálido"**

404Bank se ve como un libro mayor bancario moderno: cifras claras sobre papel cálido, con el vino como firma institucional. La app es un shell de dos zonas — una barra lateral vino profundo que da peso y confianza, y un área de trabajo color papel donde viven tarjetas blancas con los datos. El oro aparece solo donde está la acción principal; el resto es tinta cálida, gris piedra y blanco.

La densidad es cómoda, no aireada: tipografía chica pero pesada (13–15px en 600–800), números grandes en Space Grotesk para saldos y montos. Las formas son suaves y seguras de sí — esquinas generosas, píldoras para chips y toggles, avatares circulares. La personalidad (Ban, el "404") vive en la marca y el copy; la interfaz de tareas se mantiene directa.

El sistema normativo es el de la app autenticada. La landing (`Landing.module.css`: fondo blanco, Segoe UI, grises Tailwind) es una deriva previa y se alinea a este sistema cuando se toque.

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
- **Vino Marca** (#4f0919): el color de marca fijado en PRODUCT.md; logo, íconos de la landing, inicio del gradiente del hero de saldo (≈ #4a0817).
- **Vino Bodega** (#2a0410) y **Vino Noche** (#150208): gradiente vertical de la barra lateral y del hero de saldo; texto sobre oro.

### Secondary
- **Oro Sello** (#e8b84b): botón primario sobre vino, avatar del usuario en la sidebar. Nunca como fondo de superficies grandes.

### Tertiary
- **Verde Acreditado** (#1e8e5a): ingresos, éxito, estados activos.
- **Rojo Débito** (#a3312c): egresos, mora, errores, cuentas bloqueadas.

### Neutral
- **Tinta Cálida** (#1a1512): texto principal y títulos.
- **Piedra** (#8a8078): solo decoración y texto grande o deshabilitado (3.9:1 sobre blanco, no alcanza AA en texto chico).
- **Piedra Legible** (#6f665e): subtítulos, etiquetas, pistas y metadatos en texto chico (5.6:1 sobre blanco, 5.0:1 sobre papel).
- **Papel** (#f4f2ee): fondo del área de trabajo y relleno de inputs.
- **Blanco Tarjeta** (#ffffff): superficies de tarjetas y botones fantasma.
- **Línea** (rgba(26, 21, 18, 0.08)): bordes de chips, inputs y divisores.

### Named Rules
**The One Gold Rule.** El oro marca la acción principal de una vista — una sola por zona. Si dos cosas son oro, ninguna es primaria.

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

### Named Rules
**The Figures Lead Rule.** Todo monto importante usa Space Grotesk; el texto que lo rodea se achica y se aclara para que la cifra mande.

## Layout

Shell de dos columnas: sidebar fija de 264px (sticky, alto completo) y main fluido con padding 36px 44px 60px y gap vertical de 28px entre bloques. El contenido se organiza en un hero de saldo a ancho completo seguido de grillas de paneles (p. ej. `1.1fr 1.3fr 1fr`, gap 20px). Espaciado interno típico: 24px en tarjetas, 12px entre acciones, 6px en controles segmentados.

Breakpoints observados: 980px (grillas colapsan) y 640px (móvil; la sidebar deja de ser lateral). Valores puntuales en 720/860/900/1220px existen por página y no forman escala.

## Elevation & Depth

Mayormente plano con capas tonales: papel → tarjeta blanca → hero vino. Las tarjetas llevan una sombra ambiental casi imperceptible; la profundidad real la da el contraste vino/papel, no la sombra.

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
- **Secciones sin implementar** (Recargas, Cambio de Contraseña) se muestran deshabilitadas con "(próximamente)", nunca como botones que no hacen nada.
- **Tokens:** `.page` del shell (`AppLayout.module.css`) es la única fuente de los tokens de color en las páginas de cliente; ningún CSS de página redefine `:root`. Además de los colores de arriba expone `--red-tint`, `--green-tint` (fondos suaves de error/éxito), `--shadow-lift` (sombra Elevada vino) y `--focus-ring`.

### Hero de saldo (signature)
Bloque vino a ancho completo: etiqueta en mayúsculas blanco 60%, saldo en Display, CBU en píldora mono, tabs ARS/USD segmentados y fila de acciones (oro primaria + secundarias translúcidas).

## Do's and Don'ts

### Do:
- **Do** usar Papel (#f4f2ee) como fondo de toda vista autenticada y tarjetas blancas encima.
- **Do** poner montos en Space Grotesk 700 y CBU/números de cuenta en mono dentro de píldora.
- **Do** reservar el Oro Sello (#e8b84b) para una sola acción primaria por zona.
- **Do** usar verde/rojo solo para sentido del dinero y estado.
- **Do** mantener a Ban y los logos de `src/assets` como portadores de la personalidad.

### Don't:
- **Don't** introducir grises fríos (#6b7280, #111827, #f9fafb) ni Segoe UI como fuente de trabajo nuevo; son deriva de la landing.
- **Don't** usar el violeta de plantilla de `index.css` (#aa3bff); es residuo de Vite.
- **Don't** usar sombras negras pesadas sobre papel.
- **Don't** usar esquinas rectas o radios menores a 10px en superficies.
