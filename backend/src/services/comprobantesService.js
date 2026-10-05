const PDFDocument = require('pdfkit');

// Arma el PDF de un comprobante de transferencia y lo devuelve como Buffer.
const generarComprobanteTransferencia = (datos) => {
    const {
        transaccionId,
        fechaHora,
        importe,
        moneda,
        estado,
        cbuOrigen,
        cbuDestino,
        nombreOrigen,
        nombreDestino
    } = datos;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const wine = '#7a1128';
        const ink = '#1a1512';
        const muted = '#8a8078';
        const line = '#e4e0da';

        // Encabezado
        doc
            .fillColor(wine)
            .font('Helvetica-Bold')
            .fontSize(26)
            .text('404', 50, 50, { continued: true })
            .fillColor(ink)
            .text('Bank');

        doc
            .fillColor(muted)
            .font('Helvetica')
            .fontSize(10)
            .text('Comprobante de transferencia', 50, 82);

        doc
            .moveTo(50, 105)
            .lineTo(545, 105)
            .strokeColor(line)
            .lineWidth(1)
            .stroke();

        // Estado + número de operación
        doc
            .fillColor(estado === 'aprobada' ? '#1e8e5a' : '#991b1b')
            .font('Helvetica-Bold')
            .fontSize(12)
            .text(estado === 'aprobada' ? 'TRANSFERENCIA APROBADA' : `TRANSFERENCIA ${String(estado).toUpperCase()}`, 50, 125);

        doc
            .fillColor(muted)
            .font('Helvetica')
            .fontSize(9)
            .text(`N° de operación: ${transaccionId}`, 50, 145)
            .text(`Fecha y hora: ${new Date(fechaHora).toLocaleString('es-AR')}`, 50, 160);

        // Monto destacado
        doc
            .fillColor(ink)
            .font('Helvetica-Bold')
            .fontSize(32)
            .text(
                new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(importe),
                50,
                195
            );

        // Tabla de datos
        let y = 260;
        const fila = (label, valor) => {
            doc
                .fillColor(muted)
                .font('Helvetica')
                .fontSize(9)
                .text(label.toUpperCase(), 50, y);
            doc
                .fillColor(ink)
                .font('Helvetica-Bold')
                .fontSize(11)
                .text(valor || '—', 50, y + 13);
            doc
                .moveTo(50, y + 36)
                .lineTo(545, y + 36)
                .strokeColor(line)
                .lineWidth(0.5)
                .stroke();
            y += 50;
        };

        fila('Origen', nombreOrigen ? `${nombreOrigen} · ${cbuOrigen}` : cbuOrigen);
        fila('Destino', nombreDestino ? `${nombreDestino} · ${cbuDestino}` : cbuDestino);
        fila('Moneda', moneda);
        fila('Estado', estado);

        // Pie
        doc
            .fillColor(muted)
            .font('Helvetica')
            .fontSize(8)
            .text(
                'Este comprobante fue generado automáticamente por 404Bank y no requiere firma ni sello.',
                50,
                740,
                { width: 495, align: 'center' }
            );

        doc.end();
    });
};

module.exports = { generarComprobanteTransferencia };
