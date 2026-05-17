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

module.exports = {
    registrarPersona,
    asignarAlias,
    buscarPorCbu,
    buscarPorAlias,
    realizarTransferencia,
    obtenerTransacciones
};
