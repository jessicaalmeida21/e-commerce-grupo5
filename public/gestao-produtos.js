// Sistema de Gestão de Produtos
class ProductManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.productsPerPage = 10;
        this.currentProduct = null;
        this.pendingStockUpdate = null;
        
        this.init();
    }

    init() {
        this.checkOperatorAccess();
        this.setupEventListeners();
        this.loadCategories();
        this.loadProducts();
    }

    checkOperatorAccess() {
        const user = getCurrentUser();
        if (!user || !['operator', 'admin'].includes(user.role)) {
            alert('Acesso negado. Apenas operadores e administradores podem acessar esta página.');
            window.location.href = 'index.html';
            return;
        }
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('search-input').addEventListener('input', () => this.applyFilters());
        document.getElementById('category-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('sort-select').addEventListener('change', () => this.applyFilters());
        document.getElementById('sort-order').addEventListener('change', () => this.applyFilters());

        // Modais
        document.getElementById('close-modal').addEventListener('click', () => this.closeProductModal());
        document.getElementById('close-stock-modal').addEventListener('click', () => this.closeStockModal());
        document.getElementById('cancel-stock').addEventListener('click', () => this.closeStockModal());
        document.getElementById('confirm-stock').addEventListener('click', () => this.confirmStockUpdate());
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/products/categories');
            if (response.ok) {
                const data = await response.json();
                const categorySelect = document.getElementById('category-filter');
                
                data.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = this.capitalizeFirst(category);
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    async loadProducts() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.productsPerPage,
                search: document.getElementById('search-input').value,
                category: document.getElementById('category-filter').value,
                sortBy: document.getElementById('sort-select').value,
                sortOrder: document.getElementById('sort-order').value
            });

            const response = await fetch(`/api/products?${params}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.products = data.products;
                this.renderProducts();
                this.renderPagination(data.pagination);
            } else {
                this.showNotification('Erro ao carregar produtos', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    applyFilters() {
        this.currentPage = 1;
        this.loadProducts();
    }

    renderProducts() {
        const tbody = document.getElementById('products-tbody');
        tbody.innerHTML = '';

        if (this.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">Nenhum produto encontrado</td></tr>';
            return;
        }

        this.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${product.image}" alt="${product.name}" class="product-thumb">
                </td>
                <td>
                    <div class="product-name">${product.name}</div>
                </td>
                <td>
                    <span class="category-badge">${this.capitalizeFirst(product.category)}</span>
                </td>
                <td class="price">R$ ${product.price.toFixed(2).replace('.', ',')}</td>
                <td class="stock">
                    <span class="stock-amount ${product.stock < 10 ? 'low-stock' : ''}">${product.stock}</span>
                </td>
                <td>
                    <span class="status-badge status-${product.isActive ? 'active' : 'inactive'}">
                        ${product.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <button class="btn-icon btn-view" onclick="productManager.viewProduct(${product.id})" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-stock" onclick="productManager.openStockModal(${product.id})" 
                            title="Aumentar estoque" ${!product.isActive ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        
        if (pagination.totalPages <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Botão anterior
        if (pagination.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="productManager.goToPage(${pagination.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>`;
        }

        // Páginas
        for (let i = 1; i <= pagination.totalPages; i++) {
            if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 2 && i <= pagination.currentPage + 2)) {
                paginationHTML += `<button class="pagination-btn ${i === pagination.currentPage ? 'active' : ''}" 
                    onclick="productManager.goToPage(${i})">${i}</button>`;
            } else if (i === pagination.currentPage - 3 || i === pagination.currentPage + 3) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }

        // Botão próximo
        if (pagination.currentPage < pagination.totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="productManager.goToPage(${pagination.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>`;
        }

        paginationDiv.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadProducts();
    }

    async viewProduct(productId) {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentProduct = data.product;
                this.showProductDetails();
            } else {
                this.showNotification('Erro ao carregar detalhes do produto', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar produto:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    showProductDetails() {
        const modal = document.getElementById('product-modal');
        const details = document.getElementById('product-details');
        
        details.innerHTML = `
            <div class="product-detail-container">
                <div class="product-image">
                    <img src="${this.currentProduct.image}" alt="${this.currentProduct.name}">
                </div>
                <div class="product-info">
                    <h3>${this.currentProduct.name}</h3>
                    <p class="product-category">${this.capitalizeFirst(this.currentProduct.category)}</p>
                    <p class="product-price">R$ ${this.currentProduct.price.toFixed(2).replace('.', ',')}</p>
                    <p class="product-stock">Estoque: <strong>${this.currentProduct.stock} unidades</strong></p>
                    <p class="product-description">${this.currentProduct.description}</p>
                    <div class="product-status">
                        <span class="status-badge status-${this.currentProduct.isActive ? 'active' : 'inactive'}">
                            ${this.currentProduct.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                    ${this.currentProduct.maxStock ? `<p class="max-stock">Estoque máximo: ${this.currentProduct.maxStock} unidades</p>` : ''}
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-primary" onclick="productManager.openStockModal(${this.currentProduct.id})" 
                        ${!this.currentProduct.isActive ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i> Aumentar Estoque
                </button>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    closeProductModal() {
        document.getElementById('product-modal').style.display = 'none';
        this.currentProduct = null;
    }

    openStockModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        this.pendingStockUpdate = {
            productId: productId,
            product: product
        };

        // Gerar opções de lotes (10, 20, 30, 40, 50)
        const lotOptions = [10, 20, 30, 40, 50];
        const maxLot = product.maxStock ? Math.min(50, product.maxStock - product.stock) : 50;
        const availableLots = lotOptions.filter(lot => lot <= maxLot);

        if (availableLots.length === 0) {
            this.showNotification('Não é possível adicionar mais estoque. Limite máximo atingido.', 'error');
            return;
        }

        // Criar seletor de lotes
        const lotSelector = document.createElement('select');
        lotSelector.id = 'lot-selector';
        lotSelector.innerHTML = availableLots.map(lot => 
            `<option value="${lot}">+${lot} unidades</option>`
        ).join('');

        // Atualizar modal
        document.getElementById('confirm-product-image').src = product.image;
        document.getElementById('confirm-product-name').textContent = product.name;
        document.getElementById('confirm-product-category').textContent = this.capitalizeFirst(product.category);
        document.getElementById('confirm-current-stock').textContent = product.stock;
        
        // Atualizar quantidade e novo estoque
        const updateQuantities = () => {
            const quantity = parseInt(lotSelector.value);
            const newStock = product.stock + quantity;
            document.getElementById('confirm-quantity').textContent = quantity;
            document.getElementById('confirm-new-stock').textContent = newStock;
        };

        lotSelector.addEventListener('change', updateQuantities);
        updateQuantities();

        // Substituir o conteúdo do modal
        const stockOperation = document.querySelector('.stock-operation');
        stockOperation.innerHTML = `
            <div class="lot-selector">
                <label for="lot-selector">Selecione o lote:</label>
                ${lotSelector.outerHTML}
            </div>
            <p>Adicionar <strong id="confirm-quantity">${availableLots[0]}</strong> unidades ao estoque?</p>
            <p>Novo estoque será: <strong id="confirm-new-stock">${product.stock + availableLots[0]}</strong></p>
        `;

        // Reconfigurar event listener
        document.getElementById('lot-selector').addEventListener('change', updateQuantities);

        document.getElementById('stock-modal').style.display = 'flex';
    }

    closeStockModal() {
        document.getElementById('stock-modal').style.display = 'none';
        this.pendingStockUpdate = null;
    }

    async confirmStockUpdate() {
        if (!this.pendingStockUpdate) return;

        const lotSelector = document.getElementById('lot-selector');
        const quantity = parseInt(lotSelector.value);

        try {
            const response = await fetch(`/api/products/${this.pendingStockUpdate.productId}/stock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ quantity })
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification(`Estoque atualizado com sucesso! +${quantity} unidades adicionadas.`, 'success');
                this.closeStockModal();
                this.loadProducts(); // Recarregar lista
            } else {
                this.showNotification(result.error || 'Erro ao atualizar estoque', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showNotification(message, type = 'info') {
        // Usar a função de notificação do auth.js
        if (typeof auth !== 'undefined' && auth.showNotification) {
            auth.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    window.productManager = new ProductManager();
});
