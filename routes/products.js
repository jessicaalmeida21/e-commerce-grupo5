const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// Mock de banco de dados em memória
let products = [
    new Product(1, 'Smartphone Samsung Galaxy S21', 'Smartphone com tela de 6.2", câmera tripla de 64MP, 128GB de armazenamento', 'eletrônicos', 1299.99, 50, null, true, 100),
    new Product(2, 'Notebook Dell Inspiron 15', 'Notebook com processador Intel i5, 8GB RAM, SSD 256GB, tela Full HD 15.6"', 'eletrônicos', 2499.99, 25, null, true, 50),
    new Product(3, 'Camiseta Polo Masculina', 'Camiseta polo 100% algodão, disponível em várias cores e tamanhos', 'moda', 89.90, 100, null, true, 200),
    new Product(4, 'Tênis Nike Air Max', 'Tênis esportivo com tecnologia Air Max, ideal para corrida e caminhada', 'esportes', 299.90, 75, null, true, 150),
    new Product(5, 'Livro "O Poder do Hábito"', 'Livro de Charles Duhigg sobre como transformar hábitos e alcançar o sucesso', 'livros', 39.90, 30, null, true, 100),
    new Product(6, 'PlayStation 5', 'Console de videogame da Sony com SSD ultra-rápido e gráficos 4K', 'games', 4299.99, 10, null, true, 25),
    new Product(7, 'Cadeira Gamer RGB', 'Cadeira gamer ergonômica com apoio lombar e iluminação RGB', 'games', 599.90, 15, null, true, 30),
    new Product(8, 'Kit de Maquiagem Completo', 'Kit com base, pó, batom, sombra e pincéis profissionais', 'beleza', 199.90, 40, null, true, 80),
    new Product(9, 'Pneu Aro 15 175/70R14', 'Pneu para carro popular, garantia de 50.000 km', 'automotivo', 189.90, 20, null, true, 50),
    new Product(10, 'Sofá 3 Lugares Cinza', 'Sofá retrátil com pés de madeira, tecido resistente', 'casa', 899.90, 5, null, true, 15),
    new Product(11, 'Produto Inativo', 'Este produto está inativo para teste', 'eletrônicos', 99.90, 0, null, false, 10),
    new Product(12, 'Smartwatch Apple Watch', 'Relógio inteligente com GPS, monitoramento de saúde e resistência à água', 'eletrônicos', 1999.99, 35, null, true, 60),
    new Product(13, 'Mesa de Escritório', 'Mesa de madeira maciça com gavetas e prateleiras', 'casa', 459.90, 12, null, true, 25),
    new Product(14, 'Kit de Ferramentas', 'Kit completo com 50 peças para manutenção doméstica', 'casa', 129.90, 25, null, true, 50),
    new Product(15, 'Perfume Importado', 'Perfume masculino com fragrância amadeirada e duração de 8 horas', 'beleza', 149.90, 18, null, true, 40)
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

// GET /api/products - Listar produtos com filtros e paginação
router.get('/', (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            category = '', 
            sortBy = 'name', 
            sortOrder = 'asc' 
        } = req.query;

        let filteredProducts = [...products];

        // Filtrar por busca
        if (search) {
            filteredProducts = filteredProducts.filter(product => 
                product.name.toLowerCase().includes(search.toLowerCase()) ||
                product.description.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Filtrar por categoria
        if (category) {
            filteredProducts = filteredProducts.filter(product => 
                product.category.toLowerCase() === category.toLowerCase()
            );
        }

        // Ordenar
        filteredProducts.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            if (sortBy === 'price' || sortBy === 'stock') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            } else {
                aValue = aValue.toString().toLowerCase();
                bValue = bValue.toString().toLowerCase();
            }

            if (sortOrder === 'desc') {
                return bValue > aValue ? 1 : -1;
            } else {
                return aValue > bValue ? 1 : -1;
            }
        });

        // Paginação
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        // Obter categorias únicas para filtros
        const categories = [...new Set(products.map(p => p.category))];

        res.json({
            products: paginatedProducts.map(p => p.toListJSON()),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(filteredProducts.length / limit),
                totalItems: filteredProducts.length,
                itemsPerPage: parseInt(limit)
            },
            filters: {
                categories,
                search,
                category,
                sortBy,
                sortOrder
            }
        });

    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/products/:id - Obter detalhes de um produto
router.get('/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const product = products.find(p => p.id === productId);

        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.json({ product: product.toJSON() });

    } catch (error) {
        console.error('Erro ao obter produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/products/:id/stock - Aumentar estoque (apenas operadores e admins)
router.post('/:id/stock', authenticateToken, (req, res) => {
    try {
        // Verificar permissão
        if (!['operator', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Acesso negado. Apenas operadores e administradores podem gerenciar estoque.' });
        }

        const productId = parseInt(req.params.id);
        const { quantity } = req.body;

        const product = products.find(p => p.id === productId);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        // Validar quantidade
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Quantidade deve ser positiva' });
        }

        if (quantity % 10 !== 0) {
            return res.status(400).json({ error: 'Acréscimo deve ser em lotes de 10 (10, 20, 30...)' });
        }

        // Aplicar acréscimo de estoque
        const newStock = product.addStock(quantity);

        res.json({
            message: 'Estoque atualizado com sucesso',
            product: product.toJSON(),
            addedQuantity: quantity,
            newStock: newStock
        });

    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        
        if (error.message.includes('Produto inativo') || 
            error.message.includes('Acréscimo deve ser') ||
            error.message.includes('Operação ultrapassa')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/products/categories - Obter lista de categorias
router.get('/categories', (req, res) => {
    try {
        const categories = [...new Set(products.map(p => p.category))];
        res.json({ categories });
    } catch (error) {
        console.error('Erro ao obter categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/products/stats - Estatísticas de produtos (apenas admins)
router.get('/stats', authenticateToken, (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.isActive).length;
        const inactiveProducts = totalProducts - activeProducts;
        const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
        const lowStockProducts = products.filter(p => p.stock < 10).length;

        const categoryStats = products.reduce((acc, product) => {
            if (!acc[product.category]) {
                acc[product.category] = { count: 0, totalStock: 0 };
            }
            acc[product.category].count++;
            acc[product.category].totalStock += product.stock;
            return acc;
        }, {});

        res.json({
            totalProducts,
            activeProducts,
            inactiveProducts,
            totalStock,
            lowStockProducts,
            categoryStats
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;