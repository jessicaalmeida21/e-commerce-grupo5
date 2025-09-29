const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de CORS
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://ecommerce-grupo5.vercel.app',
            'https://ecommerce-grupo5.netlify.app',
            'https://ecommerce-grupo5.railway.app',
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            if (process.env.NODE_ENV === 'development') {
                callback(null, true);
    } else {
                callback(new Error('Não permitido pelo CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Rotas básicas para servir páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/produtos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'produtos.html'));
});

app.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contato.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cadastro.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/pagamento', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pagamento.html'));
});

app.get('/logistica', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logistica.html'));
});

// API Mock para produtos (sem banco de dados)
app.get('/api/products', (req, res) => {
    const mockProducts = [
        {
            id: 'PROD-001',
            title: 'Smartphone Samsung Galaxy S23',
            category: 'Eletrônicos',
            price: { final: 2500.00 },
            image: 'https://via.placeholder.com/300x200?text=Samsung+Galaxy+S23',
            rating: { average: 4.5, count: 128 }
        },
        {
            id: 'PROD-002',
            title: 'Notebook Dell Inspiron 15',
            category: 'Eletrônicos',
            price: { final: 3200.00 },
            image: 'https://via.placeholder.com/300x200?text=Dell+Inspiron+15',
            rating: { average: 4.3, count: 89 }
        },
        {
            id: 'PROD-003',
            title: 'Fone de Ouvido JBL',
            category: 'Eletrônicos',
            price: { final: 299.99 },
            image: 'https://via.placeholder.com/300x200?text=JBL+Headphones',
            rating: { average: 4.7, count: 256 }
        },
        {
            id: 'PROD-004',
            title: 'Camiseta Nike Dri-FIT',
            category: 'Moda',
            price: { final: 89.90 },
            image: 'https://via.placeholder.com/300x200?text=Nike+Camiseta',
            rating: { average: 4.2, count: 67 }
        },
        {
            id: 'PROD-005',
            title: 'Tênis Adidas Ultraboost',
            category: 'Moda',
            price: { final: 599.99 },
            image: 'https://via.placeholder.com/300x200?text=Adidas+Ultraboost',
            rating: { average: 4.6, count: 143 }
        },
        {
            id: 'PROD-006',
            title: 'Livro JavaScript: O Guia Definitivo',
            category: 'Livros',
            price: { final: 129.90 },
            image: 'https://via.placeholder.com/300x200?text=JavaScript+Guide',
            rating: { average: 4.8, count: 89 }
        }
    ];

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    const products = mockProducts.slice(startIndex, endIndex);
    
    res.json({
        products: products,
        meta: {
            total: mockProducts.length,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(mockProducts.length / pageSize)
        }
    });
});

// Healthcheck endpoint para Railway
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`🔐 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Cadastro: http://localhost:${PORT}/cadastro`);
    console.log(`🛍️ Produtos: http://localhost:${PORT}/produtos`);
    console.log(`\n✨ Funcionalidades disponíveis:`);
    console.log(`   ❤️ Sistema de Wishlist`);
    console.log(`   🔔 Notificações Toast`);
    console.log(`   🛒 Carrinho de Compras`);
    console.log(`   📱 Design Responsivo`);
});
