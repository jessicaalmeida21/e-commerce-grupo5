// Sistema de Pedidos
class OrdersManager {
    constructor() {
        this.orders = [];
        this.currentOrder = null;
        this.filters = {
            status: '',
            date: ''
        };
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.loadOrders();
    }

    checkAuthStatus() {
        const user = getCurrentUser();
        if (!user) {
            alert('Você precisa estar logado para acessar seus pedidos.');
            window.location.href = 'login.html';
            return;
        }
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('apply-filters-btn').addEventListener('click', () => this.applyFilters());
        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
        });
        document.getElementById('date-filter').addEventListener('change', (e) => {
            this.filters.date = e.target.value;
        });

        // Modais
        document.getElementById('close-order-modal').addEventListener('click', () => this.closeOrderModal());
        document.getElementById('close-cancel-modal').addEventListener('click', () => this.closeCancelModal());
        document.getElementById('cancel-cancel-btn').addEventListener('click', () => this.closeCancelModal());
        document.getElementById('confirm-cancel-btn').addEventListener('click', () => this.confirmCancelOrder());
    }

    async loadOrders() {
        try {
            const response = await fetch('/api/orders', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.orders = data.orders;
                this.renderOrders();
            } else {
                this.showNotification('Erro ao carregar pedidos', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar pedidos:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    applyFilters() {
        this.renderOrders();
    }

    renderOrders() {
        const ordersList = document.getElementById('orders-list');
        const emptyOrders = document.getElementById('empty-orders');

        // Aplicar filtros
        let filteredOrders = this.orders;

        if (this.filters.status) {
            filteredOrders = filteredOrders.filter(order => order.status === this.filters.status);
        }

        if (this.filters.date) {
            const days = parseInt(this.filters.date);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = new Date(order.createdAt);
                return orderDate >= cutoffDate;
            });
        }

        if (filteredOrders.length === 0) {
            ordersList.style.display = 'none';
            emptyOrders.style.display = 'block';
            return;
        }

        ordersList.style.display = 'block';
        emptyOrders.style.display = 'none';

        // Renderizar pedidos
        ordersList.innerHTML = '';
        filteredOrders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-card';
            orderElement.innerHTML = `
                <div class="order-header">
                    <div class="order-info">
                        <h3>Pedido #${order.id}</h3>
                        <p class="order-date">${this.formatDate(order.createdAt)}</p>
                    </div>
                    <div class="order-status">
                        <span class="status-badge status-${order.status}" style="background-color: ${order.statusColor}">
                            ${order.statusLabel}
                        </span>
                    </div>
                </div>
                <div class="order-content">
                    <div class="order-items">
                        ${order.items.map(item => `
                            <div class="order-item">
                                <div class="item-info">
                                    <h4>${item.productName}</h4>
                                    <p>Quantidade: ${item.quantity}</p>
                                </div>
                                <div class="item-price">
                                    R$ ${item.subtotal.toFixed(2).replace('.', ',')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-total">
                        <strong>Total: R$ ${order.totalAmount.toFixed(2).replace('.', ',')}</strong>
                    </div>
                </div>
                <div class="order-actions">
                    <button class="btn-secondary" onclick="ordersManager.viewOrder(${order.id})">
                        <i class="fas fa-eye"></i> Ver Detalhes
                    </button>
                    ${order.canBeCancelled ? `
                        <button class="btn-danger" onclick="ordersManager.cancelOrder(${order.id})">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    ` : ''}
                    ${order.canBeReturned ? `
                        <button class="btn-warning" onclick="ordersManager.returnOrder(${order.id})">
                            <i class="fas fa-undo"></i> Devolver
                        </button>
                    ` : ''}
                </div>
            `;
            ordersList.appendChild(orderElement);
        });
    }

    async viewOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentOrder = data.order;
                this.showOrderDetails();
            } else {
                this.showNotification('Erro ao carregar detalhes do pedido', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar pedido:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    showOrderDetails() {
        const modal = document.getElementById('order-detail-modal');
        const content = document.getElementById('order-details-content');

        content.innerHTML = `
            <div class="order-detail-header">
                <h3>Pedido #${this.currentOrder.id}</h3>
                <span class="status-badge status-${this.currentOrder.status}" style="background-color: ${this.currentOrder.statusColor}">
                    ${this.currentOrder.statusLabel}
                </span>
            </div>

            <div class="order-detail-content">
                <div class="detail-section">
                    <h4>Informações do Pedido</h4>
                    <p><strong>Data:</strong> ${this.formatDate(this.currentOrder.createdAt)}</p>
                    <p><strong>Total:</strong> R$ ${this.currentOrder.totalAmount.toFixed(2).replace('.', ',')}</p>
                    ${this.currentOrder.cancellationReason ? `
                        <p><strong>Motivo do Cancelamento:</strong> ${this.currentOrder.cancellationReason}</p>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h4>Endereço de Entrega</h4>
                    <p>${this.currentOrder.shippingAddress.fullAddress}</p>
                </div>

                <div class="detail-section">
                    <h4>Produtos</h4>
                    <div class="order-items-detail">
                        ${this.currentOrder.items.map(item => `
                            <div class="order-item-detail">
                                <div class="item-info">
                                    <h5>${item.productName}</h5>
                                    <p>Quantidade: ${item.quantity}</p>
                                    <p>Preço unitário: R$ ${item.price.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div class="item-subtotal">
                                    R$ ${item.subtotal.toFixed(2).replace('.', ',')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    closeOrderModal() {
        document.getElementById('order-detail-modal').style.display = 'none';
        this.currentOrder = null;
    }

    cancelOrder(orderId) {
        this.currentOrder = this.orders.find(o => o.id === orderId);
        document.getElementById('cancel-modal').style.display = 'flex';
        document.getElementById('cancel-reason').value = '';
    }

    closeCancelModal() {
        document.getElementById('cancel-modal').style.display = 'none';
        this.currentOrder = null;
    }

    async confirmCancelOrder() {
        const reason = document.getElementById('cancel-reason').value.trim();

        if (!reason || reason.length < 10) {
            this.showNotification('Motivo do cancelamento deve ter pelo menos 10 caracteres', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/orders/${this.currentOrder.id}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                this.showNotification('Pedido cancelado com sucesso', 'success');
                this.closeCancelModal();
                this.loadOrders(); // Recarregar lista
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Erro ao cancelar pedido', 'error');
            }
        } catch (error) {
            console.error('Erro ao cancelar pedido:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    async returnOrder(orderId) {
        const reason = prompt('Informe o motivo da devolução:');
        
        if (!reason || reason.trim().length < 10) {
            this.showNotification('Motivo da devolução deve ter pelo menos 10 caracteres', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/orders/${orderId}/return`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ reason: reason.trim() })
            });

            if (response.ok) {
                this.showNotification('Devolução solicitada com sucesso', 'success');
                this.loadOrders(); // Recarregar lista
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Erro ao solicitar devolução', 'error');
            }
        } catch (error) {
            console.error('Erro ao solicitar devolução:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
    window.ordersManager = new OrdersManager();
});
