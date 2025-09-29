# E-Commerce - Site de Vendas Online

Um site de e-commerce moderno e responsivo inspirado no Mercado Livre, desenvolvido com HTML, CSS e JavaScript vanilla.

## 🚀 Características

- **Design Responsivo**: Funciona perfeitamente em dispositivos móveis e desktop
- **Cor Principal**: Verde (#28a745) seguindo as especificações
- **Integração com API**: Consome dados de produtos de uma API real
- **Carrinho de Compras**: Funcionalidade completa de adição e remoção de produtos
- **Filtros e Busca**: Sistema de busca e filtros por categoria
- **Paginação**: Navegação eficiente através dos produtos
- **LocalStorage**: Persistência do carrinho entre sessões

## 📁 Estrutura do Projeto

```
e-commerce_grupo5/
├── index.html          # Página inicial com produtos em destaque
├── produtos.html       # Página de listagem completa de produtos
├── contato.html        # Página de contato com formulário
├── styles.css          # Estilos CSS responsivos
├── script.js           # JavaScript com todas as funcionalidades
└── README.md           # Documentação do projeto
```

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessível
- **CSS3**: Estilos responsivos com Flexbox e Grid
- **JavaScript (Vanilla)**: Funcionalidades interativas sem dependências
- **API REST**: Integração com catálogo de produtos externo
- **LocalStorage**: Persistência de dados do carrinho

## 🌐 API Utilizada

O projeto consome a API do catálogo de produtos disponível em:
- **URL Base**: `https://catalogo-products.pages.dev/api`
- **Endpoint**: `/api/products`
- **Documentação**: [Swagger](https://catalogo-products.pages.dev/docs/)

### Exemplo de Uso da API

```javascript
// Carregar produtos
fetch('https://catalogo-products.pages.dev/api/products?page=1&pageSize=10')
  .then(response => response.json())
  .then(data => {
    console.log(data.products);
  });
```

## 🎨 Funcionalidades

### Página Inicial
- Banner de boas-vindas
- Produtos em destaque (6 produtos)
- Navegação entre páginas
- Ícone do carrinho com contador

### Página de Produtos
- Listagem completa de produtos
- Sistema de busca por nome/descrição
- Filtros por categoria
- Ordenação por preço, nome e avaliação
- Paginação para navegação eficiente

### Carrinho de Compras
- Adicionar/remover produtos
- Ajustar quantidades
- Cálculo automático do total
- Persistência no LocalStorage
- Modal responsivo

### Página de Contato
- Formulário de contato funcional
- Informações de contato
- Validação de campos

## 📱 Responsividade

O site foi desenvolvido com foco na responsividade:

- **Desktop**: Layout em grid com múltiplas colunas
- **Tablet**: Adaptação para telas médias
- **Mobile**: Layout em coluna única otimizado para toque

### Breakpoints
- Mobile: até 480px
- Tablet: 481px - 768px
- Desktop: acima de 768px

## 🎯 Como Usar

1. **Abrir o site**: Abra o arquivo `index.html` em um navegador
2. **Navegar**: Use o menu para navegar entre as páginas
3. **Buscar produtos**: Na página de produtos, use a barra de busca
4. **Filtrar**: Use os filtros de categoria e ordenação
5. **Adicionar ao carrinho**: Clique no botão "Adicionar ao Carrinho"
6. **Ver carrinho**: Clique no ícone do carrinho no cabeçalho
7. **Finalizar compra**: Use o botão "Finalizar Compra" no carrinho

## 🔧 Personalização

### Cores
As cores principais podem ser alteradas no arquivo `styles.css`:

```css
:root {
  --primary-color: #28a745;    /* Verde principal */
  --secondary-color: #20c997;  /* Verde secundário */
  --accent-color: #dc3545;     /* Vermelho para destaque */
}
```

### API
Para usar uma API diferente, altere a constante no arquivo `script.js`:

```javascript
const API_BASE_URL = 'https://sua-api.com/api';
```

## 📊 Estrutura de Dados

### Produto
```javascript
{
  id: "PROD-0001",
  title: "Nome do Produto",
  slug: "nome-do-produto",
  category: "categoria",
  brand: "Marca",
  description: "Descrição do produto",
  price: {
    currency: "BRL",
    original: 100.00,
    discount_percent: 0,
    final: 100.00
  },
  stock: {
    quantity: 10,
    sku: "SKU-001",
    warehouse: "SP"
  },
  rating: {
    average: 4.5,
    count: 25
  }
}
```

### Item do Carrinho
```javascript
{
  id: "PROD-0001",
  name: "Nome do Produto",
  price: 100.00,
  image: "url-da-imagem",
  quantity: 2
}
```

## 🚀 Melhorias Futuras

- [ ] Sistema de autenticação de usuários
- [ ] Integração com gateway de pagamento
- [ ] Sistema de avaliações de produtos
- [ ] Wishlist (lista de desejos)
- [ ] Notificações push
- [ ] PWA (Progressive Web App)
- [ ] Otimização de performance
- [ ] Testes automatizados

## 📄 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 👥 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto
2. Criar uma branch para sua feature
3. Fazer commit das mudanças
4. Fazer push para a branch
5. Abrir um Pull Request

## 📞 Suporte

Para dúvidas ou suporte, entre em contato:

- **Email**: contato@ecommerce.com
- **Telefone**: (11) 99999-9999

## 🚀 Atualizações Automáticas

Este projeto está configurado para atualizações automáticas no GitHub. Use os scripts fornecidos para facilitar o processo.

---

Desenvolvido com ❤️ para o Grupo 5
