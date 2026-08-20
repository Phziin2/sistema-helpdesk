const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Importa o PostgreSQL da nuvem

const app = express();
const porta = 3000;

// Sua chave de conexão real do Neon conectada!
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PStr9DTXzEg5@ep-blue-darkness-aczlsnbo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. INICIALIZANDO O BANCO DE DADOS NA NUVEM
async function inicializarBanco() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chamados (
                id TEXT PRIMARY KEY,
                adminDestino TEXT,
                maquina TEXT,
                problema TEXT,
                status TEXT,
                data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('☁️ Banco de Dados PostgreSQL (Neon) conectado com sucesso!');
    } catch (erro) {
        console.error('❌ Erro ao conectar no banco:', erro);
    }
}
inicializarBanco();

// 2. ROTAS DA API

app.post('/api/chamados/abrir', async (req, res) => {
    const id = Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
    const { adminDestino, maquina, problema } = req.body;

    console.log(`\n🚨 [NOVO CHAMADO NA NUVEM] -> Para: ${adminDestino} | Máquina: ${maquina}`);

    await pool.query(
        `INSERT INTO chamados (id, adminDestino, maquina, problema, status) VALUES ($1, $2, $3, $4, $5)`,
        [id, adminDestino, maquina, problema, 'AGUARDANDO']
    );
    res.send(id);
});

app.get('/api/chamados/pendente/:admin', async (req, res) => {
    const admin = req.params.admin;
    const result = await pool.query(`SELECT * FROM chamados WHERE adminDestino = $1 AND status = 'AGUARDANDO'`, [admin]);
    if (result.rows.length > 0) res.json(result.rows[0]);
    else res.status(204).send();
});

app.post('/api/chamados/atender/:id', async (req, res) => {
    const id = req.params.id;
    const result = await pool.query(`UPDATE chamados SET status = 'A_CAMINHO' WHERE id = $1`, [id]);
    if (result.rowCount > 0) res.sendStatus(200);
    else res.sendStatus(404);
});

app.post('/api/chamados/resolver/:id', async (req, res) => {
    const id = req.params.id;
    const result = await pool.query(`UPDATE chamados SET status = 'RESOLVIDO' WHERE id = $1`, [id]);
    if (result.rowCount > 0) res.sendStatus(200);
    else res.sendStatus(404);
});

app.get('/api/chamados/status/:id', async (req, res) => {
    const id = req.params.id;
    const result = await pool.query(`SELECT status FROM chamados WHERE id = $1`, [id]);
    if (result.rows.length > 0) res.send(result.rows[0].status);
    else res.sendStatus(404);
});

app.get('/api/chamados/todos', async (req, res) => {
    const result = await pool.query(`SELECT * FROM chamados WHERE status != 'RESOLVIDO' ORDER BY data_abertura DESC`);
    res.json(result.rows);
});

app.listen(porta, () => {
    console.log(`\n✅ SISTEMA DE SUPORTE ONLINE!`);
    console.log(`🌐 Dashboard: http://localhost:${porta}/index.html`);
});