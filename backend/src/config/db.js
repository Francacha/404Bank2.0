require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const verifyDbConnection = async () => {
    const client = await pool.connect();
    client.release();
};

module.exports = { pool, verifyDbConnection };