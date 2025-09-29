const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Listar fornecedores (público)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;

        const [suppliers] = await pool.execute(`
            SELECT u.id, u.name, u.email, u.created_at,
                   COUNT(p.id) as product_count,
                   AVG(p.price) as avg_price
            FROM users u
            LEFT JOIN products p ON u.id = p.supplier_id AND p.is_active = true
            WHERE u.role = 'supplier' AND u.is_active = true
            GROUP BY u.id
            ORDER BY u.name
            LIMIT ? OFFSET ?
        `, [pageSize, offset]);

        // Contar total
        const [countResult] = await pool.execute(`
            SELECT COUNT(*) as total 
            FROM users 
            WHERE role = 'supplier' AND is_active = true
        `);

        const total = countResult[0].total;

        res.json({
            suppliers,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (error) {
        console.error('Erro ao listar fornecedores:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar fornecedor por ID (público)
router.get('/:id', async (req, res) => {
    try {
        const supplierId = req.params.id;

        const [suppliers] = await pool.execute(`
            SELECT u.id, u.name, u.email, u.created_at
            FROM users u
            WHERE u.id = ? AND u.role = 'supplier' AND u.is_active = true
        `, [supplierId]);

        if (suppliers.length === 0) {
            return res.status(404).json({ error: 'Fornecedor não encontrado' });
        }

        const supplier = suppliers[0];

        // Buscar produtos do fornecedor
        const [products] = await pool.execute(`
            SELECT id, title, description, category, price, stock_quantity, image_url, created_at
            FROM products
            WHERE supplier_id = ? AND is_active = true
            ORDER BY created_at DESC
            LIMIT 20
        `, [supplierId]);

        // Estatísticas do fornecedor
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(p.id) as total_products,
                AVG(p.price) as avg_price,
                MIN(p.price) as min_price,
                MAX(p.price) as max_price,
                SUM(p.stock_quantity) as total_stock
            FROM products p
            WHERE p.supplier_id = ? AND p.is_active = true
        `, [supplierId]);

        res.json({
            supplier: {
                ...supplier,
                stats: stats[0],
                products
            }
        });

    } catch (error) {
        console.error('Erro ao buscar fornecedor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Dashboard do fornecedor
router.get('/dashboard/stats', authenticateToken, requireRole(['supplier', 'admin']), async (req, res) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        // Estatísticas de produtos
        const [productStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_products,
                SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_products,
                SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_products,
                AVG(price) as avg_price,
                SUM(stock_quantity) as total_stock,
                SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock
            FROM products 
            WHERE supplier_id = ?
        `, [userId]);

        // Estatísticas de vendas
        const [salesStats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT o.id) as total_orders,
                SUM(oi.total_price) as total_revenue,
                AVG(oi.total_price) as avg_order_value,
                COUNT(oi.id) as total_items_sold
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.supplier_id = ? AND o.status IN ('paid', 'shipped', 'delivered')
        `, [userId]);

        // Produtos mais vendidos
        const [topProducts] = await pool.execute(`
            SELECT p.title, p.price, SUM(oi.quantity) as total_sold, SUM(oi.total_price) as revenue
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON oi.order_id = o.id
            WHERE p.supplier_id = ? AND o.status IN ('paid', 'shipped', 'delivered')
            GROUP BY p.id, p.title, p.price
            ORDER BY total_sold DESC
            LIMIT 5
        `, [userId]);

        // Pedidos recentes
        const [recentOrders] = await pool.execute(`
            SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at, u.name as customer_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE p.supplier_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `, [userId]);

        res.json({
            product_stats: productStats[0],
            sales_stats: salesStats[0],
            top_products: topProducts,
            recent_orders: recentOrders
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Listar pedidos do fornecedor
router.get('/orders', authenticateToken, requireRole(['supplier', 'admin']), async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;
        const status = req.query.status;

        let whereClause = 'p.supplier_id = ?';
        let params = [userId];

        if (status) {
            whereClause += ' AND o.status = ?';
            params.push(status);
        }

        const [orders] = await pool.execute(`
            SELECT DISTINCT o.id, o.order_number, o.total_amount, o.status, o.created_at,
                   u.name as customer_name, u.email as customer_email,
                   GROUP_CONCAT(p.title SEPARATOR ', ') as products
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, pageSize, offset]);

        // Contar total
        const [countResult] = await pool.execute(`
            SELECT COUNT(DISTINCT o.id) as total
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE ${whereClause}
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
        console.error('Erro ao listar pedidos do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar pedido específico do fornecedor
router.get('/orders/:id', authenticateToken, requireRole(['supplier', 'admin']), async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;

        // Verificar se o fornecedor tem produtos neste pedido
        const [orders] = await pool.execute(`
            SELECT DISTINCT o.*, u.name as customer_name, u.email as customer_email
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ? AND p.supplier_id = ?
        `, [orderId, userId]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const order = orders[0];

        // Buscar itens do pedido (apenas os produtos deste fornecedor)
        const [items] = await pool.execute(`
            SELECT oi.*, p.title, p.image_url, p.sku
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ? AND p.supplier_id = ?
        `, [orderId, userId]);

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
        console.error('Erro ao buscar pedido do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar status de entrega (apenas fornecedores)
router.put('/orders/:id/shipping', authenticateToken, requireRole(['supplier', 'admin']), async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;
        const { status, tracking_code, notes } = req.body;

        if (!['shipped', 'delivered'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido para atualização de entrega' });
        }

        // Verificar se o fornecedor tem produtos neste pedido
        const [orders] = await pool.execute(`
            SELECT o.id, o.status
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id = ? AND p.supplier_id = ?
        `, [orderId, userId]);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        const order = orders[0];

        // Validar transição de status
        if (status === 'shipped' && order.status !== 'paid') {
            return res.status(400).json({ error: 'Pedido deve estar pago para ser enviado' });
        }

        if (status === 'delivered' && order.status !== 'shipped') {
            return res.status(400).json({ error: 'Pedido deve estar em transporte para ser entregue' });
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
        `, [orderId, status, userId, notes || null]);

        res.json({ message: `Status do pedido atualizado para ${status}` });

    } catch (error) {
        console.error('Erro ao atualizar status de entrega:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
