// aqui ficam as configurações de conexão com o banco de dados

const mysql = require("mysql2/promise"); // importa a biblioteca mysql2 na variável mysql
require("dotenv").config(); // importa e configura o dotenv para ler as variáveis de ambiente do arquivo .env

// cria uma pool de conexões (se conecta ao banco de dados) usando as variáveis de ambiente (.env)
// pool: um conjunto de conexões que podem ser reutilizadas, melhorando a performance
// podem haver múltiplas conexões abertas ao mesmo tempo (varios bancos e usuários ao mesmo tempo)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 15,
  queueLimit: 0
});

// função para testar a conexão com o banco de dados
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping(); // testa se a conexão está ativa
    connection.release(); // libera a conexão de volta para a pool
    return { success: true, message: "Conexão com o banco de dados bem-sucedida!" };
  } catch (error) {
    return { success: false, message: `Falha na conexão: ${error.message}` };
  }
}

module.exports = { pool, testConnection }; // exporta a pool e a função de teste para serem usadas em outros arquivos