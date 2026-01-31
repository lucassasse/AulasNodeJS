// aqui ficam as configurações da aplicação, como rotas e middlewares

const express = require('express'); // importação do express
const app = express(); // atribuição do express à variável app
const { testConnection } = require('./config/db'); // importa a função de teste de conexão com o banco de dados

// middlewares globais - executados em todas as requisições
// middleware: funções que interceptam requisições/respostas para adicionar funcionalidades
app.use(express.json()); // para interpretar JSON no corpo das requisições

// rota padrão
app.get('/', (req, res) => res.send({ status: 'ok', message: 'API funcionando' })); // rota de teste

// middleware de tratamento de erro simples
app.use((err, req, res, next) => { // captura erros - app.use se encontra pelo numero de argumentos/parâmetros, como em poo
  console.error(err); // log do erro no console - para fins de depuração
  res.status(err.status || 500).json({ error: err.message || 'Erro interno' }); // resposta de erro em JSON
});

async function verificarDB() {
  const resultado = await testConnection();
  console.log(resultado.message);
}
verificarDB();

module.exports = app; // exportação do app para uso em outros arquivos (ex: index.js, server.js)

/*

================ EXEMPLOS DE ROTAS ==============

// exemplo de rota com parâmetro 'hello' após a url padrão
app.get('/hello', (req, res) => // req: requisição, res: resposta
  res.send({ message: 'Hello, World!' }) // resposta com mensagem simples (string)
);

// rota para obter informações do professor
app.get('/professor', (req, res) =>
  res.send({ nome: 'Lucas Sasse', disciplinas: ['Programação de Aplicativos', 'Modelagem de Sistemas'] }) // resposta com informações em array simples
);

// rota para obter lista de alunos de determinada disciplina
app.get('/alunos/programacao-de-aplicativos', (req, res) => // rota com /parâmetro + / subparâmetro
  res.send({ alunos: ['Daniel', 'Joao', 'Luan', 'Lucas'] })
);

// rota para obter lista de alunos e suas notas
app.get('/alunos/programacao-de-aplicativos/notas', (req, res) => // rota com /parâmetro + / subparâmetro + / sub-subparâmetro
  res.send({ // resposta com array de objetos
    alunos: [
      { nome: 'Daniel', nota: 8.5 },
      { nome: 'Joao', nota: 9.0 },
      { nome: 'Luan', nota: 9.0 },
      { nome: 'Lucas', nota: 8.0 }
    ]
  })
);

*/
