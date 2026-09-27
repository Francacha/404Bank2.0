const axios = require('axios');

const BASE_URL = process.env.CENTRAL_BANK_URL;
const API_KEY = process.env.CENTRAL_BANK_API_KEY;
const ENV = process.env.CENTRAL_BANK_ENV || 'test';

const headers = () => ({
    'x-api-key': API_KEY,
    'x-environment': ENV,
    'Content-Type': 'application/json'
});

const registrarPersona = async (nombre, apellido, dni) => {
    const res = await axios.post(`${BASE_URL}/persons`, { nombre, apellido, dni }, { headers: headers() });
    return res.data; // { cbu, nombre, apellido, dni, message }
};

const abrirCajaAhorro = async (dni, moneda = 'USD') => {
    const res = await axios.post(
        `${BASE_URL}/accounts`,
        { dni, moneda },
        { headers: headers() }
    );
    return {
        status: res.status,
        data: res.data
    };
};

const asignarAlias = async (cbu, alias) => {
    const res = await axios.put(`${BASE_URL}/persons/${cbu}/alias`, { alias }, { headers: headers() });
    return res.data;
};

const buscarPorCbu = async (cbu) => {
    const res = await axios.get(`${BASE_URL}/persons/${cbu}`, { headers: headers() });
    return res.data;
};

const buscarPorAlias = async (alias) => {
    const res = await axios.get(`${BASE_URL}/persons/alias/${alias}`, { headers: headers() });
    return res.data;
};

const realizarTransferencia = async (cbuOrigen, cbuDestino, importe, saldoOrigen) => {
    const res = await axios.post(
        `${BASE_URL}/transactions`,
        { cbuOrigen, cbuDestino, importe, saldoOrigen },
        { headers: headers() }
    );
    return res.data;
};

const obtenerTransacciones = async (minutos = 30) => {
    const res = await axios.get(`${BASE_URL}/transactions`, {
        headers: headers(),
        params: { minutos }
    });
    return res.data;
};

const obtenerSituacionCrediticia = async (dni) => {
    try {
        const res = await axios.get(`${BASE_URL}/central-deudores/${dni}`, {
            headers: headers()
        });
        return res.data; // Devuelve { dni, situacion, deudas: [...] }
    } catch (error) {
        // Si responde 404, significa que el DNI no registra deudas (Situación 1: Normal)
        if (error.response && error.response.status === 404) {
            return { dni, situacion: 1, deudas: [] };
        }
        throw error;
    }
};

const informarDeuda = async (dni, monto, situacion) => {
    const res = await axios.post(
        `${BASE_URL}/central-deudores`,
        { 
            dni: String(dni), 
            monto: Number(monto), 
            situacion: Number(situacion) 
        },
        { headers: headers() }
    );
    return res.data; // Devuelve 200 (actualización) o 201 (primera vez)
};

module.exports = {
    registrarPersona,
    abrirCajaAhorro,
    asignarAlias,
    buscarPorCbu,
    buscarPorAlias,
    realizarTransferencia,
    obtenerTransacciones,
    // Exportamos las dos nuevas funciones
    obtenerSituacionCrediticia,
    informarDeuda
};
