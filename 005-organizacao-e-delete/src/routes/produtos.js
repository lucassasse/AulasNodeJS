const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

// ====================== PRODUTOS ======================

// Rota GET - /produtos
// Retorna todas as linhas e colunas da tabela 'produtos' - SELECT * FROM produtos
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.get('/categoria/:id_categoria', async (req, res) => {
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
router.get('/com-categoria', async (req, res) => {
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
router.get('/estoque-baixo', async (req, res) => {
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


// Rota DELETE - /produtos/:id - exclui um produto (delete simples)
router.delete('/:id', async (req, res) => {
  const produtoId = req.params.id;
  try {
    // Verifica se o produto existe
    const [produto] = await pool.execute('SELECT * FROM produtos WHERE id_produto = ?', [produtoId]);
    if (produto.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    // Exclui o produto
    await pool.execute('DELETE FROM produtos WHERE id_produto = ?', [produtoId]);
    res.json({ message: 'Produto excluído com sucesso', id: produtoId });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro ao excluir produto', details: error.message });
  }
});


module.exports = router;
