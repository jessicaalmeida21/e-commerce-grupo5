const express = require('express');
const Order = require('../models/Order');
const Address = require('../models/Address');
const Product = require('../models/Product');
const router = express.Router();

// Mock de banco de dados em memória
let orders = [];
let addresses = [];
let products = []; // Será preenchido com produtos existentes

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

// Inicializar produtos mock
const initializeProducts = () => {
    products = [
        new Product(1, 'Smartphone Samsung Galaxy S21', 'Smartphone com tela de 6.2", câmera tripla de 64MP, 128GB de armazenamento', 'eletrônicos', 1299.99, 50, null, true, 100),
        new Product(2, 'Notebook Dell Inspiron 15', 'Notebook com processador Intel i5, 8GB RAM, SSD 256GB, tela Full HD 15.6"', 'eletrônicos', 2499.99, 25, null, true, 50),
        new Product(3, 'Camiseta Polo Masculina', 'Camiseta polo 100% algodão, disponível em várias cores e tamanhos', 'moda', 89.90, 100, null, true, 200),
        new Product(4, 'Tênis Nike Air Max', 'Tênis esportivo com tecnologia Air Max, ideal para corrida e caminhada', 'esportes', 299.90, 75, null, true, 150),
        new Product(5, 'Livro "O Poder do Hábito"', 'Livro de Charles Duhigg sobre como transformar hábitos e alcançar o sucesso', 'livros', 39.90, 30, null, true, 100)
    ];
};

// Inicializar produtos
initializeProducts();

// GET /api/orders - Listar pedidos do usuário
router.get('/', authenticateToken, (req, res) => {
    try {
        const userOrders = orders.filter(order => order.userId === req.user.id);
        const ordersWithDetails = userOrders.map(order => order.toJSON());
        
        res.json({ orders: ordersWithDetails });
    } catch (error) {
        console.error('Erro ao listar pedidos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/orders/:id - Obter detalhes de um pedido
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = orders.find(o => o.id === orderId && o.userId === req.user.id);

        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.json({ order: order.toJSON() });
    } catch (error) {
        console.error('Erro ao obter pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/orders - Criar novo pedido
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { items, shippingAddressId } = req.body;

        // Validar dados obrigatórios
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Carrinho vazio' });
        }

        if (!shippingAddressId) {
            return res.status(400).json({ error: 'Endereço de entrega é obrigatório' });
        }

        // Verificar se o endereço pertence ao usuário
        const address = addresses.find(a => a.id === shippingAddressId && a.userId === req.user.id);
        if (!address) {
            return res.status(400).json({ error: 'Endereço não encontrado' });
        }

        // Verificar estoque e validar itens
        const validatedItems = [];
        let totalAmount = 0;

        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) {
                return res.status(400).json({ error: `Produto ${item.productId} não encontrado` });
            }

            if (!product.isActive) {
                return res.status(400).json({ error: `Produto ${product.name} não está disponível` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}` 
                });
            }

            const subtotal = product.price * item.quantity;
            totalAmount += subtotal;

            validatedItems.push({
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                price: product.price,
                subtotal: subtotal
            });
        }

        // Criar pedido
        const orderId = orders.length + 1;
        const order = new Order(
            orderId,
            req.user.id,
            validatedItems,
            totalAmount,
            'pending',
            address.toJSON()
        );

        // Validar pedido
        const validation = order.validate();
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: 'Dados do pedido inválidos',
                details: validation.errors 
            });
        }

        // Salvar pedido
        orders.push(order);

        res.status(201).json({
            message: 'Pedido criado com sucesso',
            order: order.toJSON()
        });

    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/orders/:id/status - Atualizar status do pedido (apenas operadores e admins)
router.put('/:id/status', authenticateToken, (req, res) => {
    try {
        // Verificar permissão
        if (!['operator', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        const order = orders.find(o => o.id === orderId);
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Atualizar status
        order.updateStatus(status);

        res.json({
            message: 'Status atualizado com sucesso',
            order: order.toJSON()
        });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        
        if (error.message.includes('Transição de status inválida')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/orders/:id/cancel - Cancelar pedido
router.post('/:id/cancel', authenticateToken, (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { reason } = req.body;

        const order = orders.find(o => o.id === orderId && o.userId === req.user.id);
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Cancelar pedido
        order.cancel(reason);

        res.json({
            message: 'Pedido cancelado com sucesso',
            order: order.toJSON()
        });

    } catch (error) {
        console.error('Erro ao cancelar pedido:', error);
        
        if (error.message.includes('não pode ser cancelado') || 
            error.message.includes('Motivo do cancelamento')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/orders/:id/return - Solicitar devolução
router.post('/:id/return', authenticateToken, (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { reason } = req.body;

        const order = orders.find(o => o.id === orderId && o.userId === req.user.id);
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        if (!order.canBeReturned()) {
            return res.status(400).json({ 
                error: 'Pedido não pode ser devolvido. Prazo de 7 dias após entrega expirado.' 
            });
        }

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({ 
                error: 'Motivo da devolução deve ter pelo menos 10 caracteres' 
            });
        }

        // Atualizar status para devolvido
        order.updateStatus('returned');
        order.cancellationReason = reason; // Reutilizar campo para motivo da devolução

        res.json({
            message: 'Devolução solicitada com sucesso',
            order: order.toJSON()
        });

    } catch (error) {
        console.error('Erro ao solicitar devolução:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/orders/stats - Estatísticas de pedidos (apenas admins)
router.get('/stats', authenticateToken, (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const paidOrders = orders.filter(o => o.status === 'paid').length;
        const shippedOrders = orders.filter(o => o.status === 'shipped').length;
        const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

        const totalRevenue = orders
            .filter(o => ['paid', 'shipped', 'delivered'].includes(o.status))
            .reduce((sum, o) => sum + o.totalAmount, 0);

        res.json({
            totalOrders,
            pendingOrders,
            paidOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;