const express = require('express');
const Payment = require('../models/Payment');
const router = express.Router();

// Mock de banco de dados em memória para pagamentos
let payments = [];

// Mock de dados hardcoded para validação
const mockCardData = {
    // Cartões de crédito VISA
    visa: [
        { pan: '4111111111111111', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'approved' },
        { pan: '4000000000000002', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'insufficient_funds' },
        { pan: '4000000000000069', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'expired_card' },
        { pan: '4000000000000127', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'invalid_cvv' },
        { pan: '4000000000000119', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'do_not_honor' },
        { pan: '4000000000000259', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'limit_exceeded' }
    ],
    // Cartões de crédito MASTERCARD
    mastercard: [
        { pan: '5555555555554444', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'approved' },
        { pan: '5200000000000007', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'insufficient_funds' },
        { pan: '5200000000000023', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'expired_card' },
        { pan: '5200000000000031', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'invalid_cvv' },
        { pan: '5200000000000049', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'do_not_honor' },
        { pan: '5200000000000056', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'limit_exceeded' }
    ],
    // Cartões de débito VISA
    visaDebit: [
        { pan: '4111111111111111', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'approved' },
        { pan: '4000000000000002', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'insufficient_funds' }
    ],
    // Cartões de débito MASTERCARD
    mastercardDebit: [
        { pan: '5555555555554444', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'approved' },
        { pan: '5200000000000007', cvv: '123', expiryMonth: 12, expiryYear: 2025, result: 'declined', errorCode: 'insufficient_funds' }
    ]
};

// Mock de chaves PIX
const mockPixKeys = [
    'pix@e2etreinamentos.com.br',
    '11999999999',
    '12345678901',
    '12345678000195'
];

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'e2e-commerce-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// POST /api/payments/quote - Obter cotação de parcelas
router.post('/quote', (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }

        const payment = new Payment('temp', 'temp', amount, 'credit_card');
        
        // Calcular parcelas de 1x a 10x
        const quotes = [];
        
        for (let installments = 1; installments <= 10; installments++) {
            const quote = payment.calculateInstallments(amount, installments);
            quotes.push({
                installments: installments,
                installmentAmount: quote.installmentAmount,
                totalWithInterest: quote.totalWithInterest,
                totalInterest: quote.totalInterest,
                interestRate: installments === 1 ? 0 : 1 // 1% a.m.
            });
        }

        res.json({
            amount: amount,
            quotes: quotes,
            cashDiscount: 0, // Sem desconto à vista
            minInstallmentAmount: 5.00 // Valor mínimo por parcela
        });

    } catch (error) {
        console.error('Erro na cotação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/payments/credit-card - Processar pagamento com cartão de crédito
router.post('/credit-card', authenticateToken, (req, res) => {
    try {
        const { orderId, amount, pan, cvv, expiryMonth, expiryYear, installments } = req.body;

        if (!orderId || !amount || !pan || !cvv || !expiryMonth || !expiryYear || !installments) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        // Validar dados do cartão
        const payment = new Payment('temp', orderId, amount, 'credit_card', 'pending', installments);
        const cardValidation = payment.validateCard(pan, cvv, expiryMonth, expiryYear, 'visa');
        
        if (!cardValidation.isValid) {
            return res.status(400).json({ 
                error: 'Dados do cartão inválidos',
                details: cardValidation.errors 
            });
        }

        // Determinar bandeira
        let brand = 'visa';
        if (pan.startsWith('5')) {
            brand = 'mastercard';
        }

        // Buscar dados mockados
        const cardData = brand === 'visa' ? mockCardData.visa : mockCardData.mastercard;
        const mockCard = cardData.find(card => card.pan === pan);

        if (!mockCard) {
            return res.status(400).json({ 
                error: 'Cartão não encontrado',
                errorCode: 'invalid_pan'
            });
        }

        // Verificar CVV
        if (mockCard.cvv !== cvv) {
            return res.status(400).json({ 
                error: 'CVV inválido',
                errorCode: 'invalid_cvv'
            });
        }

        // Verificar expiração
        if (mockCard.expiryMonth !== parseInt(expiryMonth) || mockCard.expiryYear !== parseInt(expiryYear)) {
            return res.status(400).json({ 
                error: 'Data de expiração inválida',
                errorCode: 'expired_card'
            });
        }

        // Criar pagamento
        const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newPayment = new Payment(paymentId, orderId, amount, 'credit_card', 'pending', installments);
        
        // Calcular parcelas
        const installmentDetails = newPayment.calculateInstallments(amount, installments);
        newPayment.installmentDetails = installmentDetails.details;

        // Armazenar dados do cartão (mascarados)
        newPayment.cardData = {
            pan: pan,
            brand: brand,
            last4: pan.slice(-4)
        };

        // Processar pagamento
        if (mockCard.result === 'approved') {
            newPayment.updateStatus('paid', paymentId);
            payments.push(newPayment);
            
            res.json({
                success: true,
                paymentId: paymentId,
                status: 'paid',
                message: 'Pagamento aprovado',
                installmentDetails: installmentDetails
            });
        } else {
            newPayment.updateStatus('failed');
            payments.push(newPayment);
            
            res.status(400).json({
                success: false,
                paymentId: paymentId,
                status: 'failed',
                error: 'Pagamento recusado',
                errorCode: mockCard.errorCode,
                message: getErrorMessage(mockCard.errorCode)
            });
        }

    } catch (error) {
        console.error('Erro no pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/payments/debit-card - Processar pagamento com cartão de débito
router.post('/debit-card', authenticateToken, (req, res) => {
    try {
        const { orderId, amount, pan, cvv, expiryMonth, expiryYear } = req.body;

        if (!orderId || !amount || !pan || !cvv || !expiryMonth || !expiryYear) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        // Validar dados do cartão
        const payment = new Payment('temp', orderId, amount, 'debit_card', 'pending', 1);
        const cardValidation = payment.validateCard(pan, cvv, expiryMonth, expiryYear, 'visa');
        
        if (!cardValidation.isValid) {
            return res.status(400).json({ 
                error: 'Dados do cartão inválidos',
                details: cardValidation.errors 
            });
        }

        // Determinar bandeira
        let brand = 'visa';
        if (pan.startsWith('5')) {
            brand = 'mastercard';
        }

        // Buscar dados mockados
        const cardData = brand === 'visa' ? mockCardData.visaDebit : mockCardData.mastercardDebit;
        const mockCard = cardData.find(card => card.pan === pan);

        if (!mockCard) {
            return res.status(400).json({ 
                error: 'Cartão não encontrado',
                errorCode: 'invalid_pan'
            });
        }

        // Verificar CVV
        if (mockCard.cvv !== cvv) {
            return res.status(400).json({ 
                error: 'CVV inválido',
                errorCode: 'invalid_cvv'
            });
        }

        // Verificar expiração
        if (mockCard.expiryMonth !== parseInt(expiryMonth) || mockCard.expiryYear !== parseInt(expiryYear)) {
            return res.status(400).json({ 
                error: 'Data de expiração inválida',
                errorCode: 'expired_card'
            });
        }

        // Criar pagamento
        const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newPayment = new Payment(paymentId, orderId, amount, 'debit_card', 'pending', 1);
        
        // Armazenar dados do cartão (mascarados)
        newPayment.cardData = {
            pan: pan,
            brand: brand,
            last4: pan.slice(-4)
        };

        // Processar pagamento
        if (mockCard.result === 'approved') {
            newPayment.updateStatus('paid', paymentId);
            payments.push(newPayment);

        res.json({
                success: true,
                paymentId: paymentId,
                status: 'paid',
                message: 'Pagamento aprovado'
            });
        } else {
            newPayment.updateStatus('failed');
            payments.push(newPayment);
            
            res.status(400).json({
                success: false,
                paymentId: paymentId,
                status: 'failed',
                error: 'Pagamento recusado',
                errorCode: mockCard.errorCode,
                message: getErrorMessage(mockCard.errorCode)
            });
        }

    } catch (error) {
        console.error('Erro no pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/payments/pix - Processar pagamento com PIX
router.post('/pix', authenticateToken, (req, res) => {
    try {
        const { orderId, amount, payerCpf, payerCnpj } = req.body;

        if (!orderId || !amount || (!payerCpf && !payerCnpj)) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        // Validar PIX
        const payment = new Payment('temp', orderId, amount, 'pix', 'pending', 1);
        const pixValidation = payment.validatePix(payerCpf, payerCnpj);
        
        if (!pixValidation.isValid) {
            return res.status(400).json({ 
                error: 'Dados PIX inválidos',
                details: pixValidation.errors 
            });
        }

        // Criar pagamento
        const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newPayment = new Payment(paymentId, orderId, amount, 'pix', 'pending', 1);
        
        // Gerar dados PIX
        const pixData = newPayment.generatePixData();
        newPayment.pixData = pixData;
        
        payments.push(newPayment);

        res.json({
            success: true,
            paymentId: paymentId,
            status: 'pending',
            message: 'PIX gerado com sucesso',
            pixData: {
                txid: pixData.txid,
                pixKey: pixData.pixKey,
                qrCode: pixData.qrCode,
                expiresAt: pixData.expiresAt
            }
        });

    } catch (error) {
        console.error('Erro no PIX:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/payments/pix/:txid/status - Verificar status do PIX
router.get('/pix/:txid/status', authenticateToken, (req, res) => {
    try {
        const { txid } = req.params;
        const payment = payments.find(p => p.pixData && p.pixData.txid === txid);

        if (!payment) {
            return res.status(404).json({ error: 'PIX não encontrado' });
        }

        // Simular verificação de status
        const now = new Date();
        if (payment.pixData.expiresAt < now && payment.status === 'pending') {
            payment.updateStatus('expired');
        }

        res.json({
            txid: txid,
            status: payment.status,
            statusLabel: payment.getStatusLabel(),
            expiresAt: payment.pixData.expiresAt,
            isExpired: payment.pixData.expiresAt < now
        });

    } catch (error) {
        console.error('Erro na verificação PIX:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/payments/orders/:orderId - Obter pagamentos de um pedido
router.get('/orders/:orderId', authenticateToken, (req, res) => {
    try {
        const { orderId } = req.params;
        const orderPayments = payments.filter(p => p.orderId === orderId);

        res.json({
            orderId: orderId,
            payments: orderPayments.map(p => p.toJSON())
        });

    } catch (error) {
        console.error('Erro ao buscar pagamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Função auxiliar para obter mensagens de erro
function getErrorMessage(errorCode) {
    const errorMessages = {
        'insufficient_funds': 'Saldo insuficiente',
        'do_not_honor': 'Cartão recusado pela operadora',
        'invalid_cvv': 'CVV inválido',
        'expired_card': 'Cartão expirado',
        'limit_exceeded': 'Limite excedido',
        'invalid_pan': 'Número do cartão inválido'
    };
    return errorMessages[errorCode] || 'Erro no processamento do pagamento';
}

module.exports = router;
