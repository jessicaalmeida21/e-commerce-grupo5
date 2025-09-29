const express = require('express');
const Logistics = require('../models/Logistics');
const router = express.Router();

// Mock de banco de dados em memória para logística
let logistics = [];

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

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
    }
    next();
};

// POST /api/logistics - Criar logística para um pedido
router.post('/', authenticateToken, (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'ID do pedido é obrigatório' });
        }

        // Verificar se já existe logística para este pedido
        const existingLogistics = logistics.find(l => l.orderId === orderId);
        if (existingLogistics) {
            return res.status(400).json({ error: 'Logística já existe para este pedido' });
        }

        // Criar nova logística
        const logisticsId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newLogistics = new Logistics(logisticsId, orderId, 'awaiting_shipment');
        
        // Adicionar entrada inicial no histórico
        newLogistics.addToHistory({
            fromStatus: null,
            toStatus: 'awaiting_shipment',
            reason: 'Pedido criado',
            updatedBy: req.user.email,
            timestamp: new Date()
        });

        logistics.push(newLogistics);

        res.status(201).json({
            message: 'Logística criada com sucesso',
            logistics: newLogistics.toJSON()
        });

    } catch (error) {
        console.error('Erro ao criar logística:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/logistics/orders/:orderId - Obter status logístico de um pedido
router.get('/orders/:orderId', authenticateToken, (req, res) => {
    try {
        const { orderId } = req.params;
        const logisticsData = logistics.find(l => l.orderId === orderId);

        if (!logisticsData) {
            return res.status(404).json({ error: 'Logística não encontrada para este pedido' });
        }

        res.json(logisticsData.toJSON());

    } catch (error) {
        console.error('Erro ao buscar logística:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/logistics - Listar todas as logísticas (apenas admin)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        let filteredLogistics = [...logistics];

        if (status) {
            filteredLogistics = filteredLogistics.filter(l => l.status === status);
        }

        // Paginação
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedLogistics = filteredLogistics.slice(startIndex, endIndex);

        res.json({
            logistics: paginatedLogistics.map(l => l.toJSON()),
            totalLogistics: filteredLogistics.length,
            totalPages: Math.ceil(filteredLogistics.length / parseInt(limit)),
            currentPage: parseInt(page)
        });

    } catch (error) {
        console.error('Erro ao listar logísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/logistics/:id/status - Atualizar status logístico (apenas admin)
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status é obrigatório' });
        }

        const logisticsData = logistics.find(l => l.id === id);
        if (!logisticsData) {
            return res.status(404).json({ error: 'Logística não encontrada' });
        }

        // Verificar se pode ser atualizada
        if (!logisticsData.canBeUpdated()) {
            return res.status(400).json({ error: 'Logística já finalizada, não pode ser atualizada' });
        }

        // Atualizar status
        logisticsData.updateStatus(status, reason, req.user.email);

        // Se for o primeiro envio, gerar código de rastreamento
        if (status === 'in_transit' && !logisticsData.trackingCode) {
            logisticsData.generateTrackingCode();
            logisticsData.setCarrier('E2E Transportes');
        }

        res.json({
            message: 'Status atualizado com sucesso',
            logistics: logisticsData.toJSON()
        });

    } catch (error) {
        if (error.message.includes('Transição de status inválida')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/logistics/:id/correct - Corrigir status logístico (apenas admin)
router.put('/:id/correct', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!status || !reason) {
            return res.status(400).json({ error: 'Status e motivo são obrigatórios' });
        }

        if (reason.trim().length < 10) {
            return res.status(400).json({ error: 'Motivo deve ter pelo menos 10 caracteres' });
        }

        const logisticsData = logistics.find(l => l.id === id);
        if (!logisticsData) {
            return res.status(404).json({ error: 'Logística não encontrada' });
        }

        // Corrigir status
        logisticsData.correctStatus(status, reason, req.user.email);

        res.json({
            message: 'Status corrigido com sucesso',
            logistics: logisticsData.toJSON()
        });

    } catch (error) {
        if (error.message.includes('Motivo da correção')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Erro ao corrigir status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/logistics/:id/tracking - Obter código de rastreamento
router.get('/:id/tracking', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const logisticsData = logistics.find(l => l.id === id);

        if (!logisticsData) {
            return res.status(404).json({ error: 'Logística não encontrada' });
        }

        // Verificar se o usuário tem acesso a este pedido
        if (req.user.role !== 'admin' && req.user.id !== logisticsData.userId) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        res.json({
            orderId: logisticsData.orderId,
            trackingCode: logisticsData.trackingCode,
            carrier: logisticsData.carrier,
            status: logisticsData.status,
            statusLabel: logisticsData.getStatusLabel(),
            shippingDate: logisticsData.shippingDate,
            deliveryDate: logisticsData.deliveryDate
        });

    } catch (error) {
        console.error('Erro ao buscar rastreamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/logistics/:id/history - Obter histórico de movimentações
router.get('/:id/history', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const logisticsData = logistics.find(l => l.id === id);

        if (!logisticsData) {
            return res.status(404).json({ error: 'Logística não encontrada' });
        }

        // Verificar se o usuário tem acesso a este pedido
        if (req.user.role !== 'admin' && req.user.id !== logisticsData.userId) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        res.json({
            orderId: logisticsData.orderId,
            history: logisticsData.history.map(entry => ({
                ...entry,
                statusLabel: logisticsData.getStatusLabelForStatus(entry.toStatus),
                timeAgo: logisticsData.getTimeAgo(entry.timestamp)
            }))
        });

    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/logistics/calculate-freight - Calcular frete
router.post('/calculate-freight', (req, res) => {
    try {
        const { totalAmount } = req.body;

        if (!totalAmount || totalAmount < 0) {
            return res.status(400).json({ error: 'Valor total inválido' });
        }

        const FREE_SHIPPING_THRESHOLD = 399.00;
        const FIXED_FREIGHT = 100.00;

        const freight = totalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : FIXED_FREIGHT;
        const isFreeShipping = freight === 0;

        res.json({
            totalAmount: totalAmount,
            freight: freight,
            isFreeShipping: isFreeShipping,
            freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
            finalAmount: totalAmount + freight
        });

    } catch (error) {
        console.error('Erro ao calcular frete:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/logistics/stats - Estatísticas de logística (apenas admin)
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
    try {
        const stats = {
            total: logistics.length,
            awaitingShipment: logistics.filter(l => l.status === 'awaiting_shipment').length,
            inTransit: logistics.filter(l => l.status === 'in_transit').length,
            delivered: logistics.filter(l => l.status === 'delivered').length,
            averageDeliveryTime: 0
        };

        // Calcular tempo médio de entrega
        const deliveredLogistics = logistics.filter(l => l.status === 'delivered' && l.deliveryTime);
        if (deliveredLogistics.length > 0) {
            const totalTime = deliveredLogistics.reduce((sum, l) => sum + l.deliveryTime, 0);
            stats.averageDeliveryTime = Math.round(totalTime / deliveredLogistics.length);
        }

        res.json(stats);

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
