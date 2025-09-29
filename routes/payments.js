const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const QRCode = require('qrcode');

const router = express.Router();

// Mock de cartões para validação
const MOCK_CARDS = {
    '4111111111111111': { type: 'credit', status: 'approved' },
    '4111111111111112': { type: 'credit', status: 'declined', reason: 'insufficient_funds' },
    '4111111111111113': { type: 'credit', status: 'declined', reason: 'do_not_honor' },
    '5555555555554444': { type: 'credit', status: 'approved' },
    '4000000000000002': { type: 'debit', status: 'approved' },
    '4000000000000003': { type: 'debit', status: 'declined', reason: 'insufficient_funds' }
};

// Validações
const paymentValidation = [
    body('order_id').isInt({ min: 1 }).withMessage('ID do pedido inválido'),
    body('payment_method').isIn(['credit_card', 'debit_card', 'pix'])
        .withMessage('Método de pagamento inválido'),
    body('installments').optional().isInt({ min: 1, max: 10 })
        .withMessage('Parcelas deve ser entre 1 e 10')
];

const cardValidation = [
    body('card_number').matches(/^\d{16}$/).withMessage('Número do cartão deve ter 16 dígitos'),
    body('cvv').matches(/^\d{3,4}$/).withMessage('CVV deve ter 3 ou 4 dígitos'),
    body('expiry_month').isInt({ min: 1, max: 12 }).withMessage('Mês inválido'),
    body('expiry_year').isInt({ min: new Date().getFullYear() }).withMessage('Ano inválido'),
    body('cardholder_name').trim().isLength({ min: 2 }).withMessage('Nome do portador é obrigatório')
];

// Calcular parcelas
function calculateInstallments(amount, installments) {
    if (installments === 1) {
        return {
            installment_amount: amount,
            total_amount: amount,
            interest_amount: 0,
            interest_rate: 0
        };
    }

    const monthlyRate = 0.01; // 1% ao mês
    const installmentAmount = amount * (monthlyRate * Math.pow(1 + monthlyRate, installments)) / 
                            (Math.pow(1 + monthlyRate, installments) - 1);
    
    const totalAmount = installmentAmount * installments;
    const interestAmount = totalAmount - amount;

    return {
        installment_amount: Math.round(installmentAmount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        interest_amount: Math.round(interestAmount * 100) / 100,
        interest_rate: monthlyRate * 100
    };
}

// Gerar opções de pagamento
router.post('/options', authenticateToken, [
    body('order_id').isInt({ min: 1 }).withMessage('ID do pedido inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { order_id } = req.body;
        const userId = req.user.id;

        // Buscar pedido
        const [orders] = await pool.execute(`
            SELECT id, total_amount, status FROM orders 
            WHERE id = ? AND user_id = ? AND status = 'pending_payment'
        `, [order_id, userId]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado ou não elegível para pagamento' });
        }

        const order = orders[0];
        const amount = order.total_amount;

        // Calcular opções de pagamento
        const paymentOptions = {
            cash: {
                amount: amount,
                installments: 1,
                installment_amount: amount,
                total_amount: amount,
                interest_amount: 0,
                interest_rate: 0
            },
            installments: []
        };

        // Calcular parcelas de 2 a 10x
        for (let i = 2; i <= 10; i++) {
            const installment = calculateInstallments(amount, i);
            paymentOptions.installments.push({
                installments: i,
                ...installment
            });
        }

        res.json({
            order_id,
            amount,
            payment_options: paymentOptions
        });

    } catch (error) {
        console.error('Erro ao calcular opções de pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Processar pagamento com cartão
router.post('/card', authenticateToken, paymentValidation.concat(cardValidation), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            order_id, payment_method, installments = 1,
            card_number, cvv, expiry_month, expiry_year, cardholder_name
        } = req.body;

        const userId = req.user.id;

        // Buscar pedido
        const [orders] = await pool.execute(`
            SELECT id, total_amount, status FROM orders 
            WHERE id = ? AND user_id = ? AND status = 'pending_payment'
        `, [order_id, userId]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado ou não elegível para pagamento' });
        }

        const order = orders[0];

        // Validar cartão
        const maskedCard = card_number.replace(/(\d{4})\d{8}(\d{4})/, '$1****$2');
        const cardData = MOCK_CARDS[card_number];

        if (!cardData) {
            return res.status(400).json({ 
                error: 'Cartão não reconhecido',
                details: 'Use um dos cartões de teste disponíveis'
            });
        }

        // Verificar tipo de cartão
        if (cardData.type !== payment_method.replace('_card', '')) {
            return res.status(400).json({ 
                error: 'Tipo de cartão não confere com o método de pagamento' 
            });
        }

        // Verificar limite (simulado)
        if (order.total_amount > 50000) {
            return res.status(400).json({ 
                error: 'Valor excede o limite máximo de R$ 50.000,00' 
            });
        }

        // Simular processamento
        const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        
        let paymentStatus = 'pending';
        let responseData = {};

        if (cardData.status === 'approved') {
            paymentStatus = 'approved';
            responseData = {
                transaction_id: transactionId,
                status: 'approved',
                amount: order.total_amount,
                installments: installments,
                masked_card: maskedCard
            };
        } else {
            paymentStatus = 'declined';
            responseData = {
                transaction_id: transactionId,
                status: 'declined',
                reason: cardData.reason,
                error_code: cardData.reason === 'insufficient_funds' ? 'INSUFFICIENT_FUNDS' : 'DO_NOT_HONOR'
            };
        }

        // Salvar transação
        await pool.execute(`
            INSERT INTO payment_transactions (order_id, transaction_id, payment_method, amount, status, response_data)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [order_id, transactionId, payment_method, order.total_amount, paymentStatus, JSON.stringify(responseData)]);

        if (paymentStatus === 'approved') {
            // Atualizar status do pedido
            await pool.execute(
                'UPDATE orders SET status = ?, payment_status = ?, payment_method = ? WHERE id = ?',
                ['paid', 'paid', payment_method, order_id]
            );

            // Registrar no histórico
            await pool.execute(`
                INSERT INTO order_status_history (order_id, status, changed_by)
                VALUES (?, 'paid', ?)
            `, [order_id, userId]);
        }

        res.json({
            message: paymentStatus === 'approved' ? 'Pagamento aprovado' : 'Pagamento recusado',
            ...responseData
        });

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Gerar PIX
router.post('/pix', authenticateToken, [
    body('order_id').isInt({ min: 1 }).withMessage('ID do pedido inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { order_id } = req.body;
        const userId = req.user.id;

        // Buscar pedido
        const [orders] = await pool.execute(`
            SELECT id, total_amount, status FROM orders 
            WHERE id = ? AND user_id = ? AND status = 'pending_payment'
        `, [order_id, userId]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado ou não elegível para pagamento' });
        }

        const order = orders[0];

        // Gerar dados do PIX
        const txid = crypto.randomBytes(16).toString('hex').toUpperCase();
        const pixKey = crypto.randomBytes(32).toString('base64');
        
        // Gerar QR Code
        const qrCodeData = {
            pixKey,
            amount: order.total_amount,
            txid,
            description: `Pagamento pedido ${order_id}`
        };

        const qrCodeString = JSON.stringify(qrCodeData);
        const qrCodeImage = await QRCode.toDataURL(qrCodeString);

        // Salvar transação PIX
        await pool.execute(`
            INSERT INTO payment_transactions (order_id, transaction_id, payment_method, amount, status, response_data)
            VALUES (?, ?, 'pix', ?, 'pending', ?)
        `, [order_id, txid, order.total_amount, JSON.stringify({
            pix_key: pixKey,
            qr_code: qrCodeImage,
            expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
        })]);

        res.json({
            txid,
            pix_key: pixKey,
            qr_code: qrCodeImage,
            amount: order.total_amount,
            expires_in: 30 * 60, // 30 minutos em segundos
            message: 'QR Code gerado com sucesso. Pague em até 30 minutos.'
        });

    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Verificar status do PIX
router.get('/pix/:txid/status', authenticateToken, async (req, res) => {
    try {
        const { txid } = req.params;
        const userId = req.user.id;

        // Buscar transação
        const [transactions] = await pool.execute(`
            SELECT pt.*, o.user_id 
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.id
            WHERE pt.transaction_id = ? AND o.user_id = ?
        `, [txid, userId]);

        if (transactions.length === 0) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }

        const transaction = transactions[0];
        const responseData = JSON.parse(transaction.response_data || '{}');

        // Simular verificação de pagamento (em produção, consultaria o gateway)
        let status = transaction.status;
        const now = new Date();
        const expiresAt = new Date(responseData.expires_at);

        if (status === 'pending' && now > expiresAt) {
            status = 'expired';
            await pool.execute(
                'UPDATE payment_transactions SET status = ? WHERE id = ?',
                ['expired', transaction.id]
            );
        } else if (status === 'pending') {
            // Simular aprovação aleatória após alguns segundos
            const timeSinceCreation = now.getTime() - new Date(transaction.created_at).getTime();
            if (timeSinceCreation > 10000) { // 10 segundos
                status = 'approved';
                await pool.execute(
                    'UPDATE payment_transactions SET status = ? WHERE id = ?',
                    ['approved', transaction.id]
                );

                // Atualizar status do pedido
                await pool.execute(
                    'UPDATE orders SET status = ?, payment_status = ?, payment_method = ? WHERE id = ?',
                    ['paid', 'paid', 'pix', transaction.order_id]
                );

                // Registrar no histórico
                await pool.execute(`
                    INSERT INTO order_status_history (order_id, status, changed_by)
                    VALUES (?, 'paid', ?)
                `, [transaction.order_id, userId]);
            }
        }

        res.json({
            txid,
            status,
            amount: transaction.amount,
            created_at: transaction.created_at,
            expires_at: responseData.expires_at
        });

    } catch (error) {
        console.error('Erro ao verificar status PIX:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Listar transações do usuário
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const [transactions] = await pool.execute(`
            SELECT pt.*, o.order_number, o.total_amount
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.id
            WHERE o.user_id = ?
            ORDER BY pt.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, pageSize, offset]);

        // Contar total
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total 
            FROM payment_transactions pt
            JOIN orders o ON pt.order_id = o.id
            WHERE o.user_id = ?
        `, [userId]);

        const total = countResult[0].total;

        res.json({
            transactions,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (error) {
        console.error('Erro ao listar transações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
