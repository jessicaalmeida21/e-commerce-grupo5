// Configurações da API
const API_BASE_URL = 'https://catalogo-products.pages.dev/api';
const PRODUCTS_PER_PAGE = 12;

// Estado global da aplicação
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentPage = 1;
let totalPages = 1;
let allProducts = [];
let filteredProducts = [];

// Elementos DOM
const cartCount = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const cartToggle = document.getElementById('cart-toggle');
const closeCart = document.getElementById('close-cart');
const checkoutBtn = document.getElementById('checkout-btn');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateCartUI();
});

// Inicializar aplicação
function initializeApp() {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('produtos.html')) {
        loadProducts();
        setupFilters();
    } else if (currentPage.includes('index.html')) {
        loadFeaturedProducts();
    } else if (currentPage.includes('contato.html')) {
        setupContactForm();
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Carrinho
    if (cartToggle) {
        cartToggle.addEventListener('click', toggleCart);
    }
    if (closeCart) {
        closeCart.addEventListener('click', closeCartModal);
    }
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
    
    // Fechar modal ao clicar fora
    if (cartModal) {
        cartModal.addEventListener('click', function(e) {
            if (e.target === cartModal) {
                closeCartModal();
            }
        });
    }
}

// Carregar produtos em destaque (página inicial)
async function loadFeaturedProducts() {
    try {
        showLoading('featured-products');
        const response = await fetch(`${API_BASE_URL}/products?page=1&pageSize=6`);
        const data = await response.json();
        
        if (data.products) {
            displayProducts(data.products, 'featured-products');
        }
    } catch (error) {
        console.error('Erro ao carregar produtos em destaque:', error);
        showError('featured-products', 'Erro ao carregar produtos');
    }
}

// Carregar todos os produtos (página de produtos)
async function loadProducts(page = 1) {
    try {
        showLoading('products-grid');
        const response = await fetch(`${API_BASE_URL}/products?page=${page}&pageSize=${PRODUCTS_PER_PAGE}`);
        const data = await response.json();
        
        if (data.products) {
            allProducts = data.products;
            filteredProducts = [...allProducts];
            totalPages = Math.ceil(data.meta.total / PRODUCTS_PER_PAGE);
            currentPage = page;
            
            displayProducts(filteredProducts, 'products-grid');
            updatePagination();
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        showError('products-grid', 'Erro ao carregar produtos');
    }
}

// Exibir produtos
function displayProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = '<p class="no-products">Nenhum produto encontrado.</p>';
        return;
    }
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        container.appendChild(productCard);
    });
    
    hideLoading(containerId);
}

// Criar card do produto
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Formatar preço
    const price = product.price ? product.price.final : 0;
    const formattedPrice = price.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    
    // Imagem do produto (usando placeholder se não houver)
    const imageUrl = product.image || `https://via.placeholder.com/300x200?text=${encodeURIComponent(product.title)}`;
    
    // Rating
    const rating = product.rating ? product.rating.average : 0;
    const ratingCount = product.rating ? product.rating.count : 0;
    const stars = generateStars(rating);
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${product.title}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=Imagem+Indisponível'">
        <div class="product-info">
            <div class="product-category">${product.category || 'Geral'}</div>
            <h3 class="product-title">${product.title}</h3>
            <div class="product-rating">
                <span class="stars">${stars}</span>
                <span>(${ratingCount})</span>
            </div>
            <div class="product-price">${formattedPrice}</div>
            <button class="add-to-cart" onclick="addToCart('${product.id}', '${product.title}', ${price}, '${imageUrl}')">
                <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
            </button>
        </div>
    `;
    
    return card;
}

// Gerar estrelas para rating
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Estrelas cheias
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // Meia estrela
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Estrelas vazias
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Adicionar produto ao carrinho
function addToCart(productId, productName, price, imageUrl) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            image: imageUrl,
            quantity: 1
        });
    }
    
    // Salvar no localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Atualizar UI
    updateCartUI();
    
    // Feedback visual
    showNotification(`${productName} adicionado ao carrinho!`);
}

// Atualizar UI do carrinho
function updateCartUI() {
    // Atualizar contador
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
    }
    
    // Atualizar modal do carrinho
    updateCartModal();
}

// Atualizar modal do carrinho
function updateCartModal() {
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Seu carrinho está vazio</p>';
        if (cartTotal) {
            cartTotal.textContent = '0,00';
        }
        return;
    }
    
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${itemTotal.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })}</div>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                <span class="quantity">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        cartItems.appendChild(cartItem);
    });
    
    if (cartTotal) {
        cartTotal.textContent = total.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

// Atualizar quantidade do item
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

// Remover item do carrinho
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    showNotification('Item removido do carrinho');
}

// Toggle do modal do carrinho
function toggleCart() {
    if (cartModal) {
        cartModal.classList.toggle('show');
    }
}

// Fechar modal do carrinho
function closeCartModal() {
    if (cartModal) {
        cartModal.classList.remove('show');
    }
}

// Finalizar compra
function handleCheckout() {
    if (cart.length === 0) {
        showNotification('Carrinho vazio!', 'error');
        return;
    }
    
    // Simular processo de checkout
    showNotification('Redirecionando para o checkout...', 'info');
    
    // Aqui você pode integrar com um sistema de pagamento real
    setTimeout(() => {
        // Simular sucesso do checkout
        cart = [];
        localStorage.removeItem('cart');
        updateCartUI();
        closeCartModal();
        showNotification('Compra realizada com sucesso!', 'success');
    }, 2000);
}

// Configurar filtros (página de produtos)
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleFilter);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', handleSort);
    }
}

// Buscar produtos
function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    filterProducts(searchTerm);
}

// Filtrar produtos
function handleFilter() {
    const category = document.getElementById('category-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    filterProducts(searchTerm, category);
}

// Ordenar produtos
function handleSort() {
    const sortBy = document.getElementById('sort-filter').value;
    sortProducts(sortBy);
}

// Aplicar filtros
function filterProducts(searchTerm = '', category = '') {
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm) ||
                            product.description?.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || product.category === category;
        
        return matchesSearch && matchesCategory;
    });
    
    displayProducts(filteredProducts, 'products-grid');
}

// Ordenar produtos
function sortProducts(sortBy) {
    switch (sortBy) {
        case 'name':
            filteredProducts.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'price-low':
            filteredProducts.sort((a, b) => (a.price?.final || 0) - (b.price?.final || 0));
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => (b.price?.final || 0) - (a.price?.final || 0));
            break;
        case 'rating':
            filteredProducts.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
            break;
    }
    
    displayProducts(filteredProducts, 'products-grid');
}

// Atualizar paginação
function updatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    // Botão anterior
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Anterior';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadProducts(currentPage - 1);
    pagination.appendChild(prevBtn);
    
    // Páginas
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => loadProducts(i);
        pagination.appendChild(pageBtn);
    }
    
    // Botão próximo
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Próximo';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => loadProducts(currentPage + 1);
    pagination.appendChild(nextBtn);
}

// Configurar formulário de contato
function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Simular envio do formulário
        showNotification('Mensagem enviada com sucesso!', 'success');
        form.reset();
    });
}

// Mostrar loading
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.id = 'loading';
    loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando produtos...';
    
    container.innerHTML = '';
    container.appendChild(loading);
}

// Esconder loading
function hideLoading(containerId) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

// Mostrar erro
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Remover notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Adicionar estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Obter ícone da notificação
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Obter cor da notificação
function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#28a745';
        case 'error': return '#dc3545';
        case 'warning': return '#ffc107';
        default: return '#17a2b8';
    }
}

// Debounce para busca
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Adicionar estilos para notificações
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .error-message {
        text-align: center;
        color: #dc3545;
        padding: 2rem;
        font-size: 1.1rem;
    }
    
    .no-products {
        text-align: center;
        color: #6c757d;
        padding: 3rem;
        font-size: 1.2rem;
    }
    
    .empty-cart {
        text-align: center;
        color: #6c757d;
        padding: 2rem;
        font-size: 1.1rem;
    }
`;
document.head.appendChild(notificationStyles);
