class Payment {
    constructor(id, orderId, amount, method, status = 'pending', installments = 1, createdAt = null, updatedAt = null) {
        this.id = id;
        this.orderId = orderId;
        this.amount = amount;
        this.method = method; // 'credit_card', 'debit_card', 'pix'
        this.status = status; // 'pending', 'paid', 'failed', 'cancelled', 'expired'
        this.installments = installments;
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
        this.transactionId = null;
        this.pixData = null; // Para PIX: { txid, pixKey, qrCode, expiresAt }
        this.cardData = null; // Para cartão: { maskedPan, brand, last4 }
        this.installmentDetails = null; // Detalhes das parcelas
    }

    // Validar dados do pagamento
    validate() {
        const errors = [];

        if (!this.orderId) {
            errors.push('ID do pedido é obrigatório');
        }

        if (!this.amount || this.amount <= 0) {
            errors.push('Valor deve ser maior que zero');
        }

        if (!this.method || !['credit_card', 'debit_card', 'pix'].includes(this.method)) {
            errors.push('Método de pagamento inválido');
        }

        if (this.installments < 1 || this.installments > 10) {
            errors.push('Número de parcelas deve ser entre 1 e 10');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Atualizar status do pagamento
    updateStatus(newStatus, transactionId = null) {
        const validTransitions = {
            'pending': ['paid', 'failed', 'cancelled', 'expired'],
            'paid': [],
            'failed': ['pending'],
            'cancelled': [],
            'expired': []
        };

        if (!validTransitions[this.status].includes(newStatus)) {
            throw new Error(`Transição de status inválida: ${this.status} → ${newStatus}`);
        }

        this.status = newStatus;
        this.updatedAt = new Date();
        
        if (transactionId) {
            this.transactionId = transactionId;
        }
    }

    // Calcular parcelas com juros (fórmula Price)
    calculateInstallments(principal, installments, monthlyRate = 0.01) {
        if (installments === 1) {
            return {
                installments: 1,
                installmentAmount: principal,
                totalWithInterest: principal,
                totalInterest: 0,
                details: [{
                    installment: 1,
                    amount: principal,
                    dueDate: new Date()
                }]
            };
        }

        // Fórmula Price: PMT = P * [i(1+i)^n] / [(1+i)^n - 1]
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, installments)) / 
                              (Math.pow(1 + monthlyRate, installments) - 1);
        
        const totalWithInterest = monthlyPayment * installments;
        const totalInterest = totalWithInterest - principal;

        const details = [];
        const currentDate = new Date();
        
        for (let i = 1; i <= installments; i++) {
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            
            details.push({
                installment: i,
                amount: Math.round(monthlyPayment * 100) / 100,
                dueDate: dueDate
            });
        }

        // Ajustar última parcela para compensar arredondamentos
        const totalCalculated = details.reduce((sum, detail) => sum + detail.amount, 0);
        const difference = totalWithInterest - totalCalculated;
        if (details.length > 0) {
            details[details.length - 1].amount += difference;
        }

        return {
            installments: installments,
            installmentAmount: Math.round(monthlyPayment * 100) / 100,
            totalWithInterest: Math.round(totalWithInterest * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            details: details
        };
    }

    // Validar cartão de crédito/débito
    validateCard(pan, cvv, expiryMonth, expiryYear, brand) {
        const errors = [];

        // Validar PAN
        if (!pan || pan.length < 13 || pan.length > 19) {
            errors.push('Número do cartão inválido');
        }

        // Validar CVV
        if (!cvv || cvv.length < 3 || cvv.length > 4) {
            errors.push('CVV inválido');
        }

        // Validar data de expiração
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
            errors.push('Cartão expirado');
        }

        // Validar bandeira
        if (!brand || !['visa', 'mastercard'].includes(brand.toLowerCase())) {
            errors.push('Bandeira não suportada');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validar PIX
    validatePix(payerCpf = null, payerCnpj = null) {
        const errors = [];

        if (!payerCpf && !payerCnpj) {
            errors.push('CPF ou CNPJ é obrigatório para PIX');
        }

        if (payerCpf && (payerCpf.length !== 11 || !/^\d{11}$/.test(payerCpf))) {
            errors.push('CPF inválido');
        }

        if (payerCnpj && (payerCnpj.length !== 14 || !/^\d{14}$/.test(payerCnpj))) {
            errors.push('CNPJ inválido');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Mascarar PAN
    maskPan(pan) {
        if (!pan || pan.length < 4) return pan;
        const last4 = pan.slice(-4);
        const masked = '*'.repeat(pan.length - 4);
        return masked + last4;
    }

    // Gerar dados PIX
    generatePixData() {
        const txid = 'pix_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        this.pixData = {
            txid: txid,
            pixKey: 'pix@e2etreinamentos.com.br',
            qrCode: `pix.qr.com/${txid}`,
            expiresAt: expiresAt
        };

        return this.pixData;
    }

    // Obter status em português
    getStatusLabel() {
        const statusLabels = {
            'pending': 'Pendente',
            'paid': 'Pago',
            'failed': 'Falhou',
            'cancelled': 'Cancelado',
            'expired': 'Expirado'
        };
        return statusLabels[this.status] || this.status;
    }

    // Obter cor do status
    getStatusColor() {
        const statusColors = {
            'pending': '#ffc107',
            'paid': '#28a745',
            'failed': '#dc3545',
            'cancelled': '#6c757d',
            'expired': '#fd7e14'
        };
        return statusColors[this.status] || '#666';
    }

    // Retornar dados sem informações sensíveis
    toJSON() {
        return {
            id: this.id,
            orderId: this.orderId,
            amount: this.amount,
            method: this.method,
            status: this.status,
            statusLabel: this.getStatusLabel(),
            statusColor: this.getStatusColor(),
            installments: this.installments,
            transactionId: this.transactionId,
            pixData: this.pixData,
            cardData: this.cardData ? {
                maskedPan: this.maskPan(this.cardData.pan),
                brand: this.cardData.brand,
                last4: this.cardData.last4
            } : null,
            installmentDetails: this.installmentDetails,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Payment;