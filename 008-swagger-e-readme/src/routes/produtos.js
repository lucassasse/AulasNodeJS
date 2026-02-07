const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

// #swagger.tags = ['Produtos']
router.get('/', async (req, res) => {
  // #swagger.summary = 'Lista todos os produtos'
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

// Rota PUT - /produtos/:id - atualiza um produto específico pelo ID
// Atualiza os dados de um produto existente - UPDATE produtos SET ... WHERE id_produto = ?
router.put('/:id', async (req, res) => {
  const produtoId = req.params.id;
  const { 
    nome, 
    descrição, 
    id_categoria, 
    material, 
    tamanho, 
    peso, 
    estoque_atual, 
    estoque_minimo,
    ativo
  } = req.body;

  try {
    // Primeiro verifica se o produto existe
    const [produtoExistente] = await pool.execute('SELECT * FROM produtos WHERE id_produto = ?', [produtoId]);
    if (produtoExistente.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Validação de dados obrigatórios se fornecidos
    if (nome !== undefined) {
      if (!nome || nome.trim() === '') {
        return res.status(400).json({ 
          error: 'Nome do produto é obrigatório',
          message: 'Forneça um nome válido para o produto'
        });
      }
      if (nome.trim().length > 200) {
        return res.status(400).json({ 
          error: 'Nome muito longo',
          message: 'O nome do produto deve ter no máximo 200 caracteres'
        });
      }
    }

    if (estoque_minimo !== undefined) {
      if (estoque_minimo < 0) {
        return res.status(400).json({ 
          error: 'Estoque mínimo inválido',
          message: 'O estoque mínimo não pode ser negativo'
        });
      }
    }

    // Validações opcionais
    if (material !== undefined && material.length > 100) {
      return res.status(400).json({ 
        error: 'Material muito longo',
        message: 'O material deve ter no máximo 100 caracteres'
      });
    }

    if (tamanho !== undefined && tamanho.length > 50) {
      return res.status(400).json({ 
        error: 'Tamanho muito longo',
        message: 'O tamanho deve ter no máximo 50 caracteres'
      });
    }

    if (peso !== undefined && (peso < 0 || peso > 999999.99)) {
      return res.status(400).json({ 
        error: 'Peso inválido',
        message: 'O peso deve estar entre 0 e 999999.99'
      });
    }

    if (estoque_atual !== undefined && estoque_atual < 0) {
      return res.status(400).json({ 
        error: 'Estoque atual inválido',
        message: 'O estoque atual não pode ser negativo'
      });
    }

    if (ativo !== undefined && ativo !== 0 && ativo !== 1) {
      return res.status(400).json({ 
        error: 'Status ativo inválido',
        message: 'O campo ativo deve ser 0 (inativo) ou 1 (ativo)'
      });
    }

    // Verifica se a categoria existe (se foi fornecida)
    if (id_categoria !== undefined && id_categoria !== null) {
      const [categoriaExistente] = await pool.execute('SELECT * FROM categorias WHERE id_categoria = ?', [id_categoria]);
      if (categoriaExistente.length === 0) {
        return res.status(404).json({ 
          error: 'Categoria não encontrada',
          message: `Não existe categoria com ID ${id_categoria}`
        });
      }
    }

    // Verifica se já existe outro produto com este nome (se o nome está sendo alterado)
    if (nome !== undefined) {
      const nomeAtual = nome.trim();
      const [produtoComMesmoNome] = await pool.execute(
        'SELECT * FROM produtos WHERE nome = ? AND id_produto != ?', 
        [nomeAtual, produtoId]
      );
      if (produtoComMesmoNome.length > 0) {
        return res.status(409).json({ 
          error: 'Nome já existe',
          message: `Já existe outro produto com o nome "${nomeAtual}"`
        });
      }
    }

    // Constrói a query de atualização dinamicamente baseado nos campos fornecidos
    const camposParaAtualizar = [];
    const valoresParaAtualizar = [];

    if (nome !== undefined) {
      camposParaAtualizar.push('nome = ?');
      valoresParaAtualizar.push(nome.trim());
    }
    if (descrição !== undefined) {
      camposParaAtualizar.push('descrição = ?');
      valoresParaAtualizar.push(descrição);
    }
    if (id_categoria !== undefined) {
      camposParaAtualizar.push('id_categoria = ?');
      valoresParaAtualizar.push(id_categoria);
    }
    if (material !== undefined) {
      camposParaAtualizar.push('material = ?');
      valoresParaAtualizar.push(material);
    }
    if (tamanho !== undefined) {
      camposParaAtualizar.push('tamanho = ?');
      valoresParaAtualizar.push(tamanho);
    }
    if (peso !== undefined) {
      camposParaAtualizar.push('peso = ?');
      valoresParaAtualizar.push(peso);
    }
    if (estoque_atual !== undefined) {
      camposParaAtualizar.push('estoque_atual = ?');
      valoresParaAtualizar.push(estoque_atual);
    }
    if (estoque_minimo !== undefined) {
      camposParaAtualizar.push('estoque_minimo = ?');
      valoresParaAtualizar.push(estoque_minimo);
    }
    if (ativo !== undefined) {
      camposParaAtualizar.push('ativo = ?');
      valoresParaAtualizar.push(ativo);
    }

    // Se nenhum campo foi fornecido para atualização
    if (camposParaAtualizar.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhum campo para atualizar',
        message: 'Forneça pelo menos um campo para ser atualizado'
      });
    }

    // Adiciona o ID do produto no final dos valores
    valoresParaAtualizar.push(produtoId);

    // Executa a atualização
    const queryUpdate = `UPDATE produtos SET ${camposParaAtualizar.join(', ')} WHERE id_produto = ?`;
    const [result] = await pool.execute(queryUpdate, valoresParaAtualizar);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Busca o produto atualizado com informações da categoria
    const queryProdutoAtualizado = `
      SELECT p.*, c.nome as categoria_nome
      FROM produtos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.id_produto = ?
    `;
    const [produtoAtualizado] = await pool.execute(queryProdutoAtualizado, [produtoId]);

    res.json({
      message: 'Produto atualizado com sucesso',
      produto: produtoAtualizado[0],
      camposAtualizados: camposParaAtualizar.length
    });

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto', details: error.message });
  }
});

// Rota PATCH - /produtos/:id/estoque - atualiza apenas o estoque de um produto
// Atualização rápida de estoque sem afetar outros campos - UPDATE produtos SET estoque_atual = ? WHERE id_produto = ?
router.patch('/:id/estoque', async (req, res) => {
  const produtoId = req.params.id;
  const { estoque_atual } = req.body;

  // Validação de dados
  if (estoque_atual === undefined || estoque_atual === null) {
    return res.status(400).json({ 
      error: 'Estoque atual é obrigatório',
      message: 'Forneça o novo valor para o estoque atual'
    });
  }

  if (estoque_atual < 0) {
    return res.status(400).json({ 
      error: 'Estoque atual inválido',
      message: 'O estoque atual não pode ser negativo'
    });
  }

  try {
    // Primeiro verifica se o produto existe e está ativo
    const [produtoExistente] = await pool.execute('SELECT * FROM produtos WHERE id_produto = ? AND ativo = 1', [produtoId]);
    if (produtoExistente.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado ou inativo' });
    }

    const estoqueAnterior = produtoExistente[0].estoque_atual;

    // Atualiza apenas o estoque atual
    const [result] = await pool.execute('UPDATE produtos SET estoque_atual = ? WHERE id_produto = ?', [estoque_atual, produtoId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Calcula a diferença de estoque
    const diferenca = estoque_atual - estoqueAnterior;
    const tipoOperacao = diferenca > 0 ? 'entrada' : diferenca < 0 ? 'saída' : 'sem alteração';

    res.json({
      message: 'Estoque atualizado com sucesso',
      produto: {
        id: produtoId,
        nome: produtoExistente[0].nome,
        estoque_anterior: estoqueAnterior,
        estoque_atual: estoque_atual,
        diferenca: diferenca,
        tipo_operacao: tipoOperacao
      }
    });

  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({ error: 'Erro ao atualizar estoque', details: error.message });
  }
});

module.exports = router;