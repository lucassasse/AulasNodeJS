const express = require('express');
const { pool } = require('./config/db'); // importa a pool de conexões com o banco de dados
const app = express();

// ====================== PRODUTOS ======================

// Rota GET - /produtos
// Retorna todas as linhas e colunas da tabela 'produtos' - SELECT * FROM produtos
app.get('/produtos', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM produtos');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar produtos:', error);
    res.status(500).json({ error: 'Erro ao consultar produtos', details: error.message });
  }
});

// Rota GET - /produtos/:id - consulta um produto específico pelo ID ( : = parâmetro obrigatório e variável )
// Retorna a linha correspondente ao ID fornecido na URL - SELECT * FROM produtos WHERE id_produto = ?
app.get('/produtos/:id', async (req, res) => {
  const produtoId = req.params.id; // obtém o ID do produto dos parâmetros da URL
  try {
    const [rows] = await pool.execute('SELECT * FROM produtos WHERE id_produto = ?', [produtoId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(rows[0]); // retorna o primeiro (e único) resultado
  } catch (error) {
    console.error('Erro ao consultar produto:', error);
    res.status(500).json({ error: 'Erro ao consultar produto', details: error.message });
  }
});

// Rota GET - /produtos/categoria/:id_categoria ( : = parâmetro obrigatório e variável )
// Retorna todos os produtos que pertencem a uma categoria específica - SELECT * FROM produtos WHERE categoria = ?
app.get('/produtos/categoria/:id_categoria', async (req, res) => {
  const id_categoria = req.params.id_categoria; // obtém o ID da categoria dos parâmetros da URL
  try {
    const [rows] = await pool.execute('SELECT nome, descrição, material, tamanho, peso, estoque_atual FROM produtos WHERE id_categoria = ?', [id_categoria]);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar produtos por categoria:', error);
    res.status(500).json({ error: 'Erro ao consultar produtos por categoria', details: error.message });
  }
});

// Rota GET para /produtos-com-categoria - consulta produtos com informações da categoria (JOIN)
// Retorna produtos com nome da categoria - SELECT produtos.*, categorias.nome as categoria_nome FROM produtos LEFT JOIN categorias
app.get('/produtos-com-categoria', async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.nome as categoria_nome
      FROM produtos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.ativo = 1
      ORDER BY p.nome
    `;
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar produtos com categoria:', error);
    res.status(500).json({ error: 'Erro ao consultar produtos com categoria', details: error.message });
  }
});

// Rota GET para /produtos/estoque-baixo - consulta produtos com estoque baixo
// Retorna produtos onde estoque_atual <= estoque_minimo
app.get('/produtos/estoque-baixo', async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.nome as categoria_nome
      FROM produtos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.estoque_atual <= p.estoque_minimo AND p.ativo = 1
      ORDER BY p.estoque_atual ASC
    `;
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar produtos com estoque baixo:', error);
    res.status(500).json({ error: 'Erro ao consultar produtos com estoque baixo', details: error.message });
  }
});

// ====================== CATEGORIAS ======================

// Rota GET - /categorias
// Retorna somente a coluna 'nome' da tabela 'categorias' - SELECT nome FROM categorias
app.get('/categorias', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT nome FROM categorias');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar categorias:', error);
    res.status(500).json({ error: 'Erro ao consultar categorias', details: error.message });
  }
});

// Rota GET para /categorias/:id - consulta uma categoria específica pelo ID ( : = parâmetro obrigatório e variável )
// Retorna a categoria correspondente ao ID fornecido - SELECT * FROM categorias WHERE id_categoria = ?
app.get('/categorias/:id', async (req, res) => {
  const categoriaId = req.params.id;
  try {
    const [rows] = await pool.execute('SELECT * FROM categorias WHERE id_categoria = ?', [categoriaId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao consultar categoria:', error);
    res.status(500).json({ error: 'Erro ao consultar categoria', details: error.message });
  }
});

// ====================== MOVIMENTAÇÕES ======================

// Rota GET para /movimentacoes - consulta todas as movimentações
// Retorna todas as movimentações de estoque - SELECT * FROM movimentacoes
app.get('/movimentacoes', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM movimentacoes ORDER BY data_movimentacao DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar movimentações:', error);
    res.status(500).json({ error: 'Erro ao consultar movimentações', details: error.message });
  }
});

// Rota GET para /movimentacoes/:id - consulta uma movimentação específica pelo ID
// Retorna a movimentação correspondente ao ID fornecido - SELECT * FROM movimentacoes WHERE id_movimentacao = ?
app.get('/movimentacoes/:id', async (req, res) => {
  const movimentacaoId = req.params.id;
  try {
    const [rows] = await pool.execute('SELECT * FROM movimentacoes WHERE id_movimentacao = ?', [movimentacaoId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Movimentação não encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao consultar movimentação:', error);
    res.status(500).json({ error: 'Erro ao consultar movimentação', details: error.message });
  }
});

// Rota GET para /movimentacoes/produto/:id_produto - consulta movimentações de um produto específico
// Retorna todas as movimentações de um produto - SELECT * FROM movimentacoes WHERE id_produto = ?
app.get('/movimentacoes/produto/:id_produto', async (req, res) => {
  const produtoId = req.params.id_produto;
  try {
    const [rows] = await pool.execute('SELECT * FROM movimentacoes WHERE id_produto = ? ORDER BY data_movimentacao DESC', [produtoId]);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar movimentações do produto:', error);
    res.status(500).json({ error: 'Erro ao consultar movimentações do produto', details: error.message });
  }
});

// ====================== ESTOQUE / HISTORICO ======================

// Rota GET para /historico-estoque - consulta todo o histórico de estoque
// Retorna todo o histórico de estoque - SELECT * FROM histórico_estoque
app.get('/historico-estoque', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM histórico_estoque ORDER BY id_historico DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar histórico de estoque:', error);
    res.status(500).json({ error: 'Erro ao consultar histórico de estoque', details: error.message });
  }
});

// Rota GET para /historico-estoque/:id - consulta um registro específico do histórico
// Retorna um registro específico do histórico - SELECT * FROM histórico_estoque WHERE id_historico = ?
app.get('/historico-estoque/:id', async (req, res) => {
  const historicoId = req.params.id;
  try {
    const [rows] = await pool.execute('SELECT * FROM histórico_estoque WHERE id_historico = ?', [historicoId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registro de histórico não encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao consultar histórico de estoque:', error);
    res.status(500).json({ error: 'Erro ao consultar histórico de estoque', details: error.message });
  }
});

// Rota GET para /historico-estoque/produto/:id_produto - consulta histórico de um produto específico
// Retorna o histórico de estoque de um produto através das movimentações
app.get('/historico-estoque/produto/:id_produto', async (req, res) => {
  const produtoId = req.params.id_produto;
  try {
    const query = `
      SELECT h.*, m.tipo, m.quantidade, m.data_movimentacao, m.observacao
      FROM histórico_estoque h
      INNER JOIN movimentacoes m ON h.id_movimentacao = m.id_movimentacao
      WHERE m.id_produto = ?
      ORDER BY m.data_movimentacao DESC
    `;
    const [rows] = await pool.execute(query, [produtoId]);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar histórico do produto:', error);
    res.status(500).json({ error: 'Erro ao consultar histórico do produto', details: error.message });
  }
});

// Rota GET para /movimentacoes-completas - consulta movimentações com informações do produto
// Retorna movimentações com dados do produto - JOIN entre movimentacoes e produtos
app.get('/movimentacoes-completas', async (req, res) => {
  try {
    const query = `
      SELECT m.*, p.nome as produto_nome, p.descrição as produto_descricao, c.nome as categoria_nome
      FROM movimentacoes m
      INNER JOIN produtos p ON m.id_produto = p.id_produto
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      ORDER BY m.data_movimentacao DESC
    `;
    const [rows] = await pool.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar movimentações completas:', error);
    res.status(500).json({ error: 'Erro ao consultar movimentações completas', details: error.message });
  }
});

module.exports = app;