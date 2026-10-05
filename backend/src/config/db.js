require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false },
});

const verifyDbConnection = async () => {
<<<<<<< HEAD
    const client = await pool.connect();
    client.release();
=======
    await pool.query('SELECT 1');
>>>>>>> 5c981e31c9be347b589c8fe476ccdda89e3bb55d
};

module.exports = { pool, verifyDbConnection };
