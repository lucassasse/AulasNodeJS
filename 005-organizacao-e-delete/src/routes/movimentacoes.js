const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

// ====================== MOVIMENTAÇÕES ======================

// Rota GET para /movimentacoes - consulta todas as movimentações
// Retorna todas as movimentações de estoque - SELECT * FROM movimentacoes
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.get('/produto/:id_produto', async (req, res) => {
  const produtoId = req.params.id_produto;
  try {
    const [rows] = await pool.execute('SELECT * FROM movimentacoes WHERE id_produto = ? ORDER BY data_movimentacao DESC', [produtoId]);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar movimentações do produto:', error);
    res.status(500).json({ error: 'Erro ao consultar movimentações do produto', details: error.message });
  }
});

// Rota GET para /movimentacoes-completas - consulta movimentações com informações do produto
// Retorna movimentações com dados do produto - JOIN entre movimentacoes e produtos
router.get('/completas', async (req, res) => {
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

// Rota DELETE - /movimentacoes/:id - exclui uma movimentação
router.delete('/:id', async (req, res) => {
  const movimentacaoId = req.params.id;
  
  try {
    // Primeiro verifica se a movimentação existe
    const [movimentacao] = await pool.execute('SELECT * FROM movimentacoes WHERE id_movimentacao = ?', [movimentacaoId]);
    if (movimentacao.length === 0) {
      return res.status(404).json({ error: 'Movimentação não encontrada' });
    }

    // Verifica se existe histórico vinculado a esta movimentação
    const [historico] = await pool.execute('SELECT COUNT(*) as total FROM histórico_estoque WHERE id_movimentacao = ?', [movimentacaoId]);
    
    // Inicia uma transação para garantir integridade dos dados
    await pool.execute('START TRANSACTION');
    
    try {
      // Remove primeiro o histórico de estoque se existir
      if (historico[0].total > 0) {
        await pool.execute('DELETE FROM histórico_estoque WHERE id_movimentacao = ?', [movimentacaoId]);
      }

      // Remove a movimentação
      const [result] = await pool.execute('DELETE FROM movimentacoes WHERE id_movimentacao = ?', [movimentacaoId]);
      
      if (result.affectedRows === 0) {
        await pool.execute('ROLLBACK');
        return res.status(404).json({ error: 'Movimentação não encontrada' });
      }

      // Confirma a transação
      await pool.execute('COMMIT');

      res.json({ 
        message: 'Movimentação excluída com sucesso',
        id: movimentacaoId,
        tipo: movimentacao[0].tipo,
        quantidade: movimentacao[0].quantidade,
        observacao: historico[0].total > 0 ? 'Histórico de estoque também foi removido' : 'Sem histórico associado'
      });

    } catch (transactionError) {
      // Reverte a transação em caso de erro
      await pool.execute('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Erro ao excluir movimentação:', error);
    res.status(500).json({ error: 'Erro ao excluir movimentação', details: error.message });
  }
});

// Rota DELETE - /movimentacoes/produto/:id_produto - exclui todas as movimentações de um produto
router.delete('/produto/:id_produto', async (req, res) => {
  const produtoId = req.params.id_produto;
  
  try {
    // Primeiro verifica se o produto existe
    const [produto] = await pool.execute('SELECT nome FROM produtos WHERE id_produto = ?', [produtoId]);
    if (produto.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Conta quantas movimentações serão excluídas
    const [movimentacoes] = await pool.execute('SELECT COUNT(*) as total FROM movimentacoes WHERE id_produto = ?', [produtoId]);
    if (movimentacoes[0].total === 0) {
      return res.status(404).json({ error: 'Nenhuma movimentação encontrada para este produto' });
    }

    // Inicia uma transação para garantir integridade dos dados
    await pool.execute('START TRANSACTION');
    
    try {
      // Remove primeiro todos os históricos de estoque das movimentações deste produto
      await pool.execute(`
        DELETE he FROM histórico_estoque he 
        INNER JOIN movimentacoes m ON he.id_movimentacao = m.id_movimentacao 
        WHERE m.id_produto = ?
      `, [produtoId]);

      // Remove todas as movimentações do produto
      const [result] = await pool.execute('DELETE FROM movimentacoes WHERE id_produto = ?', [produtoId]);

      // Confirma a transação
      await pool.execute('COMMIT');

      res.json({ 
        message: 'Todas as movimentações do produto foram excluídas com sucesso',
        produto: produto[0].nome,
        movimentacoes_excluidas: result.affectedRows,
        warning: 'Esta ação é irreversível e afeta o histórico completo do produto'
      });

    } catch (transactionError) {
      // Reverte a transação em caso de erro
      await pool.execute('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Erro ao excluir movimentações do produto:', error);
    res.status(500).json({ error: 'Erro ao excluir movimentações do produto', details: error.message });
  }
});

module.exports = router;
