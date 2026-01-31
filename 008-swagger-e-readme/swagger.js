const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'API Produtos e Estoque',
    description: 'API para gerenciamento de produtos, categorias, movimentações e histórico de estoque',
    version: '1.0.0'
  },
  host: 'localhost:3000',
  schemes: ['http'],
  tags: [
    { name: 'Produtos', description: 'Operações relacionadas a produtos' },
    { name: 'Categorias', description: 'Operações relacionadas a categorias' },
    { name: 'Movimentações', description: 'Operações relacionadas a movimentações de estoque' },
    { name: 'Histórico', description: 'Operações relacionadas ao histórico de estoque' }
  ]
};

const outputFile = './src/swagger-output.json';
const endpointsFiles = ['./src/app.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);
