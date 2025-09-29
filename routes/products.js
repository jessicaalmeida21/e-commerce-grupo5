const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult, query } = require('express-validator');

const router = express.Router();

// Validações
const productValidation = [
    body('title').trim().isLength({ min: 3 }).withMessage('Título deve ter pelo menos 3 caracteres'),
    body('description').optional().trim(),
    body('category').trim().notEmpty().withMessage('Categoria é obrigatória'),
    body('brand').optional().trim(),
    body('price').isFloat({ min: 0.01 }).withMessage('Preço deve ser maior que zero'),
    body('stock_quantity').isInt({ min: 0 }).withMessage('Quantidade em estoque deve ser não negativa'),
    body('max_stock').optional().isInt({ min: 1 }).withMessage('Estoque máximo deve ser positivo'),
    body('sku').optional().trim(),
    body('image_url').optional().isURL().withMessage('URL da imagem deve ser válida')
];

// Listar produtos (público)
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Tamanho da página deve ser entre 1 e 100'),
    query('category').optional().trim(),
    query('search').optional().trim(),
    query('sortBy').optional().isIn(['name', 'price', 'created_at']).withMessage('Ordenação inválida'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Ordem inválida')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 12;
        const offset = (page - 1) * pageSize;
        const category = req.query.category;
        const search = req.query.search;
        const sortBy = req.query.sortBy || 'created_at';
        const sortOrder = req.query.sortOrder || 'desc';

        let whereClause = 'WHERE is_active = true';
        let params = [];

        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }

        if (search) {
            whereClause += ' AND (title LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Contar total de produtos
        const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
        const [countResult] = await pool.execute(countQuery, params);
        const total = countResult[0].total;

        // Buscar produtos
        const productsQuery = `
            SELECT p.*, u.name as supplier_name
            FROM products p
            LEFT JOIN users u ON p.supplier_id = u.id
            ${whereClause}
            ORDER BY p.${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
        
        params.push(pageSize, offset);
        const [products] = await pool.execute(productsQuery, params);

        res.json({
            products,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar produto por ID (público)
router.get('/:id', async (req, res) => {
    try {
        const productId = req.params.id;

        const [products] = await pool.execute(`
            SELECT p.*, u.name as supplier_name
            FROM products p
            LEFT JOIN users u ON p.supplier_id = u.id
            WHERE p.id = ? AND p.is_active = true
        `, [productId]);

        if (products.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        res.json({ product: products[0] });

    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar produto (apenas fornecedores e admins)
router.post('/', authenticateToken, requireRole(['supplier', 'admin']), productValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            title, description, category, brand, price, stock_quantity,
            max_stock, sku, image_url
        } = req.body;

        // Verificar se SKU já existe
        if (sku) {
            const [existingProducts] = await pool.execute(
                'SELECT id FROM products WHERE sku = ?',
                [sku]
            );

            if (existingProducts.length > 0) {
                return res.status(400).json({ error: 'SKU já existe' });
            }
        }

        // Inserir produto
        const [result] = await pool.execute(`
            INSERT INTO products (title, description, category, brand, price, stock_quantity, 
                                max_stock, sku, image_url, supplier_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [title, description, category, brand, price, stock_quantity, 
            max_stock || 1000, sku, image_url, req.user.id]);

        const productId = result.insertId;

        // Buscar produto criado
        const [products] = await pool.execute(`
            SELECT p.*, u.name as supplier_name
            FROM products p
            LEFT JOIN users u ON p.supplier_id = u.id
            WHERE p.id = ?
        `, [productId]);

        res.status(201).json({
            message: 'Produto criado com sucesso',
            product: products[0]
        });

    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar produto (apenas fornecedores e admins)
router.put('/:id', authenticateToken, requireRole(['supplier', 'admin']), productValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const productId = req.params.id;
        const {
            title, description, category, brand, price, stock_quantity,
            max_stock, sku, image_url, is_active
        } = req.body;

        // Verificar se produto existe e se o usuário tem permissão
        const [existingProducts] = await pool.execute(`
            SELECT supplier_id FROM products WHERE id = ?
        `, [productId]);

        if (existingProducts.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        // Verificar permissão (admin pode editar qualquer produto, fornecedor apenas os seus)
        if (req.user.role !== 'admin' && existingProducts[0].supplier_id !== req.user.id) {
            return res.status(403).json({ error: 'Você só pode editar seus próprios produtos' });
        }

        // Verificar se SKU já existe para outro produto
        if (sku) {
            const [skuCheck] = await pool.execute(
                'SELECT id FROM products WHERE sku = ? AND id != ?',
                [sku, productId]
            );

            if (skuCheck.length > 0) {
                return res.status(400).json({ error: 'SKU já existe' });
            }
        }

        // Atualizar produto
        await pool.execute(`
            UPDATE products SET 
                title = ?, description = ?, category = ?, brand = ?, 
                price = ?, stock_quantity = ?, max_stock = ?, 
                sku = ?, image_url = ?, is_active = ?
            WHERE id = ?
        `, [title, description, category, brand, price, stock_quantity, 
            max_stock, sku, image_url, is_active !== undefined ? is_active : true, productId]);

        res.json({ message: 'Produto atualizado com sucesso' });

    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar produto (apenas fornecedores e admins)
router.delete('/:id', authenticateToken, requireRole(['supplier', 'admin']), async (req, res) => {
    try {
        const productId = req.params.id;

        // Verificar se produto existe e se o usuário tem permissão
        const [existingProducts] = await pool.execute(`
            SELECT supplier_id FROM products WHERE id = ?
        `, [productId]);

        if (existingProducts.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        // Verificar permissão
        if (req.user.role !== 'admin' && existingProducts[0].supplier_id !== req.user.id) {
            return res.status(403).json({ error: 'Você só pode deletar seus próprios produtos' });
        }

        // Soft delete (marcar como inativo)
        await pool.execute(
            'UPDATE products SET is_active = false WHERE id = ?',
            [productId]
        );

        res.json({ message: 'Produto removido com sucesso' });

    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Aumentar estoque (apenas operadores e admins)
router.post('/:id/stock', authenticateToken, requireRole(['admin']), [
    body('quantity').isInt({ min: 10 }).withMessage('Quantidade deve ser múltiplo de 10 e no mínimo 10')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const productId = req.params.id;
        const { quantity } = req.body;

        // Verificar se quantidade é múltiplo de 10
        if (quantity % 10 !== 0) {
            return res.status(400).json({ 
                error: 'Acréscimo deve ser em lotes de 10 (10, 20, 30...)' 
            });
        }

        // Buscar produto
        const [products] = await pool.execute(`
            SELECT id, title, stock_quantity, max_stock, is_active 
            FROM products WHERE id = ?
        `, [productId]);

        if (products.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        const product = products[0];

        // Verificar se produto está ativo
        if (!product.is_active) {
            return res.status(400).json({ 
                error: 'Produto inativo: não é possível ajustar estoque' 
            });
        }

        // Verificar limite de estoque
        const newStock = product.stock_quantity + quantity;
        if (newStock > product.max_stock) {
            return res.status(400).json({ 
                error: `Operação ultrapassa o limite de estoque (máx. ${product.max_stock})` 
            });
        }

        // Atualizar estoque
        await pool.execute(
            'UPDATE products SET stock_quantity = ? WHERE id = ?',
            [newStock, productId]
        );

        res.json({
            message: 'Estoque atualizado com sucesso',
            product: {
                id: productId,
                title: product.title,
                old_stock: product.stock_quantity,
                added_quantity: quantity,
                new_stock: newStock
            }
        });

    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
        res.status(500).json({ error: 'Falha ao atualizar estoque. Tente novamente.' });
    }
});

// Listar categorias
router.get('/categories/list', async (req, res) => {
    try {
        const [categories] = await pool.execute(`
            SELECT DISTINCT category, COUNT(*) as product_count
            FROM products 
            WHERE is_active = true 
            GROUP BY category 
            ORDER BY category
        `);

        res.json({ categories });

    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
