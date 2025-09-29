class Product {
    constructor(id, name, description, category, price, stock, supplierId, isActive = true, imageUrl = null, sku = null, createdAt = null, updatedAt = null) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.price = price;
        this.stock = stock;
        this.supplierId = supplierId;
        this.isActive = isActive;
        this.imageUrl = imageUrl;
        this.sku = sku || this.generateSKU();
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
    }

    // Gerar SKU automático
    generateSKU() {
        const prefix = this.category.substring(0, 3).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${prefix}-${random}`;
    }

    // Validar dados do produto
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Nome do produto deve ter pelo menos 2 caracteres');
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

        if (!this.supplierId) {
            errors.push('Fornecedor é obrigatório');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Atualizar estoque
    updateStock(quantity, operation = 'add') {
        if (operation === 'add') {
            this.stock += quantity;
        } else if (operation === 'subtract') {
            this.stock = Math.max(0, this.stock - quantity);
        } else if (operation === 'set') {
            this.stock = quantity;
        }
        
        this.updatedAt = new Date();
    }

    // Verificar disponibilidade
    isAvailable(quantity = 1) {
        return this.isActive && this.stock >= quantity;
    }

    // Retornar dados para API
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category,
            price: this.price,
            stock: this.stock,
            supplierId: this.supplierId,
            isActive: this.isActive,
            imageUrl: this.imageUrl,
            sku: this.sku,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Criar produto a partir de dados do banco
    static fromDatabase(row) {
        return new Product(
            row.id,
            row.name,
            row.description,
            row.category,
            row.price,
            row.stock,
            row.supplier_id,
            row.is_active,
            row.image_url,
            row.sku,
            row.created_at,
            row.updated_at
        );
    }
}

module.exports = Product;
