# API de Gerenciamento de Estoque

API REST para gerenciar produtos, categorias, movimentações e histórico de estoque com documentação Swagger automatizada.

## 🚀 Como executar

```bash
# Instalar dependências
npm install

# Gerar documentação Swagger
npm run swagger

# Iniciar servidor
npm start
```

## Documentação da API

Acesse a documentação interativa em: **http://localhost:3000/api-docs**

## Swagger Autogen

Este projeto usa o **Swagger Autogen** para gerar automaticamente a documentação da API.

### Como funciona:

1. **Comentários especiais** nos arquivos de rotas:
   ```javascript
   // #swagger.tags = ['Produtos']
   router.get('/', async (req, res) => {
     // #swagger.summary = 'Lista todos os produtos'
     // Código da rota...
   });
   ```

2. **Script de geração** (`swagger.js`) que:
   - Define metadados da API
   - Especifica schemas de dados  
   - Gera o arquivo `swagger-output.json`

3. **Para regenerar a documentação**:
   ```bash
   npm run swagger
   ```

### Vantagens do Swagger Autogen:

- **Automático**: Detecta rotas automaticamente
- **Simples**: Poucos comentários necessários  
- **Sincronizado**: Sempre atualizado com o código
- **Rápido**: Setup em minutos

## Endpoints principais

- **GET** `/produtos` - Lista todos os produtos
- **POST** `/produtos` - Cria novo produto  
- **GET** `/produtos/{id}` - Busca produto por ID
- **PUT** `/produtos/{id}` - Atualiza produto
- **DELETE** `/produtos/{id}` - Desativa produto (soft delete)
- **GET** `/categorias` - Lista categorias
- **GET** `/movimentacoes` - Lista movimentações

** Ver documentação completa em:** http://localhost:3000/api-docs

### Rota inicial para teste
* http://localhost:3000/






Rotas DELETE Implementadas
📂 Categorias (/categorias)

DELETE /categorias/:id - Exclui uma categoria
✅ Verifica se a categoria existe
✅ Impede exclusão se houver produtos vinculados
✅ Retorna informações detalhadas sobre a operação
📦 Produtos (/produtos)
DELETE /produtos/:id - Desativa produto (soft delete)

✅ Define ativo = 0 mantendo histórico
✅ Verifica se o produto já está inativo
✅ Mantém integridade dos dados de movimentações
DELETE /produtos/:id/permanente - Exclusão permanente

✅ Remove completamente o produto
✅ Impede exclusão se houver movimentações vinculadas
⚠️ Operação irreversível (usar com cuidado)
📈 Movimentações (/movimentacoes)
DELETE /movimentacoes/:id - Exclui movimentação específica

✅ Remove movimentação e histórico associado
✅ Usa transações para garantir integridade
✅ Rollback automático em caso de erro
DELETE /movimentacoes/produto/:id_produto - Remove todas as movimentações de um produto

✅ Exclui todas as movimentações do produto
✅ Remove históricos associados
⚠️ Operação em lote irreversível
📊 Histórico (/historico)
DELETE /historico/:id - Remove registro específico

✅ Exclui registro individual do histórico
✅ Retorna detalhes do registro removido
DELETE /historico/movimentacao/:id_movimentacao - Remove histórico por movimentação

✅ Exclui todos os registros de uma movimentação
DELETE /historico/produto/:id_produto - Remove todo histórico de um produto

✅ Exclui histórico completo do produto
⚠️ Operação irreversível
🔒 Recursos de Segurança Implementados
Verificação de Dependências: Impede exclusões que quebrariam integridade referencial
Transações: Garantem consistência dos dados em operações complexas
Soft Delete: Produtos são desativados por padrão, preservando histórico
Validações: Verificam existência antes de tentar excluir
Mensagens Detalhadas: Retornam informações claras sobre o resultado das operações
Todas as rotas estão prontas para uso e seguem as melhores práticas de segurança e integridade de dados!