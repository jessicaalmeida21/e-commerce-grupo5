class Product {
    constructor(id, name, description, category, price, stock, image, isActive = true, maxStock = null, createdAt = null, updatedAt = null) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.price = price;
        this.stock = stock;
        this.image = image;
        this.isActive = isActive;
        this.maxStock = maxStock; // Limite máximo de estoque (opcional)
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
    }

    // Validar dados do produto
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Nome deve ter pelo menos 2 caracteres');
        }

        if (!this.description || this.description.trim().length < 10) {
            errors.push('Descrição deve ter pelo menos 10 caracteres');
        }

        if (!this.category || this.category.trim().length < 2) {
            errors.push('Categoria é obrigatória');
        }

        if (!this.price || this.price <= 0) {
            errors.push('Preço deve ser maior que zero');
        }

        if (this.stock < 0) {
            errors.push('Estoque não pode ser negativo');
        }

        if (this.maxStock && this.stock > this.maxStock) {
            errors.push('Estoque atual excede o limite máximo');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Aumentar estoque em lotes de 10
    addStock(quantity) {
        // Validar se o produto está ativo
        if (!this.isActive) {
            throw new Error('Produto inativo: não é possível ajustar estoque');
        }

        // Validar se a quantidade é múltiplo de 10
        if (quantity % 10 !== 0) {
            throw new Error('Acréscimo deve ser em lotes de 10 (10, 20, 30...)');
        }

        // Validar se a quantidade é positiva
        if (quantity <= 0) {
            throw new Error('Quantidade deve ser positiva');
        }

        // Verificar limite máximo de estoque
        if (this.maxStock && (this.stock + quantity) > this.maxStock) {
            throw new Error(`Operação ultrapassa o limite de estoque (máx. ${this.maxStock})`);
        }

        // Aplicar acréscimo
            this.stock += quantity;
        this.updatedAt = new Date();

        return this.stock;
    }

    // Obter imagem baseada na categoria
    getImageUrl() {
        if (this.image) {
            return this.image;
        }

        // Imagens padrão baseadas na categoria
        const categoryImages = {
            'eletrônicos': 'https://images.unsplash.com/photo-1498049794561-7780c723c765?w=300&h=200&fit=crop',
            'moda': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop',
            'casa': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop',
            'esportes': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop',
            'livros': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop',
            'games': 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=200&fit=crop',
            'beleza': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=200&fit=crop',
            'automotivo': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop'
        };

        return categoryImages[this.category.toLowerCase()] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=200&fit=crop';
    }

    // Retornar dados sem informações sensíveis
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category,
            price: this.price,
            stock: this.stock,
            image: this.getImageUrl(),
            isActive: this.isActive,
            maxStock: this.maxStock,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Retornar dados para listagem (versão resumida)
    toListJSON() {
        return {
            id: this.id,
            name: this.name,
            category: this.category,
            price: this.price,
            stock: this.stock,
            image: this.getImageUrl(),
            isActive: this.isActive
        };
    }
}

module.exports = Product;