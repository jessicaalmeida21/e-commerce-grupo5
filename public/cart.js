// Sistema de Carrinho de Compras
class CartManager {
    constructor() {
        this.cart = { items: [], total: 0, itemCount: 0 };
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.loadCart();
    }

    checkAuthStatus() {
        const user = getCurrentUser();
        if (!user) {
            alert('Você precisa estar logado para acessar o carrinho.');
            window.location.href = 'login.html';
            return;
        }
    }

    setupEventListeners() {
        // Botão limpar carrinho
        document.getElementById('clear-cart-btn').addEventListener('click', () => {
            this.showConfirmationModal(
                'Tem certeza que deseja limpar o carrinho?',
                () => this.clearCart()
            );
        });

        // Botão finalizar compra
        document.getElementById('checkout-btn').addEventListener('click', () => {
            this.checkout();
        });

        // Modal de confirmação
        document.getElementById('close-confirmation-modal').addEventListener('click', () => {
            this.closeConfirmationModal();
        });
        document.getElementById('cancel-confirmation-btn').addEventListener('click', () => {
            this.closeConfirmationModal();
        });
        document.getElementById('confirm-action-btn').addEventListener('click', () => {
            this.executeConfirmedAction();
        });
    }

    async loadCart() {
        try {
            const response = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.cart = data;
                this.renderCart();
            } else {
                this.showNotification('Erro ao carregar carrinho', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar carrinho:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    renderCart() {
        const emptyCart = document.getElementById('empty-cart');
        const cartItems = document.getElementById('cart-items');
        const cartSummary = document.getElementById('cart-summary-section');
        const cartSummaryText = document.getElementById('cart-summary');

        if (this.cart.items.length === 0) {
            emptyCart.style.display = 'block';
            cartItems.style.display = 'none';
            cartSummary.style.display = 'none';
            cartSummaryText.textContent = '0 itens no carrinho';
            document.getElementById('clear-cart-btn').style.display = 'none';
            return;
        }

        emptyCart.style.display = 'none';
        cartItems.style.display = 'block';
        cartSummary.style.display = 'block';
        cartSummaryText.textContent = `${this.cart.itemCount} ${this.cart.itemCount === 1 ? 'item' : 'itens'} no carrinho`;
        document.getElementById('clear-cart-btn').style.display = 'block';

        this.renderCartItems();
        this.renderCartSummary();
    }

    renderCartItems() {
        const cartItemsList = document.getElementById('cart-items-list');
        cartItemsList.innerHTML = '';

        this.cart.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="item-image">
                    <img src="${item.product?.image || 'https://via.placeholder.com/100x100?text=Produto'}" alt="${item.productName}">
                </div>
                <div class="item-details">
                    <h4 class="item-name">${item.productName}</h4>
                    <p class="item-price">R$ ${item.price.toFixed(2).replace('.', ',')}</p>
                </div>
                <div class="item-quantity">
                    <button class="quantity-btn" onclick="cartManager.updateQuantity(${item.productId}, ${item.quantity - 1})">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="cartManager.updateQuantity(${item.productId}, ${item.quantity + 1})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="item-subtotal">
                    <span class="subtotal">R$ ${item.subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-remove" onclick="cartManager.removeItem(${item.productId})" title="Remover item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            cartItemsList.appendChild(itemElement);
        });
    }

    renderCartSummary() {
        const subtotal = this.cart.total;
        const shipping = this.calculateShipping(subtotal);
        const total = subtotal + shipping;

        document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        document.getElementById('shipping').textContent = `R$ ${shipping.toFixed(2).replace('.', ',')}`;
        document.getElementById('total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    calculateShipping(subtotal) {
        // Frete grátis para compras acima de R$ 200
        if (subtotal >= 200) {
            return 0;
        }
        // Frete fixo de R$ 15 para compras abaixo de R$ 200
        return 15;
    }

    async updateQuantity(productId, newQuantity) {
        if (newQuantity < 0) return;

        try {
            const response = await fetch('/api/cart/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ productId, quantity: newQuantity })
            });

            if (response.ok) {
                const data = await response.json();
                this.cart = data.cart;
                this.renderCart();
                this.updateCartCount();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Erro ao atualizar quantidade', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar quantidade:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    async removeItem(productId) {
        this.showConfirmationModal(
            'Tem certeza que deseja remover este item do carrinho?',
            () => this.executeRemoveItem(productId)
        );
    }

    async executeRemoveItem(productId) {
        try {
            const response = await fetch('/api/cart/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ productId })
            });

            if (response.ok) {
                const data = await response.json();
                this.cart = data.cart;
                this.renderCart();
                this.updateCartCount();
                this.showNotification('Item removido do carrinho', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Erro ao remover item', 'error');
            }
        } catch (error) {
            console.error('Erro ao remover item:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    async clearCart() {
        try {
            const response = await fetch('/api/cart/clear', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.cart = data.cart;
                this.renderCart();
                this.updateCartCount();
                this.showNotification('Carrinho limpo', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Erro ao limpar carrinho', 'error');
            }
        } catch (error) {
            console.error('Erro ao limpar carrinho:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    checkout() {
        if (this.cart.items.length === 0) {
            this.showNotification('Carrinho vazio', 'error');
            return;
        }

        // Redirecionar para página de checkout
        window.location.href = 'checkout.html';
    }

    updateCartCount() {
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = this.cart.itemCount;
        }
    }

    showConfirmationModal(message, callback) {
        document.getElementById('confirmation-message').textContent = message;
        document.getElementById('confirmation-modal').style.display = 'flex';
        this.pendingAction = callback;
    }

    closeConfirmationModal() {
        document.getElementById('confirmation-modal').style.display = 'none';
        this.pendingAction = null;
    }

    executeConfirmedAction() {
        if (this.pendingAction) {
            this.pendingAction();
        }
        this.closeConfirmationModal();
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
    window.cartManager = new CartManager();
});
