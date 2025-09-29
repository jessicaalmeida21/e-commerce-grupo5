class Logistics {
    constructor(id, orderId, status = 'awaiting_shipment', createdAt = null, updatedAt = null) {
        this.id = id;
        this.orderId = orderId;
        this.status = status; // 'awaiting_shipment', 'in_transit', 'delivered'
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
        this.history = []; // Histórico de movimentações
        this.shippingDate = null;
        this.deliveryDate = null;
        this.trackingCode = null;
        this.carrier = null;
    }

    // Validar dados da logística
    validate() {
        const errors = [];

        if (!this.orderId) {
            errors.push('ID do pedido é obrigatório');
        }

        if (!this.status || !['awaiting_shipment', 'in_transit', 'delivered'].includes(this.status)) {
            errors.push('Status logístico inválido');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Atualizar status logístico
    updateStatus(newStatus, reason = null, updatedBy = 'system') {
        const validTransitions = {
            'awaiting_shipment': ['in_transit', 'delivered'],
            'in_transit': ['delivered'],
            'delivered': []
        };

        if (!validTransitions[this.status].includes(newStatus)) {
            throw new Error(`Transição de status inválida: ${this.status} → ${newStatus}`);
        }

        const oldStatus = this.status;
        this.status = newStatus;
        this.updatedAt = new Date();

        // Registrar no histórico
        this.addToHistory({
            fromStatus: oldStatus,
            toStatus: newStatus,
            reason: reason,
            updatedBy: updatedBy,
            timestamp: new Date()
        });

        // Definir datas específicas
        if (newStatus === 'in_transit' && !this.shippingDate) {
            this.shippingDate = new Date();
        }

        if (newStatus === 'delivered' && !this.deliveryDate) {
            this.deliveryDate = new Date();
        }
    }

    // Adicionar entrada ao histórico
    addToHistory(entry) {
        this.history.push({
            id: this.history.length + 1,
            ...entry
        });
    }

    // Corrigir status (apenas para administradores)
    correctStatus(newStatus, reason, updatedBy) {
        if (!reason || reason.trim().length < 10) {
            throw new Error('Motivo da correção deve ter pelo menos 10 caracteres');
        }

        const oldStatus = this.status;
        this.status = newStatus;
        this.updatedAt = new Date();

        // Registrar correção no histórico
        this.addToHistory({
            fromStatus: oldStatus,
            toStatus: newStatus,
            reason: reason,
            updatedBy: updatedBy,
            timestamp: new Date(),
            isCorrection: true
        });
    }

    // Gerar código de rastreamento
    generateTrackingCode() {
        if (!this.trackingCode) {
            const prefix = 'E2E';
            const timestamp = Date.now().toString().slice(-8);
            const random = Math.random().toString(36).substr(2, 4).toUpperCase();
            this.trackingCode = `${prefix}${timestamp}${random}`;
        }
        return this.trackingCode;
    }

    // Definir transportadora
    setCarrier(carrierName) {
        this.carrier = carrierName;
        this.generateTrackingCode();
    }

    // Verificar se pode ser atualizado
    canBeUpdated() {
        return this.status !== 'delivered';
    }

    // Obter status em português
    getStatusLabel() {
        const statusLabels = {
            'awaiting_shipment': 'Aguardando Envio',
            'in_transit': 'Em Transporte',
            'delivered': 'Entregue'
        };
        return statusLabels[this.status] || this.status;
    }

    // Obter cor do status
    getStatusColor() {
        const statusColors = {
            'awaiting_shipment': '#ffc107',
            'in_transit': '#17a2b8',
            'delivered': '#28a745'
        };
        return statusColors[this.status] || '#666';
    }

    // Obter ícone do status
    getStatusIcon() {
        const statusIcons = {
            'awaiting_shipment': 'fas fa-clock',
            'in_transit': 'fas fa-truck',
            'delivered': 'fas fa-check-circle'
        };
        return statusIcons[this.status] || 'fas fa-question';
    }

    // Calcular tempo de entrega
    getDeliveryTime() {
        if (!this.shippingDate) return null;

        const endDate = this.deliveryDate || new Date();
        const diffTime = endDate - this.shippingDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    // Obter progresso da entrega (0-100%)
    getDeliveryProgress() {
        const progress = {
            'awaiting_shipment': 0,
            'in_transit': 50,
            'delivered': 100
        };
        return progress[this.status] || 0;
    }

    // Retornar dados sem informações sensíveis
    toJSON() {
        return {
            id: this.id,
            orderId: this.orderId,
            status: this.status,
            statusLabel: this.getStatusLabel(),
            statusColor: this.getStatusColor(),
            statusIcon: this.getStatusIcon(),
            shippingDate: this.shippingDate,
            deliveryDate: this.deliveryDate,
            trackingCode: this.trackingCode,
            carrier: this.carrier,
            deliveryTime: this.getDeliveryTime(),
            progress: this.getDeliveryProgress(),
            canBeUpdated: this.canBeUpdated(),
            history: this.history.map(entry => ({
                ...entry,
                statusLabel: this.getStatusLabelForStatus(entry.toStatus),
                timeAgo: this.getTimeAgo(entry.timestamp)
            })),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Obter label de status para histórico
    getStatusLabelForStatus(status) {
        const statusLabels = {
            'awaiting_shipment': 'Aguardando Envio',
            'in_transit': 'Em Transporte',
            'delivered': 'Entregue'
        };
        return statusLabels[status] || status;
    }

    // Calcular tempo decorrido
    getTimeAgo(timestamp) {
        const now = new Date();
        const diffTime = now - timestamp;
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffMinutes < 60) {
            return `${diffMinutes} min atrás`;
        } else if (diffHours < 24) {
            return `${diffHours}h atrás`;
        } else {
            return `${diffDays} dias atrás`;
        }
    }
}

module.exports = Logistics;
