const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

// Rota GET para /historico-estoque - consulta todo o histórico de estoque
// Retorna todo o histórico de estoque - SELECT * FROM histórico_estoque
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.get('/produto/:id_produto', async (req, res) => {
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

// Rota DELETE - /historico/:id - exclui um registro do histórico de estoque
router.delete('/:id', async (req, res) => {
  const historicoId = req.params.id;
  
  try {
    // Primeiro verifica se o registro de histórico existe
    const [historico] = await pool.execute('SELECT * FROM histórico_estoque WHERE id_historico = ?', [historicoId]);
    if (historico.length === 0) {
      return res.status(404).json({ error: 'Registro de histórico não encontrado' });
    }

    // Remove o registro do histórico
    const [result] = await pool.execute('DELETE FROM histórico_estoque WHERE id_historico = ?', [historicoId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro de histórico não encontrado' });
    }

    res.json({ 
      message: 'Registro de histórico excluído com sucesso',
      id: historicoId,
      estoque_anterior: historico[0].estoque_anterior,
      estoque_posterior: historico[0].estoque_posterior,
      id_movimentacao: historico[0].id_movimentacao
    });

  } catch (error) {
    console.error('Erro ao excluir registro de histórico:', error);
    res.status(500).json({ error: 'Erro ao excluir registro de histórico', details: error.message });
  }
});

// Rota DELETE - /historico/movimentacao/:id_movimentacao - exclui histórico por movimentação
router.delete('/movimentacao/:id_movimentacao', async (req, res) => {
  const movimentacaoId = req.params.id_movimentacao;
  
  try {
    // Primeiro verifica se existe histórico para esta movimentação
    const [historicos] = await pool.execute('SELECT COUNT(*) as total FROM histórico_estoque WHERE id_movimentacao = ?', [movimentacaoId]);
    if (historicos[0].total === 0) {
      return res.status(404).json({ error: 'Nenhum histórico encontrado para esta movimentação' });
    }

    // Remove todos os registros de histórico desta movimentação
    const [result] = await pool.execute('DELETE FROM histórico_estoque WHERE id_movimentacao = ?', [movimentacaoId]);

    res.json({ 
      message: 'Registros de histórico da movimentação excluídos com sucesso',
      id_movimentacao: movimentacaoId,
      registros_excluidos: result.affectedRows
    });

  } catch (error) {
    console.error('Erro ao excluir histórico da movimentação:', error);
    res.status(500).json({ error: 'Erro ao excluir histórico da movimentação', details: error.message });
  }
});

// Rota DELETE - /historico/produto/:id_produto - exclui todo histórico de um produto
router.delete('/produto/:id_produto', async (req, res) => {
  const produtoId = req.params.id_produto;
  
  try {
    // Primeiro verifica se o produto existe
    const [produto] = await pool.execute('SELECT nome FROM produtos WHERE id_produto = ?', [produtoId]);
    if (produto.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Conta quantos registros de histórico serão excluídos
    const [historicos] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM histórico_estoque h
      INNER JOIN movimentacoes m ON h.id_movimentacao = m.id_movimentacao
      WHERE m.id_produto = ?
    `, [produtoId]);
    
    if (historicos[0].total === 0) {
      return res.status(404).json({ error: 'Nenhum histórico encontrado para este produto' });
    }

    // Remove todos os registros de histórico do produto
    const [result] = await pool.execute(`
      DELETE h FROM histórico_estoque h
      INNER JOIN movimentacoes m ON h.id_movimentacao = m.id_movimentacao
      WHERE m.id_produto = ?
    `, [produtoId]);

    res.json({ 
      message: 'Todo o histórico do produto foi excluído com sucesso',
      produto: produto[0].nome,
      registros_excluidos: result.affectedRows,
      warning: 'Esta ação é irreversível e remove todo o histórico de estoque do produto'
    });

  } catch (error) {
    console.error('Erro ao excluir histórico do produto:', error);
    res.status(500).json({ error: 'Erro ao excluir histórico do produto', details: error.message });
  }
});

// POST: O histórico é criado automaticamente (junto da requisição de movimentação)

module.exports = router;
