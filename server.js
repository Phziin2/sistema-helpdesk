const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const porta = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_PStr9DTXzEg5@ep-blue-darkness-aczlsnbo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// INICIALIZANDO O BANCO
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
        console.log('☁️ Banco de Dados PostgreSQL conectado com sucesso!');
    } catch (erro) {
        console.error('❌ Erro ao conectar no banco:', erro);
    }
}
inicializarBanco();

// ==========================================
// SISTEMA DE LOGIN E SENHAS
// ==========================================
const senhasDepartamentos = {
    'Elétrica': '110010',
    'Mecânica': '110020',
    'Coordenador': '110040',
    'Qualidade': '110030'
};

app.post('/api/login', (req, res) => {
    const { departamento, senha } = req.body;

    // Verifica se a senha enviada bate com a senha do cofre
    if (senhasDepartamentos[departamento] === senha) {
        res.json({ sucesso: true });
    } else {
        res.status(401).json({ sucesso: false, mensagem: 'Senha incorreta!' });
    }
});

// ==========================================
// ROTAS DO HELP DESK
// ==========================================

app.post('/api/chamados/abrir', async (req, res) => {
    const id = Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
    const { adminDestino, maquina, problema } = req.body;
    try {
        await pool.query(
            `INSERT INTO chamados (id, adminDestino, maquina, problema, status) VALUES ($1, $2, $3, $4, $5)`,
            [id, adminDestino, maquina, problema, 'AGUARDANDO']
        );
        res.send(id);
    } catch (error) { res.status(500).send("Erro"); }
});

app.get('/api/chamados/pendente/:admin', async (req, res) => {
    const admin = req.params.admin;
    const result = await pool.query(`SELECT * FROM chamados WHERE adminDestino = $1 AND status = 'AGUARDANDO'`, [admin]);
    if (result.rows.length > 0) res.json(result.rows[0]);
    else res.status(204).send();
});

app.post('/api/chamados/atender/:id', async (req, res) => {
    const id = req.params.id;
    await pool.query(`UPDATE chamados SET status = 'A_CAMINHO' WHERE id = $1`, [id]);
    res.sendStatus(200);
});

app.post('/api/chamados/resolver/:id', async (req, res) => {
    const id = req.params.id;
    await pool.query(`UPDATE chamados SET status = 'RESOLVIDO' WHERE id = $1`, [id]);
    res.sendStatus(200);
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

app.get('/api/chamados/historico', async (req, res) => {
    const result = await pool.query(`SELECT * FROM chamados ORDER BY data_abertura DESC LIMIT 500`);
    res.json(result.rows);
});

app.listen(porta, () => {
    console.log(`\n✅ SISTEMA ONLINE! Rodando na porta ${porta}`);
});