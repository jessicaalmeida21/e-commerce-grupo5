class Address {
    constructor(id, userId, type, cep, street, number, complement, neighborhood, city, state, isDefault = false, createdAt = null, updatedAt = null) {
        this.id = id;
        this.userId = userId;
        this.type = type; // 'residential', 'commercial', 'delivery'
        this.cep = cep;
        this.street = street;
        this.number = number;
        this.complement = complement;
        this.neighborhood = neighborhood;
        this.city = city;
        this.state = state;
        this.isDefault = isDefault;
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
    }

    // Validar dados do endereço
    validate() {
        const errors = [];

        if (!this.userId) {
            errors.push('ID do usuário é obrigatório');
        }

        if (!this.type || !['residential', 'commercial', 'delivery'].includes(this.type)) {
            errors.push('Tipo de endereço inválido');
        }

        if (!this.cep || !this.isValidCEP(this.cep)) {
            errors.push('CEP inválido');
        }

        if (!this.street || this.street.trim().length < 3) {
            errors.push('Rua deve ter pelo menos 3 caracteres');
        }

        if (!this.number || this.number.trim().length === 0) {
            errors.push('Número é obrigatório');
        }

        if (!this.neighborhood || this.neighborhood.trim().length < 3) {
            errors.push('Bairro deve ter pelo menos 3 caracteres');
        }

        if (!this.city || this.city.trim().length < 2) {
            errors.push('Cidade deve ter pelo menos 2 caracteres');
        }

        if (!this.state || this.state.trim().length !== 2) {
            errors.push('Estado deve ter 2 caracteres');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validar CEP
    isValidCEP(cep) {
        const cepRegex = /^\d{5}-?\d{3}$/;
        return cepRegex.test(cep);
    }

    // Formatar CEP
    formatCEP() {
        return this.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }

    // Obter tipo em português
    getTypeLabel() {
        const typeLabels = {
            'residential': 'Residencial',
            'commercial': 'Comercial',
            'delivery': 'Entrega'
        };
        return typeLabels[this.type] || this.type;
    }

    // Retornar endereço completo formatado
    getFullAddress() {
        let address = `${this.street}, ${this.number}`;
        if (this.complement) {
            address += `, ${this.complement}`;
        }
        address += ` - ${this.neighborhood}, ${this.city}/${this.state}`;
        address += ` - CEP: ${this.formatCEP()}`;
        return address;
    }

    // Retornar dados sem informações sensíveis
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            type: this.type,
            typeLabel: this.getTypeLabel(),
            cep: this.cep,
            street: this.street,
            number: this.number,
            complement: this.complement,
            neighborhood: this.neighborhood,
            city: this.city,
            state: this.state,
            isDefault: this.isDefault,
            fullAddress: this.getFullAddress(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = Address;
