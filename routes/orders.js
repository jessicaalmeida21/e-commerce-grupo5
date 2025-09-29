const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validações
const orderValidation = [
    body('items').isArray({ min: 1 }).withMessage('Pedido deve ter pelo menos 1 item'),
    body('items.*.product_id').isInt({ min: 1 }).withMessage('ID do produto inválido'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantidade deve ser maior que zero'),
    body('shipping_address').isObject().withMessage('Endereço de entrega é obrigatório'),
    body('shipping_address.cep').isLength({ min: 8, max: 9 }).withMessage('CEP inválido'),
    body('shipping_address.street').trim().isLength({ min: 3 }).withMessage('Rua é obrigatória'),
    body('shipping_address.number').trim().notEmpty().withMessage('Número é obrigatório'),
    body('shipping_address.city').trim().isLength({ min: 2 }).withMessage('Cidade é obrigatória'),
    body('shipping_address.state').trim().isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres')
];

// Criar pedido
router.post('/', authenticateToken, orderValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { items, shipping_address } = req.body;
        const userId = req.user.id;

        // Verificar se produtos existem e têm estoque
        const productIds = items.map(item => item.product_id);
        const [products] = await pool.execute(`
            SELECT id, title, price, stock_quantity, is_active 
            FROM products 
            WHERE id IN (${productIds.map(() => '?').join(',')})
        `, productIds);

        if (products.length !== productIds.length) {
            return res.status(400).json({ error: 'Alguns produtos não foram encontrados' });
        }

        // Verificar estoque e calcular total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.product_id);
            
            if (!product.is_active) {
                return res.status(400).json({ 
                    error: `Produto "${product.title}" está indisponível` 
                });
            }

            if (product.stock_quantity < item.quantity) {
                return res.status(400).json({ 
                    error: `Estoque insuficiente para "${product.title}". Disponível: ${product.stock_quantity}` 
                });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
                product_id: product.id,
                quantity: item.quantity,
                unit_price: product.price,
                total_price: itemTotal
            });
        }

        // Calcular frete
        const shippingFee = totalAmount >= 399 ? 0 : 100;
        const finalTotal = totalAmount + shippingFee;

        // Gerar número do pedido
        const orderNumber = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Criar pedido
            const [orderResult] = await connection.execute(`
                INSERT INTO orders (order_number, user_id, total_amount, shipping_fee, shipping_address)
                VALUES (?, ?, ?, ?, ?)
            `, [orderNumber, userId, finalTotal, shippingFee, JSON.stringify(shipping_address)]);

            const orderId = orderResult.insertId;

            // Criar itens do pedido e atualizar estoque
            for (const item of orderItems) {
                await connection.execute(`
                    INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?)
                `, [orderId, item.product_id, item.quantity, item.unit_price, item.total_price]);

                // Atualizar estoque
                await connection.execute(`
                    UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?
                `, [item.quantity, item.product_id]);
            }

            // Registrar status inicial
            await connection.execute(`
                INSERT INTO order_status_history (order_id, status, changed_by)
                VALUES (?, 'pending_payment', ?)
            `, [orderId, userId]);

            await connection.commit();

            res.status(201).json({
                message: 'Pedido criado com sucesso',
                order: {
                    id: orderId,
                    order_number: orderNumber,
                    total_amount: finalTotal,
                    shipping_fee: shippingFee,
                    status: 'pending_payment'
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Listar pedidos do usuário
router.get('/my-orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        // Buscar pedidos
        const [orders] = await pool.execute(`
            SELECT o.*, 
                   COUNT(oi.id) as item_count,
                   GROUP_CONCAT(p.title SEPARATOR ', ') as product_names
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, pageSize, offset]);

        // Contar total
        const [countResult] = await pool.execute(
            'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
            [userId]
        );

        const total = countResult[0].total;

        res.json({
            orders,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar pedido por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;

        // Buscar pedido
        const [orders] = await pool.execute(`
            SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ? AND (o.user_id = ? OR ? = 'admin')
        `, [orderId, userId, req.user.role]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const order = orders[0];

        // Buscar itens do pedido
        const [items] = await pool.execute(`
            SELECT oi.*, p.title, p.image_url, p.sku
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        // Buscar histórico de status
        const [statusHistory] = await pool.execute(`
            SELECT osh.*, u.name as changed_by_name
            FROM order_status_history osh
            LEFT JOIN users u ON osh.changed_by = u.id
            WHERE osh.order_id = ?
            ORDER BY osh.created_at ASC
        `, [orderId]);

        res.json({
            order: {
                ...order,
                items,
                status_history: statusHistory
            }
        });

    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar status do pedido (apenas admins)
router.put('/:id/status', authenticateToken, requireRole(['admin']), [
    body('status').isIn(['pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Status inválido'),
    body('reason').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const orderId = req.params.id;
        const { status, reason } = req.body;

        // Verificar se pedido existe
        const [orders] = await pool.execute(
            'SELECT id, status FROM orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const currentStatus = orders[0].status;

        // Validar transição de status
        const validTransitions = {
            'pending_payment': ['paid', 'cancelled'],
            'paid': ['shipped', 'cancelled'],
            'shipped': ['delivered'],
            'delivered': [],
            'cancelled': []
        };

        if (!validTransitions[currentStatus].includes(status)) {
            return res.status(400).json({ 
                error: `Não é possível alterar status de "${currentStatus}" para "${status}"` 
            });
        }

        // Atualizar status do pedido
        await pool.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );

        // Registrar no histórico
        await pool.execute(`
            INSERT INTO order_status_history (order_id, status, changed_by, reason)
            VALUES (?, ?, ?, ?)
        `, [orderId, status, req.user.id, reason || null]);

        res.json({ message: 'Status do pedido atualizado com sucesso' });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Cancelar pedido
router.post('/:id/cancel', authenticateToken, [
    body('reason').trim().isLength({ min: 5 }).withMessage('Motivo do cancelamento é obrigatório (mín. 5 caracteres)')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const orderId = req.params.id;
        const { reason } = req.body;
        const userId = req.user.id;

        // Verificar se pedido existe e pertence ao usuário
        const [orders] = await pool.execute(`
            SELECT id, status, user_id FROM orders WHERE id = ?
        `, [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const order = orders[0];

        if (order.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Você só pode cancelar seus próprios pedidos' });
        }

        // Verificar se pode ser cancelado
        if (!['pending_payment', 'paid'].includes(order.status)) {
            return res.status(400).json({ 
                error: 'Pedido não pode ser cancelado neste status' 
            });
        }

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Atualizar status para cancelado
            await connection.execute(
                'UPDATE orders SET status = ? WHERE id = ?',
                ['cancelled', orderId]
            );

            // Registrar no histórico
            await connection.execute(`
                INSERT INTO order_status_history (order_id, status, changed_by, reason)
                VALUES (?, 'cancelled', ?, ?)
            `, [orderId, userId, reason]);

            // Se estava pago, devolver estoque
            if (order.status === 'paid') {
                const [items] = await connection.execute(`
                    SELECT product_id, quantity FROM order_items WHERE order_id = ?
                `, [orderId]);

                for (const item of items) {
                    await connection.execute(`
                        UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?
                    `, [item.quantity, item.product_id]);
                }
            }

            await connection.commit();

            res.json({ message: 'Pedido cancelado com sucesso' });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Listar todos os pedidos (apenas admins)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;
        const status = req.query.status;

        let whereClause = '1=1';
        let params = [];

        if (status) {
            whereClause += ' AND o.status = ?';
            params.push(status);
        }

        // Buscar pedidos
        const [orders] = await pool.execute(`
            SELECT o.*, u.name as user_name, u.email as user_email,
                   COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, pageSize, offset]);

        // Contar total
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}
        `, params);

        const total = countResult[0].total;

        res.json({
            orders,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
