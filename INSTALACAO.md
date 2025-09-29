# 🚀 Guia de Instalação - E2E-Commerce MVP

## 📋 Pré-requisitos

- **Node.js** (versão 16 ou superior)
- **MySQL** (versão 8.0 ou superior)
- **Git**

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/jessicaalmeida21/e-commerce-grupo5.git
cd e-commerce-grupo5
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados

#### Opção A: MySQL Local
1. Instale o MySQL
2. Crie um banco de dados:
```sql
CREATE DATABASE ecommerce_mvp;
```

#### Opção B: MySQL Online (Recomendado)
Use serviços como:
- **PlanetScale** (gratuito)
- **Railway** (gratuito)
- **Clever Cloud** (gratuito)

### 4. Configure as variáveis de ambiente

Copie o arquivo de exemplo:
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Configurações do Banco de Dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=ecommerce_mvp

# Configurações JWT
JWT_SECRET=sua_chave_secreta_muito_segura

# Configurações do Servidor
PORT=3000
NODE_ENV=development
```

### 5. Execute o servidor
```bash
# Modo desenvolvimento (com auto-reload)
npm run dev

# Modo produção
npm start
```

## 🌐 Acessos

Após iniciar o servidor, acesse:

- **Site Principal**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Cadastro**: http://localhost:3000/cadastro
- **API Docs**: http://localhost:3000/api

## 👥 Usuários de Teste

### Cliente
- **Email**: cliente@teste.com
- **Senha**: Cliente123@
- **Role**: client

### Fornecedor
- **Email**: fornecedor@teste.com
- **Senha**: Fornecedor123@
- **Role**: supplier

### Admin
- **Email**: admin@teste.com
- **Senha**: Admin123@
- **Role**: admin

## 🧪 Testando a API

### 1. Cadastro de usuário
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@teste.com",
    "password": "MinhaSenh@123",
    "role": "client"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@teste.com",
    "password": "MinhaSenh@123"
  }'
```

### 3. Listar produtos
```bash
curl http://localhost:3000/api/products
```

## 📱 Funcionalidades Implementadas

### ✅ Sistema de Autenticação
- Cadastro de usuários (clientes, fornecedores, admins)
- Login com JWT
- Recuperação de senha
- Middleware de autenticação e autorização

### ✅ Gestão de Produtos
- CRUD completo de produtos
- Controle de estoque
- Sistema de categorias
- Busca e filtros
- Aumento de estoque em lotes de 10

### ✅ Sistema de Pedidos
- Criação de pedidos
- Controle de status
- Histórico de movimentações
- Cancelamento de pedidos
- Cálculo de frete

### ✅ Sistema de Pagamento
- Pagamento com cartão (crédito/débito)
- Pagamento via PIX
- Cálculo de parcelas com juros
- Validação de cartões mock
- QR Code para PIX

### ✅ Gestão de Fornecedores
- Dashboard de vendas
- Controle de pedidos
- Estatísticas de produtos
- Atualização de status de entrega

### ✅ Logística
- Acompanhamento de pedidos
- Cálculo de frete automático
- Status de entrega
- Histórico de movimentações

## 🔧 Comandos Úteis

### Desenvolvimento
```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Executar testes
npm test

# Verificar logs
npm run logs
```

### Banco de Dados
```bash
# Conectar ao MySQL
mysql -u root -p ecommerce_mvp

# Resetar banco (cuidado!)
DROP DATABASE ecommerce_mvp;
CREATE DATABASE ecommerce_mvp;
```

## 🐛 Solução de Problemas

### Erro de conexão com banco
1. Verifique se o MySQL está rodando
2. Confirme as credenciais no `.env`
3. Teste a conexão:
```bash
mysql -h localhost -u root -p ecommerce_mvp
```

### Erro de porta em uso
```bash
# Encontrar processo usando a porta 3000
lsof -i :3000

# Matar processo
kill -9 PID_DO_PROCESSO
```

### Erro de dependências
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 📚 Documentação da API

### Endpoints Principais

#### Autenticação
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Perfil do usuário

#### Produtos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Buscar produto
- `POST /api/products` - Criar produto (fornecedor/admin)
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Deletar produto

#### Pedidos
- `POST /api/orders` - Criar pedido
- `GET /api/orders/my-orders` - Meus pedidos
- `GET /api/orders/:id` - Buscar pedido
- `POST /api/orders/:id/cancel` - Cancelar pedido

#### Pagamentos
- `POST /api/payments/options` - Opções de pagamento
- `POST /api/payments/card` - Pagamento com cartão
- `POST /api/payments/pix` - Gerar PIX
- `GET /api/payments/pix/:txid/status` - Status do PIX

## 🚀 Deploy

### Heroku
```bash
# Instalar Heroku CLI
# Fazer login
heroku login

# Criar app
heroku create ecommerce-mvp

# Configurar variáveis
heroku config:set DB_HOST=...
heroku config:set JWT_SECRET=...

# Deploy
git push heroku main
```

### Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 📞 Suporte

Para dúvidas ou problemas:
- **Email**: contato@ecommerce.com
- **GitHub Issues**: [Criar issue](https://github.com/jessicaalmeida21/e-commerce-grupo5/issues)

---

**Desenvolvido com ❤️ pelo Grupo 5**
