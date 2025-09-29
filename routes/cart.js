const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// Mock de banco de dados em memória para carrinhos
let carts = {};

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
    const products = [
        new Product(1, 'Smartphone Samsung Galaxy S21', 'Smartphone com tela de 6.2", câmera tripla de 64MP, 128GB de armazenamento', 'eletrônicos', 1299.99, 50, null, true, 100),
        new Product(2, 'Notebook Dell Inspiron 15', 'Notebook com processador Intel i5, 8GB RAM, SSD 256GB, tela Full HD 15.6"', 'eletrônicos', 2499.99, 25, null, true, 50),
        new Product(3, 'Camiseta Polo Masculina', 'Camiseta polo 100% algodão, disponível em várias cores e tamanhos', 'moda', 89.90, 100, null, true, 200),
        new Product(4, 'Tênis Nike Air Max', 'Tênis esportivo com tecnologia Air Max, ideal para corrida e caminhada', 'esportes', 299.90, 75, null, true, 150),
        new Product(5, 'Livro "O Poder do Hábito"', 'Livro de Charles Duhigg sobre como transformar hábitos e alcançar o sucesso', 'livros', 39.90, 30, null, true, 100)
    ];
    return products;
};

const products = initializeProducts();

// GET /api/cart - Obter carrinho do usuário
router.get('/', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const cart = carts[userId] || { items: [], total: 0 };

        // Enriquecer itens com dados do produto
        const enrichedItems = cart.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                ...item,
                product: product ? product.toJSON() : null
            };
        });

        res.json({
            items: enrichedItems,
            total: cart.total,
            itemCount: cart.items.length
        });

    } catch (error) {
        console.error('Erro ao obter carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/cart/add - Adicionar produto ao carrinho
router.post('/add', authenticateToken, (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const userId = req.user.id;

        // Validar dados
        if (!productId || quantity <= 0) {
            return res.status(400).json({ 
                error: 'ID do produto e quantidade são obrigatórios' 
            });
        }

        // Buscar produto
        const product = products.find(p => p.id === productId);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        if (!product.isActive) {
            return res.status(400).json({ error: 'Produto não está disponível' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ 
                error: `Estoque insuficiente. Disponível: ${product.stock}` 
            });
        }

        // Inicializar carrinho se não existir
        if (!carts[userId]) {
            carts[userId] = { items: [], total: 0 };
        }

        const cart = carts[userId];

        // Verificar se produto já está no carrinho
        const existingItem = cart.items.find(item => item.productId === productId);
        
        if (existingItem) {
            // Atualizar quantidade
            const newQuantity = existingItem.quantity + quantity;
            
            if (product.stock < newQuantity) {
                return res.status(400).json({ 
                    error: `Estoque insuficiente. Disponível: ${product.stock}` 
                });
            }

            existingItem.quantity = newQuantity;
            existingItem.subtotal = newQuantity * product.price;
        } else {
            // Adicionar novo item
            cart.items.push({
                productId: productId,
                productName: product.name,
                quantity: quantity,
                price: product.price,
                subtotal: quantity * product.price
            });
        }

        // Recalcular total
        cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

        res.json({
            message: 'Produto adicionado ao carrinho',
            cart: {
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.length
            }
        });

    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/cart/update - Atualizar quantidade de produto no carrinho
router.put('/update', authenticateToken, (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id;

        // Validar dados
        if (!productId || quantity < 0) {
            return res.status(400).json({ 
                error: 'ID do produto e quantidade são obrigatórios' 
            });
        }

        // Buscar produto
        const product = products.find(p => p.id === productId);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        // Inicializar carrinho se não existir
        if (!carts[userId]) {
            carts[userId] = { items: [], total: 0 };
        }

        const cart = carts[userId];

        // Verificar se produto está no carrinho
        const itemIndex = cart.items.findIndex(item => item.productId === productId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Produto não encontrado no carrinho' });
        }

        if (quantity === 0) {
            // Remover item
            cart.items.splice(itemIndex, 1);
        } else {
            // Verificar estoque
            if (product.stock < quantity) {
                return res.status(400).json({ 
                    error: `Estoque insuficiente. Disponível: ${product.stock}` 
                });
            }

            // Atualizar quantidade
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].subtotal = quantity * product.price;
        }

        // Recalcular total
        cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

        res.json({
            message: 'Carrinho atualizado',
            cart: {
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.length
            }
        });

    } catch (error) {
        console.error('Erro ao atualizar carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/cart/remove - Remover produto do carrinho
router.delete('/remove', authenticateToken, (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;

        // Validar dados
        if (!productId) {
            return res.status(400).json({ error: 'ID do produto é obrigatório' });
        }

        // Inicializar carrinho se não existir
        if (!carts[userId]) {
            carts[userId] = { items: [], total: 0 };
        }

        const cart = carts[userId];

        // Verificar se produto está no carrinho
        const itemIndex = cart.items.findIndex(item => item.productId === productId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Produto não encontrado no carrinho' });
        }

        // Remover item
        cart.items.splice(itemIndex, 1);

        // Recalcular total
        cart.total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

        res.json({
            message: 'Produto removido do carrinho',
            cart: {
                items: cart.items,
                total: cart.total,
                itemCount: cart.items.length
            }
        });

    } catch (error) {
        console.error('Erro ao remover do carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/cart/clear - Limpar carrinho
router.delete('/clear', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        carts[userId] = { items: [], total: 0 };

        res.json({
            message: 'Carrinho limpo',
            cart: {
                items: [],
                total: 0,
                itemCount: 0
            }
        });

    } catch (error) {
        console.error('Erro ao limpar carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
