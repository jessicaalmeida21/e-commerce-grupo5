const express = require('express');
const Address = require('../models/Address');
const router = express.Router();

// Mock de banco de dados em memória
let addresses = [];

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

// GET /api/addresses - Listar endereços do usuário
router.get('/', authenticateToken, (req, res) => {
    try {
        const userAddresses = addresses.filter(address => address.userId === req.user.id);
        const addressesWithDetails = userAddresses.map(address => address.toJSON());
        
        res.json({ addresses: addressesWithDetails });
    } catch (error) {
        console.error('Erro ao listar endereços:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/addresses/:id - Obter endereço específico
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const addressId = parseInt(req.params.id);
        const address = addresses.find(a => a.id === addressId && a.userId === req.user.id);

        if (!address) {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }

        res.json({ address: address.toJSON() });
    } catch (error) {
        console.error('Erro ao obter endereço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/addresses - Criar novo endereço
router.post('/', authenticateToken, (req, res) => {
    try {
        const { type, cep, street, number, complement, neighborhood, city, state, isDefault } = req.body;

        // Validar dados obrigatórios
        if (!type || !cep || !street || !number || !neighborhood || !city || !state) {
            return res.status(400).json({ 
                error: 'Todos os campos obrigatórios devem ser preenchidos' 
            });
        }

        // Verificar limite de 3 endereços por usuário
        const userAddresses = addresses.filter(a => a.userId === req.user.id);
        if (userAddresses.length >= 3) {
            return res.status(400).json({ 
                error: 'Limite máximo de 3 endereços atingido' 
            });
        }

        // Se for o primeiro endereço ou marcado como padrão, definir como padrão
        const shouldBeDefault = userAddresses.length === 0 || isDefault;

        // Se marcado como padrão, remover padrão dos outros endereços
        if (shouldBeDefault) {
            userAddresses.forEach(addr => {
                addr.isDefault = false;
            });
        }

        // Criar endereço
        const addressId = addresses.length + 1;
        const address = new Address(
            addressId,
            req.user.id,
            type,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            shouldBeDefault
        );

        // Validar endereço
        const validation = address.validate();
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: 'Dados do endereço inválidos',
                details: validation.errors 
            });
        }

        // Salvar endereço
        addresses.push(address);

        res.status(201).json({
            message: 'Endereço criado com sucesso',
            address: address.toJSON()
        });

    } catch (error) {
        console.error('Erro ao criar endereço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/addresses/:id - Atualizar endereço
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const addressId = parseInt(req.params.id);
        const address = addresses.find(a => a.id === addressId && a.userId === req.user.id);

        if (!address) {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }

        const { type, cep, street, number, complement, neighborhood, city, state, isDefault } = req.body;

        // Atualizar campos fornecidos
        if (type) address.type = type;
        if (cep) address.cep = cep;
        if (street) address.street = street;
        if (number) address.number = number;
        if (complement !== undefined) address.complement = complement;
        if (neighborhood) address.neighborhood = neighborhood;
        if (city) address.city = city;
        if (state) address.state = state;

        // Se marcado como padrão, remover padrão dos outros endereços
        if (isDefault) {
            const userAddresses = addresses.filter(a => a.userId === req.user.id && a.id !== addressId);
            userAddresses.forEach(addr => {
                addr.isDefault = false;
            });
            address.isDefault = true;
        }

        address.updatedAt = new Date();

        // Validar endereço atualizado
        const validation = address.validate();
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: 'Dados do endereço inválidos',
                details: validation.errors 
            });
        }

        res.json({
            message: 'Endereço atualizado com sucesso',
            address: address.toJSON()
        });

    } catch (error) {
        console.error('Erro ao atualizar endereço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /api/addresses/:id - Excluir endereço
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const addressId = parseInt(req.params.id);
        const addressIndex = addresses.findIndex(a => a.id === addressId && a.userId === req.user.id);

        if (addressIndex === -1) {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }

        const address = addresses[addressIndex];

        // Verificar se é o último endereço
        const userAddresses = addresses.filter(a => a.userId === req.user.id);
        if (userAddresses.length === 1) {
            return res.status(400).json({ 
                error: 'Não é possível excluir o último endereço' 
            });
        }

        // Remover endereço
        addresses.splice(addressIndex, 1);

        // Se era o endereço padrão, definir outro como padrão
        if (address.isDefault) {
            const remainingAddresses = addresses.filter(a => a.userId === req.user.id);
            if (remainingAddresses.length > 0) {
                remainingAddresses[0].isDefault = true;
            }
        }

        res.json({ message: 'Endereço excluído com sucesso' });

    } catch (error) {
        console.error('Erro ao excluir endereço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/addresses/cep - Buscar endereço por CEP
router.post('/cep', (req, res) => {
    try {
        const { cep } = req.body;

        if (!cep) {
            return res.status(400).json({ error: 'CEP é obrigatório' });
        }

        // Simular busca de CEP (em produção, usar API como ViaCEP)
        const mockAddresses = {
            '01310-100': {
                street: 'Avenida Paulista',
                neighborhood: 'Bela Vista',
                city: 'São Paulo',
                state: 'SP'
            },
            '20040-020': {
                street: 'Rua da Carioca',
                neighborhood: 'Centro',
                city: 'Rio de Janeiro',
                state: 'RJ'
            },
            '40070-110': {
                street: 'Rua Chile',
                neighborhood: 'Centro',
                city: 'Salvador',
                state: 'BA'
            }
        };

        const addressData = mockAddresses[cep];
        if (!addressData) {
            return res.status(404).json({ error: 'CEP não encontrado' });
        }

        res.json({
            cep: cep,
            street: addressData.street,
            neighborhood: addressData.neighborhood,
            city: addressData.city,
            state: addressData.state
        });

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;
