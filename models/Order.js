class Order {
    constructor(id, userId, items, totalAmount, status = 'pending', shippingAddress = null, createdAt = null, updatedAt = null) {
        this.id = id;
        this.userId = userId;
        this.items = items; // Array de {productId, productName, quantity, price, subtotal}
        this.totalAmount = totalAmount;
        this.status = status; // 'pending', 'paid', 'shipped', 'delivered', 'cancelled'
        this.shippingAddress = shippingAddress;
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
        this.cancellationReason = null;
        this.cancelledAt = null;
        this.deliveredAt = null;
        this.returnDeadline = null;
    }

    // Validar dados do pedido
    validate() {
        const errors = [];

        if (!this.userId) {
            errors.push('ID do usuário é obrigatório');
        }

        if (!this.items || this.items.length === 0) {
            errors.push('Pedido deve conter pelo menos um produto');
        }

        if (this.totalAmount <= 0) {
            errors.push('Valor total deve ser maior que zero');
        }

        if (!this.shippingAddress) {
            errors.push('Endereço de entrega é obrigatório');
        }

        // Validar itens
        this.items.forEach((item, index) => {
            if (!item.productId) {
                errors.push(`Item ${index + 1}: ID do produto é obrigatório`);
            }
            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Quantidade deve ser maior que zero`);
            }
            if (!item.price || item.price <= 0) {
                errors.push(`Item ${index + 1}: Preço deve ser maior que zero`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Atualizar status do pedido
    updateStatus(newStatus) {
        const validTransitions = {
            'pending': ['paid', 'cancelled'],
            'paid': ['shipped', 'cancelled'],
            'shipped': ['delivered'],
            'delivered': ['returned'],
            'cancelled': [],
            'returned': []
        };

        if (!validTransitions[this.status].includes(newStatus)) {
            throw new Error(`Transição de status inválida: ${this.status} → ${newStatus}`);
        }

        this.status = newStatus;
        this.updatedAt = new Date();

        // Definir data de entrega quando status for 'delivered'
        if (newStatus === 'delivered') {
            this.deliveredAt = new Date();
            this.returnDeadline = new Date();
            this.returnDeadline.setDate(this.returnDeadline.getDate() + 7); // 7 dias para devolução
        }
    }

    // Cancelar pedido
    cancel(reason) {
        if (!['pending', 'paid'].includes(this.status)) {
            throw new Error('Pedido não pode ser cancelado neste status');
        }

        if (!reason || reason.trim().length < 10) {
            throw new Error('Motivo do cancelamento deve ter pelo menos 10 caracteres');
        }

        this.status = 'cancelled';
        this.cancellationReason = reason;
        this.cancelledAt = new Date();
        this.updatedAt = new Date();
    }

    // Verificar se pode ser cancelado
    canBeCancelled() {
        return ['pending', 'paid'].includes(this.status);
    }

    // Verificar se pode ser devolvido
    canBeReturned() {
        if (this.status !== 'delivered' || !this.deliveredAt) {
            return false;
        }

        const now = new Date();
        const daysSinceDelivery = Math.floor((now - this.deliveredAt) / (1000 * 60 * 60 * 24));
        
        return daysSinceDelivery <= 7; // 7 dias para devolução
    }

    // Calcular total do pedido
    calculateTotal() {
        this.totalAmount = this.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
        return this.totalAmount;
    }

    // Adicionar item ao pedido
    addItem(productId, productName, quantity, price) {
        const existingItem = this.items.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.subtotal = existingItem.quantity * existingItem.price;
        } else {
            this.items.push({
                productId,
                productName,
                quantity,
                price,
                subtotal: quantity * price
            });
        }
        
        this.calculateTotal();
    }

    // Remover item do pedido
    removeItem(productId) {
        this.items = this.items.filter(item => item.productId !== productId);
        this.calculateTotal();
    }

    // Atualizar quantidade de item
    updateItemQuantity(productId, quantity) {
        const item = this.items.find(item => item.productId === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = quantity;
                item.subtotal = item.quantity * item.price;
                this.calculateTotal();
            }
        }
    }

    // Obter status em português
    getStatusLabel() {
        const statusLabels = {
            'pending': 'Aguardando Pagamento',
            'paid': 'Pago',
            'shipped': 'Em Transporte',
            'delivered': 'Entregue',
            'cancelled': 'Cancelado',
            'returned': 'Devolvido'
        };
        return statusLabels[this.status] || this.status;
    }

    // Obter cor do status
    getStatusColor() {
        const statusColors = {
            'pending': '#ff9800',
            'paid': '#4caf50',
            'shipped': '#2196f3',
            'delivered': '#8bc34a',
            'cancelled': '#f44336',
            'returned': '#9c27b0'
        };
        return statusColors[this.status] || '#666';
    }

    // Retornar dados sem informações sensíveis
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            items: this.items,
            totalAmount: this.totalAmount,
            status: this.status,
            statusLabel: this.getStatusLabel(),
            statusColor: this.getStatusColor(),
            shippingAddress: this.shippingAddress,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            cancellationReason: this.cancellationReason,
            cancelledAt: this.cancelledAt,
            deliveredAt: this.deliveredAt,
            returnDeadline: this.returnDeadline,
            canBeCancelled: this.canBeCancelled(),
            canBeReturned: this.canBeReturned()
        };
    }
}

module.exports = Order;