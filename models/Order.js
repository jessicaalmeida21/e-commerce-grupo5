class Order {
    constructor(id, clientId, status, paymentStatus, logisticStatus, total, shippingAddress, items = [], createdAt = null, updatedAt = null) {
        this.id = id;
        this.clientId = clientId;
        this.status = status; // 'pending', 'confirmed', 'cancelled', 'delivered'
        this.paymentStatus = paymentStatus; // 'pending', 'paid', 'failed', 'refunded'
        this.logisticStatus = logisticStatus; // 'awaiting_shipment', 'in_transit', 'delivered'
        this.total = total;
        this.shippingAddress = shippingAddress;
        this.items = items; // Array de OrderItem
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
    }

    // Validar dados do pedido
    validate() {
        const errors = [];

        if (!this.clientId) {
            errors.push('Cliente é obrigatório');
        }

        if (!this.items || this.items.length === 0) {
            errors.push('Pedido deve ter pelo menos um item');
        }

        if (!this.shippingAddress) {
            errors.push('Endereço de entrega é obrigatório');
        }

        if (this.total <= 0) {
            errors.push('Valor total deve ser maior que zero');
        }

        // Validar itens
        for (const item of this.items) {
            if (!item.productId || !item.quantity || item.quantity <= 0) {
                errors.push('Item inválido: produto e quantidade são obrigatórios');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Atualizar status do pedido
    updateStatus(newStatus) {
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'delivered'];
        if (validStatuses.includes(newStatus)) {
            this.status = newStatus;
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }

    // Atualizar status de pagamento
    updatePaymentStatus(newStatus) {
        const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
        if (validStatuses.includes(newStatus)) {
            this.paymentStatus = newStatus;
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }

    // Atualizar status logístico
    updateLogisticStatus(newStatus) {
        const validStatuses = ['awaiting_shipment', 'in_transit', 'delivered'];
        if (validStatuses.includes(newStatus)) {
            this.logisticStatus = newStatus;
            this.updatedAt = new Date();
            return true;
        }
        return false;
    }

    // Calcular total do pedido
    calculateTotal() {
        this.total = this.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        return this.total;
    }

    // Verificar se pode ser cancelado
    canBeCancelled() {
        return this.status === 'pending' && this.paymentStatus === 'pending';
    }

    // Verificar se pode ser devolvido
    canBeReturned() {
        const deliveredDate = new Date(this.updatedAt);
        const now = new Date();
        const daysDiff = Math.floor((now - deliveredDate) / (1000 * 60 * 60 * 24));
        
        return this.status === 'delivered' && daysDiff <= 7;
    }

    // Adicionar item ao pedido
    addItem(item) {
        const existingItem = this.items.find(i => i.productId === item.productId);
        if (existingItem) {
            existingItem.quantity += item.quantity;
        } else {
            this.items.push(item);
        }
        this.calculateTotal();
    }

    // Remover item do pedido
    removeItem(productId) {
        this.items = this.items.filter(item => item.productId !== productId);
        this.calculateTotal();
    }

    // Retornar dados para API
    toJSON() {
        return {
            id: this.id,
            clientId: this.clientId,
            status: this.status,
            paymentStatus: this.paymentStatus,
            logisticStatus: this.logisticStatus,
            total: this.total,
            shippingAddress: this.shippingAddress,
            items: this.items,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Criar pedido a partir de dados do banco
    static fromDatabase(row) {
        return new Order(
            row.id,
            row.client_id,
            row.status,
            row.payment_status,
            row.logistic_status,
            row.total,
            JSON.parse(row.shipping_address || '{}'),
            JSON.parse(row.items || '[]'),
            row.created_at,
            row.updated_at
        );
    }
}

// Classe para itens do pedido
class OrderItem {
    constructor(productId, name, price, quantity, imageUrl = null) {
        this.productId = productId;
        this.name = name;
        this.price = price;
        this.quantity = quantity;
        this.imageUrl = imageUrl;
    }

    // Calcular subtotal do item
    getSubtotal() {
        return this.price * this.quantity;
    }

    toJSON() {
        return {
            productId: this.productId,
            name: this.name,
            price: this.price,
            quantity: this.quantity,
            imageUrl: this.imageUrl,
            subtotal: this.getSubtotal()
        };
    }
}

module.exports = { Order, OrderItem };
