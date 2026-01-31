const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

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

// Rota DELETE - /produtos/:id - desativa um produto (soft delete)
// Define ativo = 0 para o produto, mantendo histórico de movimentações
router.delete('/:id', async (req, res) => {
  const produtoId = req.params.id;
  
  try {
    // Primeiro verifica se o produto existe
    const [produto] = await pool.execute('SELECT * FROM produtos WHERE id_produto = ?', [produtoId]);
    if (produto.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verifica se o produto já está inativo
    if (produto[0].ativo === 0) {
      return res.status(400).json({ 
        error: 'Produto já está inativo',
        message: 'Este produto já foi desativado anteriormente'
      });
    }

    // Realiza o soft delete (desativa o produto)
    const [result] = await pool.execute('UPDATE produtos SET ativo = 0 WHERE id_produto = ?', [produtoId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ 
      message: 'Produto desativado com sucesso',
      produto: produto[0].nome,
      id: produtoId,
      observacao: 'O produto foi desativado mas mantém seu histórico de movimentações'
    });

  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({ error: 'Erro ao desativar produto', details: error.message });
  }
});

// Rota DELETE - /produtos/:id/permanente - exclusão permanente de produto
// Remove completamente o produto e suas dependências (usar com cuidado!)
router.delete('/:id/permanente', async (req, res) => {
  const produtoId = req.params.id;
  
  try {
    // Primeiro verifica se o produto existe
    const [produto] = await pool.execute('SELECT * FROM produtos WHERE id_produto = ?', [produtoId]);
    if (produto.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verifica se existem movimentações vinculadas
    const [movimentacoes] = await pool.execute('SELECT COUNT(*) as total FROM movimentacoes WHERE id_produto = ?', [produtoId]);
    if (movimentacoes[0].total > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir permanentemente o produto',
        message: `Existem ${movimentacoes[0].total} movimentação(ões) vinculada(s) a este produto. Use a rota de desativação (soft delete) em vez da exclusão permanente.`
      });
    }

    // Se não há movimentações, procede com a exclusão permanente
    const [result] = await pool.execute('DELETE FROM produtos WHERE id_produto = ?', [produtoId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ 
      message: 'Produto excluído permanentemente com sucesso',
      produto: produto[0].nome,
      id: produtoId,
      warning: 'Esta ação é irreversível'
    });

  } catch (error) {
    console.error('Erro ao excluir permanentemente produto:', error);
    res.status(500).json({ error: 'Erro ao excluir permanentemente produto', details: error.message });
  }
});

// Rota POST - /produtos - cria um novo produto
// Insere um novo produto na tabela 'produtos' - INSERT INTO produtos (...) VALUES (...)
router.post('/', async (req, res) => {
  const { 
    nome, 
    descrição, 
    id_categoria, 
    material, 
    tamanho, 
    peso, 
    estoque_atual, 
    estoque_minimo 
  } = req.body;

  // Validação de dados obrigatórios
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ 
      error: 'Nome do produto é obrigatório',
      message: 'Forneça um nome válido para o produto'
    });
  }

  if (!estoque_minimo || estoque_minimo < 0) {
    return res.status(400).json({ 
      error: 'Estoque mínimo é obrigatório',
      message: 'Forneça um valor válido para o estoque mínimo (maior ou igual a 0)'
    });
  }

  // Valida dados opcionais
  const nomeProduto = nome.trim();
  if (nomeProduto.length > 200) {
    return res.status(400).json({ 
      error: 'Nome muito longo',
      message: 'O nome do produto deve ter no máximo 200 caracteres'
    });
  }

  if (material && material.length > 100) {
    return res.status(400).json({ 
      error: 'Material muito longo',
      message: 'O material deve ter no máximo 100 caracteres'
    });
  }

  if (tamanho && tamanho.length > 50) {
    return res.status(400).json({ 
      error: 'Tamanho muito longo',
      message: 'O tamanho deve ter no máximo 50 caracteres'
    });
  }

  if (peso && (peso < 0 || peso > 999999.99)) {
    return res.status(400).json({ 
      error: 'Peso inválido',
      message: 'O peso deve estar entre 0 e 999999.99'
    });
  }

  const estoqueAtual = estoque_atual || 0;
  if (estoqueAtual < 0) {
    return res.status(400).json({ 
      error: 'Estoque atual inválido',
      message: 'O estoque atual não pode ser negativo'
    });
  }

  try {
    // Verifica se a categoria existe (se foi fornecida)
    if (id_categoria) {
      const [categoriaExistente] = await pool.execute('SELECT * FROM categorias WHERE id_categoria = ?', [id_categoria]);
      if (categoriaExistente.length === 0) {
        return res.status(404).json({ 
          error: 'Categoria não encontrada',
          message: `Não existe categoria com ID ${id_categoria}`
        });
      }
    }

    // Verifica se já existe um produto com este nome
    const [produtoExistente] = await pool.execute('SELECT * FROM produtos WHERE nome = ?', [nomeProduto]);
    if (produtoExistente.length > 0) {
      return res.status(409).json({ 
        error: 'Produto já existe',
        message: `Já existe um produto com o nome "${nomeProduto}"`
      });
    }

    // Insere o novo produto
    const query = `
      INSERT INTO produtos 
      (nome, descrição, id_categoria, material, tamanho, peso, estoque_atual, estoque_minimo, ativo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    const [result] = await pool.execute(query, [
      nomeProduto,
      descrição || null,
      id_categoria || null,
      material || null,
      tamanho || null,
      peso || null,
      estoqueAtual,
      estoque_minimo
    ]);
    
    // Busca o produto inserido com informações da categoria para retornar os dados completos
    const queryProduto = `
      SELECT p.*, c.nome as categoria_nome
      FROM produtos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.id_produto = ?
    `;
    const [novoProduto] = await pool.execute(queryProduto, [result.insertId]);

    res.status(201).json({
      message: 'Produto criado com sucesso',
      produto: novoProduto[0]
    });

  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto', details: error.message });
  }
});

module.exports = router;