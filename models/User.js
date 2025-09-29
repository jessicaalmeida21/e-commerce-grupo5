const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
    constructor(id, name, email, password, role, phone = null, isActive = true, createdAt = null, updatedAt = null) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role; // 'client', 'supplier', 'admin', 'operator'
        this.phone = phone;
        this.isActive = isActive;
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
    }

    // Criptografar senha
    async hashPassword() {
        const saltRounds = 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
    }

    // Verificar senha
    async checkPassword(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    }

    // Gerar token JWT
    generateAuthToken() {
        return jwt.sign(
            { 
                id: this.id, 
                email: this.email, 
                role: this.role 
            },
            process.env.JWT_SECRET || 'e2e-commerce-secret-key',
            { expiresIn: '24h' }
        );
    }

    // Validar dados do usuário
    validate() {
        const errors = [];

        if (!this.name || this.name.trim().length < 2) {
            errors.push('Nome deve ter pelo menos 2 caracteres');
        }

        if (!this.email || !this.isValidEmail(this.email)) {
            errors.push('Email inválido');
        }

        if (!this.password || !this.isValidPassword(this.password)) {
            errors.push('Senha deve ter pelo menos 10 caracteres com números, letras e caracteres especiais');
        }

        if (!['client', 'supplier', 'admin', 'operator'].includes(this.role)) {
            errors.push('Perfil inválido');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validar email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validar senha
    isValidPassword(password) {
        // Mínimo 10 caracteres, com números, letras e caracteres especiais
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
        return passwordRegex.test(password);
    }

    // Retornar dados sem senha
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Criar usuário a partir de dados do banco
    static fromDatabase(row) {
        return new User(
            row.id,
            row.name,
            row.email,
            row.password,
            row.role,
            row.is_active,
            row.created_at,
            row.updated_at
        );
    }
}

module.exports = User;
