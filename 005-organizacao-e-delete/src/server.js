const express = require('express');
const app = express();

// Importar os módulos de rotas
const produtosRoutes = require('./routes/produtos');
const categoriasRoutes = require('./routes/categorias');
const movimentacoesRoutes = require('./routes/movimentacoes');
const historicoRoutes = require('./routes/historico');

// Usar os módulos de rotas
app.use('/produtos', produtosRoutes);
app.use('/categorias', categoriasRoutes);
app.use('/movimentacoes', movimentacoesRoutes);
app.use('/historico-estoque', historicoRoutes);

// Rotas específicas que precisam ser mantidas no caminho original
app.use('/produtos-com-categoria', (req, res, next) => {
  req.url = '/com-categoria';
  produtosRoutes(req, res, next);
});

app.use('/movimentacoes-completas', (req, res, next) => {
  req.url = '/completas';
  movimentacoesRoutes(req, res, next);
});
module.exports = app;