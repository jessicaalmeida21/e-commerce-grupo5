const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mock de dados em memória
let users = [
    { id: 1, name: 'Admin', email: 'admin@ecommerce.com', password: 'Admin123@', role: 'admin' },
    { id: 2, name: 'Cliente Teste', email: 'cliente@teste.com', password: 'Cliente123@', role: 'client' },
    { id: 3, name: 'Fornecedor Teste', email: 'fornecedor@teste.com', password: 'Fornecedor123@', role: 'supplier' }
];

let products = [
    { id: 1, title: 'Produto 1', price: 100, category: 'casa', stock: 10, image: 'https://via.placeholder.com/300x200' },
    { id: 2, title: 'Produto 2', price: 200, category: 'eletronicos', stock: 5, image: 'https://via.placeholder.com/300x200' },
    { id: 3, title: 'Produto 3', price: 150, category: 'roupas', stock: 8, image: 'https://via.placeholder.com/300x200' }
];

let orders = [];
let cart = {};

// Rotas da API
app.get('/api/products', (req, res) => {
    res.json({ products });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({
            message: 'Login realizado com sucesso',
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token: 'mock-token-' + Date.now()
        });
    } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const newUser = { id: users.length + 1, name, email, password, role };
    users.push(newUser);
    
    res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
        token: 'mock-token-' + Date.now()
    });
});

app.post('/api/orders', (req, res) => {
    const { items, shipping_address } = req.body;
    const orderId = orders.length + 1;
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const order = {
        id: orderId,
        order_number: `PED-${orderId}`,
        items,
        total,
        shipping_address,
        status: 'pending_payment',
        created_at: new Date()
    };
    
    orders.push(order);
    res.status(201).json({ message: 'Pedido criado com sucesso', order });
});

// Servir páginas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cadastro.html'));
});

app.get('/produtos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'produtos.html'));
});

app.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contato.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`🔐 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Cadastro: http://localhost:${PORT}/cadastro`);
    console.log(`🛍️ Produtos: http://localhost:${PORT}/produtos`);
});

module.exports = app;

