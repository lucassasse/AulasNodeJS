const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

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

// Rota POST - /movimentacoes - cria uma nova movimentação
// Insere uma nova movimentação e atualiza o estoque do produto automaticamente
router.post('/', async (req, res) => {
  const { 
    id_produto, 
    tipo, 
    quantidade, 
    observacao 
  } = req.body;

  // Validação de dados obrigatórios
  if (!id_produto) {
    return res.status(400).json({ 
      error: 'ID do produto é obrigatório',
      message: 'Forneça um ID válido do produto'
    });
  }

  if (!tipo || (tipo !== 'entrada' && tipo !== 'saida')) {
    return res.status(400).json({ 
      error: 'Tipo de movimentação inválido',
      message: 'O tipo deve ser "entrada" ou "saida"'
    });
  }

  if (!quantidade || quantidade <= 0 || (!Number.isInteger(quantidade))) {
    return res.status(400).json({ 
      error: 'Quantidade é obrigatória e deve ser um número inteiro positivo',
      message: 'A quantidade deve ser um número inteiro positivo'
    });
  }

  try {
    // Verifica se o produto existe e está ativo
    const [produto] = await pool.execute('SELECT * FROM produtos WHERE id_produto = ? AND ativo = 1', [id_produto]);
    if (produto.length === 0) {
      return res.status(404).json({ 
        error: 'Produto não encontrado',
        message: 'Produto não existe ou está inativo'
      });
    }

    const estoqueAtual = produto[0].estoque_atual;
    
    // Para saídas, verifica se há estoque suficiente
    if (tipo === 'saida' && estoqueAtual < quantidade) {
      return res.status(400).json({ 
        error: 'Estoque insuficiente',
        message: `Estoque atual: ${estoqueAtual}. Quantidade solicitada: ${quantidade}`
      });
    }

    // Calcula o novo estoque
    const novoEstoque = tipo === 'entrada' 
      ? estoqueAtual + quantidade 
      : estoqueAtual - quantidade;

    // Inicia uma transação para garantir integridade dos dados
    await pool.execute('START TRANSACTION');

    try {
      // Insere a movimentação
      const dataMovimentacao = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [resultMovimentacao] = await pool.execute(
        'INSERT INTO movimentacoes (id_produto, tipo, quantidade, data_movimentacao, observacao) VALUES (?, ?, ?, ?, ?)',
        [id_produto, tipo, quantidade, dataMovimentacao, observacao || null]
      );

      // Atualiza o estoque do produto
      await pool.execute(
        'UPDATE produtos SET estoque_atual = ? WHERE id_produto = ?',
        [novoEstoque, id_produto]
      );

      // Insere o registro no histórico de estoque
      await pool.execute(
        'INSERT INTO histórico_estoque (id_movimentacao, estoque_anterior, estoque_posterior) VALUES (?, ?, ?)',
        [resultMovimentacao.insertId, estoqueAtual, novoEstoque]
      );

      // Confirma a transação
      await pool.execute('COMMIT');

      // Busca a movimentação criada com dados completos do produto
      const queryCompleta = `
        SELECT m.*, p.nome as produto_nome, p.descrição as produto_descricao, 
               c.nome as categoria_nome, p.estoque_atual
        FROM movimentacoes m
        INNER JOIN produtos p ON m.id_produto = p.id_produto
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE m.id_movimentacao = ?
      `;
      const [novaMovimentacao] = await pool.execute(queryCompleta, [resultMovimentacao.insertId]);

      res.status(201).json({
        message: 'Movimentação registrada com sucesso',
        movimentacao: novaMovimentacao[0],
        alteracoes: {
          estoque_anterior: estoqueAtual,
          estoque_posterior: novoEstoque,
          diferenca: tipo === 'entrada' ? `+${quantidade}` : `-${quantidade}`
        }
      });

    } catch (transactionError) {
      // Reverte a transação em caso de erro
      await pool.execute('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    res.status(500).json({ error: 'Erro ao criar movimentação', details: error.message });
  }
});

// PUT | PATCH: Atualizações de movimentações não devem ser permitidas

module.exports = router;