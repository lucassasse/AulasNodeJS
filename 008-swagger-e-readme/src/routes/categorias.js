const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

// #swagger.tags = ['Categorias']
router.get('/', async (req, res) => {
  // #swagger.summary = 'Lista todas as categorias'
  try {
    const [rows] = await pool.execute('SELECT nome FROM categorias');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar categorias:', error);
    res.status(500).json({ error: 'Erro ao consultar categorias', details: error.message });
  }
});

// Rota GET para /categorias/:id
router.get('/:id', async (req, res) => {
  // #swagger.summary = 'Busca uma categoria por ID'
  // #swagger.parameters['id'] = { description: 'ID da categoria' }
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

// Rota POST - /categorias - cria uma nova categoria
// Insere uma nova categoria na tabela 'categorias' - INSERT INTO categorias (nome) VALUES (?)
router.post('/', async (req, res) => {
  const { nome } = req.body;

  // Validação de dados
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ 
      error: 'Nome da categoria é obrigatório',
      message: 'Forneça um nome válido para a categoria'
    });
  }

  // Verifica o tamanho
  if (nome.length > 100) {
    return res.status(400).json({ 
      error: 'Nome muito longo',
      message: 'O nome da categoria deve ter no máximo 100 caracteres'
    });
  }

  try {
    // Verifica se já existe uma categoria com este nome
    const [categoriaExistente] = await pool.execute('SELECT * FROM categorias WHERE nome = ?', [nome]);
    if (categoriaExistente.length > 0) {
      return res.status(409).json({ 
        error: 'Categoria já existe',
        message: `Já existe uma categoria com o nome "${nome}"`
      });
    }

    // Insere a nova categoria
    const [result] = await pool.execute('INSERT INTO categorias (nome) VALUES (?)', [nome]);
    
    // Busca a categoria inserida para retornar os dados completos (incluindo o ID criado automaticamente)
    const [novaCategoria] = await pool.execute('SELECT * FROM categorias WHERE id_categoria = ?', [result.insertId]);

    res.status(201).json({
      message: 'Categoria criada com sucesso',
      categoria: novaCategoria[0]
    });

  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro ao criar categoria', details: error.message });
  }
});

// Rota PUT - /categorias/:id - atualiza uma categoria específica pelo ID
// Atualiza o nome de uma categoria existente - UPDATE categorias SET nome = ? WHERE id_categoria = ?
router.put('/:id', async (req, res) => {
  const categoriaId = req.params.id;
  const { nome } = req.body;

  // Validação de dados
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ 
      error: 'Nome da categoria é obrigatório',
      message: 'Forneça um nome válido para a categoria'
    });
  }

  // Verifica o tamanho
  if (nome.length > 100) {
    return res.status(400).json({ 
      error: 'Nome muito longo',
      message: 'O nome da categoria deve ter no máximo 100 caracteres'
    });
  }

  try {
    // Primeiro verifica se a categoria existe
    const [categoriaExistente] = await pool.execute('SELECT * FROM categorias WHERE id_categoria = ?', [categoriaId]);
    if (categoriaExistente.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    const nomeAtual = nome.trim();
    
    // Verifica se já existe outra categoria com este nome
    const [categoriaComMesmoNome] = await pool.execute(
      'SELECT * FROM categorias WHERE nome = ? AND id_categoria != ?', 
      [nomeAtual, categoriaId]
    );
    if (categoriaComMesmoNome.length > 0) {
      return res.status(409).json({ 
        error: 'Nome já existe',
        message: `Já existe outra categoria com o nome "${nomeAtual}"`
      });
    }

    // Se o nome é o mesmo que já existe, não precisa atualizar
    if (categoriaExistente[0].nome === nomeAtual) {
      return res.status(200).json({
        message: 'Categoria não foi modificada',
        categoria: categoriaExistente[0],
        observacao: 'O nome fornecido é igual ao nome atual da categoria'
      });
    }

    // Atualiza a categoria
    const [result] = await pool.execute('UPDATE categorias SET nome = ? WHERE id_categoria = ?', [nomeAtual, categoriaId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    // Busca a categoria atualizada para retornar os dados completos
    const [categoriaAtualizada] = await pool.execute('SELECT * FROM categorias WHERE id_categoria = ?', [categoriaId]);

    res.json({
      message: 'Categoria atualizada com sucesso',
      categoria: categoriaAtualizada[0],
      nomeAnterior: categoriaExistente[0].nome,
      nomeNovo: nomeAtual
    });

  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria', details: error.message });
  }
});

module.exports = router;
