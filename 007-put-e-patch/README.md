# "Capa do Projeto"

## Aqui ficam instruções de inicialização, formas de acesso, demonstração de uso, etc

* Escrito através de linguagem de marcação - md = Markdown
* Utiliza uma sintaxe leve e fácil de aprender, com símbolos como # para títulos e * para listas.

### Para iniciar o projeto
* npm install
* npm start

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