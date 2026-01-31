const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

// ====================== CATEGORIAS ======================

// Rota GET - /categorias
// Retorna somente a coluna 'nome' da tabela 'categorias' - SELECT nome FROM categorias
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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

// Rota DELETE - /categorias/:id - deleta uma categoria específica pelo ID
// Verifica se existem produtos vinculados antes de permitir a exclusão
router.delete('/:id', async (req, res) => {
  const categoriaId = req.params.id;
  
  try {
    // Primeiro verifica se a categoria existe
    const [categoria] = await pool.execute('SELECT * FROM categorias WHERE id_categoria = ?', [categoriaId]);
    if (categoria.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    // Verifica se existem produtos vinculados a esta categoria
    const [produtos] = await pool.execute('SELECT COUNT(*) as total FROM produtos WHERE id_categoria = ?', [categoriaId]);
    if (produtos[0].total > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir a categoria',
        message: `Existem ${produtos[0].total} produto(s) vinculado(s) a esta categoria. Remova ou reclassifique os produtos antes de excluir a categoria.`
      });
    }

    // Se não há produtos vinculados, procede com a exclusão
    const [result] = await pool.execute('DELETE FROM categorias WHERE id_categoria = ?', [categoriaId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json({ 
      message: 'Categoria excluída com sucesso',
      categoria: categoria[0].nome,
      id: categoriaId
    });

  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria', details: error.message });
  }
});


module.exports = router;
