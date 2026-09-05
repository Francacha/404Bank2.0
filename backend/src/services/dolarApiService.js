/*Servicio para consumir la cotización en vivo desde DolarApi sin requerir API keys.*/
const axios = require('axios');

const DOLAR_API_URL = 'https://dolarapi.com/v1/dolares/oficial';

/**
 * Obtiene la cotización oficial del dólar desde DolarApi.
 * @returns {Promise<{compra: number, venta: number, fechaActualizacion: string}>}
 */
const obtenerCotizacionOficial = async () => {
    try {
        const response = await axios.get(DOLAR_API_URL);
        return {
            compra: response.data.compra, // Cotización para cuando el cliente vende USD -> recibe ARS
            venta: response.data.venta,   // Cotización para cuando el cliente compra USD -> entrega ARS
            fechaActualizacion: response.data.fechaActualizacion
        };
    } catch (error) {
        console.error('Error al consultar DolarApi:', error.message);
        throw new Error('No se pudo obtener la cotización del dólar en este momento.');
    }
};

module.exports = { obtenerCotizacionOficial };