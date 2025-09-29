// Sistema de Wishlist (Lista de Desejos)
class WishlistSystem {
    constructor() {
        this.wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateWishlistUI();
        this.addWishlistButtonsToProducts();
    }

    setupEventListeners() {
        // Toggle wishlist modal
        const wishlistToggle = document.getElementById('wishlist-toggle');
        if (wishlistToggle) {
            wishlistToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleWishlistModal();
            });
        }

        // Close wishlist modal
        const closeWishlist = document.getElementById('close-wishlist');
        if (closeWishlist) {
            closeWishlist.addEventListener('click', () => this.closeWishlistModal());
        }

        // Clear wishlist
        const clearWishlistBtn = document.getElementById('clear-wishlist-btn');
        if (clearWishlistBtn) {
            clearWishlistBtn.addEventListener('click', () => this.clearWishlist());
        }

        // Close modal when clicking outside
        const wishlistModal = document.getElementById('wishlist-modal');
        if (wishlistModal) {
            wishlistModal.addEventListener('click', (e) => {
                if (e.target === wishlistModal) {
                    this.closeWishlistModal();
                }
            });
        }
    }

    addWishlistButtonsToProducts() {
        // Adicionar botões de wishlist aos produtos existentes
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            if (!card.querySelector('.wishlist-btn')) {
                this.addWishlistButtonToCard(card);
            }
        });
    }

    addWishlistButtonToCard(card) {
        const wishlistBtn = document.createElement('button');
        wishlistBtn.className = 'wishlist-btn';
        wishlistBtn.innerHTML = '<i class="far fa-heart"></i>';
        
        const productId = card.dataset.productId || card.querySelector('[data-product-id]')?.dataset.productId;
        if (productId) {
            wishlistBtn.dataset.productId = productId;
            wishlistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleWishlistItem(productId, card);
            });
        }

        // Posicionar o botão no card
        card.style.position = 'relative';
        card.appendChild(wishlistBtn);

        // Atualizar estado do botão
        this.updateWishlistButtonState(wishlistBtn, productId);
    }

    toggleWishlistItem(productId, card) {
        const product = this.getProductFromCard(card);
        if (!product) return;

        const existingItem = this.wishlist.find(item => item.id === productId);
        
        if (existingItem) {
            this.removeFromWishlist(productId);
        } else {
            this.addToWishlist(product);
        }

        this.updateWishlistUI();
        this.updateWishlistButtonState(card.querySelector('.wishlist-btn'), productId);
    }

    getProductFromCard(card) {
        const title = card.querySelector('.product-title')?.textContent || '';
        const price = card.querySelector('.product-price')?.textContent || '';
        const image = card.querySelector('.product-image')?.src || '';
        const category = card.querySelector('.product-category')?.textContent || '';
        const productId = card.dataset.productId || card.querySelector('[data-product-id]')?.dataset.productId;

        if (!productId) return null;

        return {
            id: productId,
            title: title.trim(),
            price: this.parsePrice(price),
            image: image,
            category: category.trim()
        };
    }

    parsePrice(priceText) {
        const match = priceText.match(/R\$\s*(\d+(?:,\d{2})?)/);
        return match ? parseFloat(match[1].replace(',', '.')) : 0;
    }

    addToWishlist(product) {
        if (!this.wishlist.find(item => item.id === product.id)) {
            this.wishlist.push({
                ...product,
                addedAt: new Date().toISOString()
            });
            this.saveWishlist();
            this.showNotification('Produto adicionado à lista de desejos!', 'success');
        }
    }

    removeFromWishlist(productId) {
        this.wishlist = this.wishlist.filter(item => item.id !== productId);
        this.saveWishlist();
        this.showNotification('Produto removido da lista de desejos!', 'info');
    }

    clearWishlist() {
        if (this.wishlist.length === 0) return;
        
        if (confirm('Tem certeza que deseja limpar toda a lista de desejos?')) {
            this.wishlist = [];
            this.saveWishlist();
            this.updateWishlistUI();
            this.showNotification('Lista de desejos limpa!', 'info');
        }
    }

    saveWishlist() {
        localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
    }

    updateWishlistUI() {
        this.updateWishlistCounter();
        this.updateWishlistModal();
    }

    updateWishlistCounter() {
        const counter = document.getElementById('wishlist-count');
        const totalCounter = document.getElementById('wishlist-total-count');
        
        if (counter) {
            counter.textContent = this.wishlist.length;
            counter.style.display = this.wishlist.length > 0 ? 'flex' : 'none';
        }
        
        if (totalCounter) {
            totalCounter.textContent = this.wishlist.length;
        }
    }

    updateWishlistModal() {
        const wishlistItems = document.getElementById('wishlist-items');
        if (!wishlistItems) return;

        if (this.wishlist.length === 0) {
            wishlistItems.innerHTML = `
                <div class="empty-wishlist">
                    <i class="fas fa-heart-broken"></i>
                    <h3>Sua lista de desejos está vazia</h3>
                    <p>Adicione produtos que você gostaria de comprar mais tarde clicando no ícone de coração nos produtos.</p>
                </div>
            `;
        } else {
            wishlistItems.innerHTML = this.wishlist.map(item => `
                <div class="wishlist-item" data-product-id="${item.id}">
                    <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/80x80?text=Produto'">
                    <div class="wishlist-item-info">
                        <h4>${item.title}</h4>
                        <div class="wishlist-item-price">R$ ${item.price.toFixed(2).replace('.', ',')}</div>
                        <div class="wishlist-item-category">${item.category}</div>
                    </div>
                    <div class="wishlist-item-actions">
                        <button class="btn-add-to-cart" onclick="wishlistSystem.addToCartFromWishlist('${item.id}')">
                            <i class="fas fa-shopping-cart"></i> Adicionar ao Carrinho
                        </button>
                        <button class="btn-remove-wishlist" onclick="wishlistSystem.removeFromWishlist('${item.id}')">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    updateWishlistButtonState(button, productId) {
        if (!button) return;
        
        const isInWishlist = this.wishlist.some(item => item.id === productId);
        button.classList.toggle('active', isInWishlist);
        
        const icon = button.querySelector('i');
        if (icon) {
            icon.className = isInWishlist ? 'fas fa-heart' : 'far fa-heart';
        }
    }

    addToCartFromWishlist(productId) {
        const wishlistItem = this.wishlist.find(item => item.id === productId);
        if (!wishlistItem) return;

        // Adicionar ao carrinho (usar função existente do carrinho)
        if (typeof addToCart === 'function') {
            addToCart(wishlistItem.id, wishlistItem.title, wishlistItem.price, wishlistItem.image);
            this.showNotification('Produto adicionado ao carrinho!', 'success');
        } else {
            // Fallback: adicionar diretamente ao localStorage do carrinho
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const existingItem = cart.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: wishlistItem.title,
                    price: wishlistItem.price,
                    image: wishlistItem.image,
                    quantity: 1
                });
            }
            
            localStorage.setItem('cart', JSON.stringify(cart));
            this.showNotification('Produto adicionado ao carrinho!', 'success');
            
            // Atualizar contador do carrinho se existir
            if (typeof updateCartUI === 'function') {
                updateCartUI();
            }
        }
    }

    toggleWishlistModal() {
        const modal = document.getElementById('wishlist-modal');
        if (modal) {
            modal.classList.add('show');
            this.updateWishlistModal();
        }
    }

    closeWishlistModal() {
        const modal = document.getElementById('wishlist-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    showNotification(message, type = 'info') {
        // Criar notificação toast
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Mostrar notificação
        setTimeout(() => notification.classList.add('show'), 100);

        // Remover notificação após 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Método para adicionar produtos dinamicamente (quando produtos são carregados via API)
    refreshWishlistButtons() {
        this.addWishlistButtonsToProducts();
        
        // Atualizar estado de todos os botões
        const wishlistButtons = document.querySelectorAll('.wishlist-btn');
        wishlistButtons.forEach(button => {
            const productId = button.dataset.productId;
            if (productId) {
                this.updateWishlistButtonState(button, productId);
            }
        });
    }
}

// Inicializar sistema de wishlist
let wishlistSystem;

document.addEventListener('DOMContentLoaded', function() {
    wishlistSystem = new WishlistSystem();
    
    // Atualizar botões quando produtos são carregados
    const observer = new MutationObserver(() => {
        wishlistSystem.refreshWishlistButtons();
    });
    
    const productsContainer = document.getElementById('featured-products') || document.getElementById('products-grid');
    if (productsContainer) {
        observer.observe(productsContainer, { childList: true, subtree: true });
    }
});

// Exportar para uso global
window.wishlistSystem = wishlistSystem;
