const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Mock de banco de dados em memória
let users = [
    new User(1, 'Admin', 'admin@ecommerce.com', 'Admin123!@#', 'admin'),
    new User(2, 'Cliente Teste', 'cliente@teste.com', 'Cliente123!@#', 'client'),
    new User(3, 'Fornecedor Teste', 'fornecedor@teste.com', 'Fornecedor123!@#', 'supplier'),
    new User(4, 'Operador Teste', 'operador@teste.com', 'Operador123!@#', 'operator')
];

// Criptografar senhas dos usuários mock
users.forEach(async user => {
    await user.hashPassword();
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'e2e-commerce-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// POST /api/auth/register - Cadastro de usuário
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword, role, phone } = req.body;

        // Validar dados obrigatórios
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ 
                error: 'Todos os campos obrigatórios devem ser preenchidos' 
            });
        }

        // Validar confirmação de senha
        if (password !== confirmPassword) {
            return res.status(400).json({ 
                error: 'As senhas não coincidem' 
            });
        }

        // Combinar nome e sobrenome
        const name = `${firstName} ${lastName}`;

        // Verificar se email já existe
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                error: 'Email já cadastrado' 
            });
        }

        // Criar novo usuário
        const newUser = new User(
            users.length + 1,
            name,
            email,
            password,
            role,
            phone
        );

        // Validar dados
        const validation = newUser.validate();
        if (!validation.isValid) {
            return res.status(400).json({ 
                error: 'Dados inválidos',
                details: validation.errors 
            });
        }

        // Criptografar senha
        await newUser.hashPassword();

        // Salvar usuário
        users.push(newUser);

        // Gerar token
        const token = newUser.generateAuthToken();

        res.status(201).json({
            message: 'Usuário cadastrado com sucesso',
            user: newUser.toJSON(),
            token
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/auth/login - Login de usuário
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar dados obrigatórios
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email e senha são obrigatórios' 
            });
        }

        // Buscar usuário
        const user = users.find(u => u.email === email && u.isActive);
        if (!user) {
            return res.status(401).json({ 
                error: 'Credenciais inválidas' 
            });
        }

        // Verificar senha
        const isValidPassword = await user.checkPassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Credenciais inválidas' 
            });
        }

        // Gerar token
        const token = user.generateAuthToken();

        res.json({
            message: 'Login realizado com sucesso',
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/auth/logout - Logout de usuário
router.post('/logout', authenticateToken, (req, res) => {
    // Em um sistema real, você invalidaria o token aqui
    res.json({ message: 'Logout realizado com sucesso' });
});

// GET /api/auth/profile - Obter perfil do usuário
router.get('/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user: user.toJSON() });
});

// PUT /api/auth/profile - Atualizar perfil do usuário
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, currentPassword, newPassword } = req.body;
        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha atual se fornecida
        if (currentPassword) {
            const isValidPassword = await user.checkPassword(currentPassword);
            if (!isValidPassword) {
                return res.status(400).json({ error: 'Senha atual incorreta' });
            }
        }

        // Atualizar dados
        if (name) user.name = name;
        if (email) {
            // Verificar se email já existe em outro usuário
            const existingUser = users.find(u => u.email === email && u.id !== user.id);
            if (existingUser) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }
            user.email = email;
        }
        if (newPassword) {
            user.password = newPassword;
            await user.hashPassword();
        }

        user.updatedAt = new Date();

        res.json({
            message: 'Perfil atualizado com sucesso',
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Erro na atualização:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/auth/forgot-password - Solicitar recuperação de senha
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const user = users.find(u => u.email === email && u.isActive);
        if (!user) {
            // Por segurança, não revelar se o email existe ou não
            return res.json({ 
                message: 'Se o email estiver cadastrado, você receberá instruções de recuperação' 
            });
        }

        // Em um sistema real, você enviaria um email com link de recuperação
        // Por enquanto, apenas retornamos sucesso
        res.json({ 
            message: 'Instruções de recuperação enviadas para seu email' 
        });

    } catch (error) {
        console.error('Erro na recuperação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/auth/users - Listar usuários (apenas admin)
router.get('/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    const userList = users.map(user => user.toJSON());
    res.json({ users: userList });
});

// DELETE /api/auth/users/:id - Excluir usuário (apenas admin)
router.delete('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não permitir auto-exclusão
    if (userId === req.user.id) {
        return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
    }

    users.splice(userIndex, 1);
    res.json({ message: 'Usuário excluído com sucesso' });
});

module.exports = router;