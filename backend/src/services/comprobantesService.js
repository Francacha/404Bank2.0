const path = require('path');
const PDFDocument = require('pdfkit');

// Comprobante de transferencia en PDF con la identidad de 404Bank (DESIGN.md, "El Libro Mayor Cálido"):
// franja vino con la marca, monto en Space Grotesk, datos en Manrope y la nota de banco simulado.

const FUENTES = path.join(__dirname, '..', '..', 'assets', 'fonts');
const COLOR = {
    wineHero: '#4a0817',
    wineDark: '#2a0410',
    wine: '#7a1128',
    ink: '#1a1512',
    mutedText: '#6f665e',
    paper: '#f4f2ee',
    line: '#e6e2dc',
    green: '#187a4c',
    greenTint: '#e3f0e9',
    red: '#a3312c',
    redTint: '#f6e7e6',
    blancoSuave: '#e9d9dc'
};
const ZONA = 'America/Argentina/Buenos_Aires';
const ANCHO = 595.28;
const MARGEN = 56;
const UTIL = ANCHO - MARGEN * 2;

const formatearImporte = (importe, moneda) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(importe);

const formatearFecha = (fecha) => {
    const dia = fecha.toLocaleDateString('es-AR', { timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric' });
    const hora = fecha.toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dia}, ${hora} h`;
};

const NOMBRE_MONEDA = { ARS: 'Pesos argentinos (ARS)', USD: 'Dólares estadounidenses (USD)' };

// Agrupa el CBU de a 4 para que se pueda leer y dictar: 4040 0012 0000 0012 3456 78
const cbuLegible = (cbu) => (cbu ? String(cbu).replace(/(.{4})/g, '$1 ').trim() : '—');

/**
 * datos: { transaccionId, fechaHora (Date en UTC), importe, moneda, estado, cbuOrigen, cbuDestino,
 *          nombreOrigen, nombreDestino, direccion: 'enviaste' | 'recibiste' }
 */
const generarComprobanteTransferencia = (datos) => {
    const {
        transaccionId, fechaHora, importe, moneda, estado,
        cbuOrigen, cbuDestino, nombreOrigen, nombreDestino, direccion
    } = datos;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 0,
            info: { Title: `Comprobante ${transaccionId} · 404Bank`, Author: '404Bank' }
        });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.registerFont('Manrope-SemiBold', path.join(FUENTES, 'manrope-latin-600-normal.woff'));
        doc.registerFont('Manrope-Bold', path.join(FUENTES, 'manrope-latin-700-normal.woff'));
        doc.registerFont('Manrope-ExtraBold', path.join(FUENTES, 'manrope-latin-800-normal.woff'));
        doc.registerFont('Grotesk-Medium', path.join(FUENTES, 'space-grotesk-latin-500-normal.woff'));
        doc.registerFont('Grotesk-Bold', path.join(FUENTES, 'space-grotesk-latin-700-normal.woff'));

        const aprobada = estado === 'aprobada';
        const recibiste = direccion === 'recibiste';

        // ── Franja vino con la marca ──
        const franja = doc.linearGradient(0, 0, ANCHO, 150);
        franja.stop(0, COLOR.wineHero).stop(0.55, COLOR.wineDark).stop(1, '#150208');
        doc.rect(0, 0, ANCHO, 150).fill(franja);

        doc.font('Grotesk-Bold').fontSize(30).fillColor('#ffffff')
            .text('404', MARGEN, 52, { continued: true, lineBreak: false })
            .font('Manrope-SemiBold').text('Bank', { lineBreak: false });

        doc.font('Manrope-Bold').fontSize(11).fillColor(COLOR.blancoSuave)
            .text('Comprobante de transferencia', MARGEN, 98);

        // ── Monto ──
        let y = 192;
        doc.font('Manrope-Bold').fontSize(12).fillColor(COLOR.mutedText)
            .text(recibiste ? 'Recibiste' : 'Enviaste', MARGEN, y);

        // Chip de estado, a la derecha de la línea de dirección
        const textoEstado = aprobada ? 'Aprobada' : String(estado).charAt(0).toUpperCase() + String(estado).slice(1);
        doc.font('Manrope-ExtraBold').fontSize(10);
        const anchoChip = doc.widthOfString(textoEstado) + 24;
        doc.roundedRect(MARGEN + UTIL - anchoChip, y - 4, anchoChip, 22, 11)
            .fill(aprobada ? COLOR.greenTint : COLOR.redTint);
        doc.fillColor(aprobada ? COLOR.green : COLOR.red)
            .text(textoEstado, MARGEN + UTIL - anchoChip, y + 2, { width: anchoChip, align: 'center' });

        y += 22;
        doc.font('Grotesk-Bold').fontSize(40).fillColor(recibiste ? COLOR.green : COLOR.ink)
            .text(`${recibiste ? '+ ' : ''}${formatearImporte(importe, moneda)}`, MARGEN, y);

        y += 62;
        doc.font('Manrope-SemiBold').fontSize(11).fillColor(COLOR.mutedText)
            .text(formatearFecha(fechaHora), MARGEN, y);

        // ── De / Para en dos columnas ──
        y += 40;
        doc.moveTo(MARGEN, y).lineTo(MARGEN + UTIL, y).lineWidth(1).strokeColor(COLOR.line).stroke();
        y += 24;

        const columna = UTIL / 2 - 12;
        const bloque = (x, etiqueta, nombre, cbu) => {
            doc.font('Manrope-Bold').fontSize(10).fillColor(COLOR.mutedText).text(etiqueta, x, y);
            doc.font('Manrope-ExtraBold').fontSize(14).fillColor(COLOR.ink)
                .text(nombre || 'Cuenta de otro banco', x, y + 18, { width: columna });
            const altoNombre = doc.heightOfString(nombre || 'Cuenta de otro banco', { width: columna });
            doc.font('Grotesk-Medium').fontSize(11).fillColor(COLOR.ink)
                .text(cbuLegible(cbu), x, y + 24 + altoNombre, { width: columna, characterSpacing: 0.3 });
            return 24 + altoNombre + 18;
        };
        const altoDe = bloque(MARGEN, 'De', nombreOrigen, cbuOrigen);
        const altoPara = bloque(MARGEN + UTIL / 2 + 12, 'Para', nombreDestino, cbuDestino);
        y += Math.max(altoDe, altoPara) + 22;

        doc.moveTo(MARGEN, y).lineTo(MARGEN + UTIL, y).lineWidth(1).strokeColor(COLOR.line).stroke();
        y += 22;

        // ── Detalle ──
        const fila = (etiqueta, valor, fuenteValor = 'Manrope-Bold') => {
            doc.font('Manrope-Bold').fontSize(11).fillColor(COLOR.mutedText).text(etiqueta, MARGEN, y);
            doc.font(fuenteValor).fontSize(11).fillColor(COLOR.ink)
                .text(valor, MARGEN + 160, y, { width: UTIL - 160, align: 'right' });
            y += 30;
        };
        fila('Moneda', NOMBRE_MONEDA[moneda] || moneda);
        fila('Número de operación', transaccionId, 'Grotesk-Medium');

        // ── Nota de alcance honesto ──
        y += 18;
        doc.roundedRect(MARGEN, y, UTIL, 74, 14).fill(COLOR.paper);
        doc.font('Manrope-ExtraBold').fontSize(11).fillColor(COLOR.ink)
            .text('Banco simulado', MARGEN + 20, y + 16);
        doc.font('Manrope-SemiBold').fontSize(10).fillColor(COLOR.mutedText)
            .text(
                '404Bank es un proyecto académico de Práctica Profesionalizante I. No opera con dinero real y este comprobante no tiene validez legal.',
                MARGEN + 20, y + 34, { width: UTIL - 40, lineGap: 2 }
            );

        // ── Pie ──
        doc.moveTo(MARGEN, 770).lineTo(MARGEN + UTIL, 770).lineWidth(1).strokeColor(COLOR.line).stroke();
        doc.font('Manrope-SemiBold').fontSize(9).fillColor(COLOR.mutedText)
            .text('Generado automáticamente por 404Bank. No requiere firma ni sello.', MARGEN, 784, { width: UTIL - 120 });
        doc.font('Grotesk-Bold').fontSize(9).fillColor(COLOR.wine)
            .text('404Bank', MARGEN + UTIL - 120, 784, { width: 120, align: 'right' });

        doc.end();
    });
};

module.exports = { generarComprobanteTransferencia };
