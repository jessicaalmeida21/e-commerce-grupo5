# 🚀 Guia de Deploy - E2E Commerce MVP

Este guia contém instruções detalhadas para fazer deploy do projeto em diferentes plataformas.

## 📋 Pré-requisitos

1. **Conta no GitHub** (para hospedar o código)
2. **Node.js** instalado localmente
3. **Git** configurado
4. **Banco de dados** (MySQL) - pode ser local ou em nuvem

## 🌐 Opções de Deploy

### 1. Vercel (Recomendado) ⭐

#### Vantagens:
- ✅ Gratuito
- ✅ Deploy automático via GitHub
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Fácil configuração

#### Passos:

1. **Preparar o repositório:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/e-commerce-grupo5.git
   git push -u origin main
   ```

2. **Fazer deploy:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Conecte com GitHub
   - Selecione o repositório
   - Configure as variáveis de ambiente
   - Clique em "Deploy"

3. **Configurar variáveis de ambiente:**
   ```
   DB_HOST=seu-banco-host
   DB_USER=seu-usuario
   DB_PASSWORD=sua-senha
   DB_NAME=seu-banco
   JWT_SECRET=sua-chave-secreta
   NODE_ENV=production
   ```

#### Script Automático:
```bash
# Windows
deploy-vercel.bat

# PowerShell
.\deploy-vercel.ps1
```

### 2. Railway

#### Vantagens:
- ✅ Gratuito com limites generosos
- ✅ Banco de dados MySQL incluído
- ✅ Deploy automático
- ✅ Logs em tempo real

#### Passos:

1. **Preparar o repositório** (mesmo processo do Vercel)

2. **Fazer deploy:**
   - Acesse [railway.app](https://railway.app)
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Conecte com GitHub
   - Selecione o repositório

3. **Adicionar banco de dados:**
   - No painel do Railway
   - Clique em "New" → "Database" → "MySQL"
   - Copie as credenciais

4. **Configurar variáveis de ambiente:**
   - Use as credenciais do banco criado
   - Adicione JWT_SECRET e outras variáveis

#### Script Automático:
```bash
# Windows
deploy-railway.bat
```

### 3. Netlify

#### Vantagens:
- ✅ Gratuito
- ✅ Deploy automático
- ✅ Formulários integrados
- ✅ CDN global

#### Limitações:
- ⚠️ Apenas para frontend estático
- ⚠️ Precisa de backend separado

### 4. Heroku

#### Vantagens:
- ✅ Muito popular
- ✅ Suporte completo a Node.js
- ✅ Add-ons disponíveis

#### Limitações:
- ⚠️ Plano gratuito descontinuado
- ⚠️ Precisa de cartão de crédito

## 🗄️ Opções de Banco de Dados

### Para Produção:

1. **PlanetScale** (Recomendado)
   - Gratuito até 1GB
   - MySQL compatível
   - Escalável

2. **Railway MySQL**
   - Incluído no Railway
   - 1GB gratuito

3. **Supabase**
   - PostgreSQL
   - 500MB gratuito

4. **MongoDB Atlas**
   - MongoDB
   - 512MB gratuito

## 🔧 Configuração Pós-Deploy

### 1. Testar Funcionalidades:
- [ ] Página inicial carrega
- [ ] Produtos são listados
- [ ] Carrinho funciona
- [ ] Login/cadastro funcionam
- [ ] API responde corretamente

### 2. Configurar Domínio Personalizado (Opcional):
- Compre um domínio
- Configure DNS
- Adicione no painel do provedor

### 3. Monitoramento:
- Configure logs
- Monitore performance
- Configure alertas

## 🚨 Solução de Problemas

### Erro de CORS:
- Verifique se o domínio está na lista de origens permitidas
- Atualize o arquivo `server.js`

### Erro de Banco de Dados:
- Verifique as credenciais
- Teste a conexão
- Verifique se o banco está acessível

### Erro 500:
- Verifique os logs
- Confirme se todas as variáveis estão configuradas
- Teste localmente primeiro

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do provedor
2. Teste localmente
3. Consulte a documentação do provedor
4. Abra uma issue no GitHub

## 🎯 Próximos Passos

Após o deploy bem-sucedido:

1. **Configurar CI/CD** para deploy automático
2. **Implementar monitoramento** (Sentry, LogRocket)
3. **Configurar backup** do banco de dados
4. **Otimizar performance** (CDN, cache)
5. **Implementar SSL** personalizado

---

**Desenvolvido com ❤️ para o Grupo 5**
