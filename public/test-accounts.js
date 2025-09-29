// Contas de teste para demonstração
const TEST_ACCOUNTS = {
    admin: {
        email: 'admin@ecommerce.com',
        password: 'Admin123!@#',
        name: 'Administrador',
        role: 'admin'
    },
    supplier: {
        email: 'fornecedor@teste.com',
        password: 'Fornecedor123!@#',
        name: 'João Fornecedor',
        role: 'supplier'
    },
    client: {
        email: 'cliente@teste.com',
        password: 'Cliente123!@#',
        name: 'Maria Cliente',
        role: 'client'
    },
    operator: {
        email: 'operador@teste.com',
        password: 'Operador123!@#',
        name: 'Pedro Operador',
        role: 'operator'
    }
};

// Função para fazer login com conta de teste
function loginWithTestAccount(accountType) {
    const account = TEST_ACCOUNTS[accountType];
    if (!account) {
        showNotification('Conta de teste não encontrada', 'error');
        return;
    }

    // Simular login
    const user = {
        id: Math.random().toString(36).substr(2, 9),
        name: account.name,
        email: account.email,
        role: account.role,
        phone: '(11) 99999-9999',
        address: 'Rua das Flores, 123 - São Paulo, SP'
    };

    const token = 'test_token_' + Math.random().toString(36).substr(2, 9);

    // Salvar no localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    showNotification(`Login realizado como ${account.name} (${account.role})`, 'success');

    // Redirecionar para a página apropriada
    setTimeout(() => {
        if (account.role === 'admin' || account.role === 'supplier' || account.role === 'operator') {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 1000);
}

// Função para criar dados de teste
function createTestData() {
    // Dados de produtos de exemplo
    const testProducts = [
        {
            id: 'PROD-001',
            title: 'Smartphone Galaxy S24',
            category: 'eletronicos',
            price: { final: 2999.90 },
            image: 'https://via.placeholder.com/300x200?text=Galaxy+S24',
            rating: { average: 4.8, count: 156 },
            stock: { quantity: 15 }
        },
        {
            id: 'PROD-002',
            title: 'Notebook Dell Inspiron',
            category: 'eletronicos',
            price: { final: 2499.00 },
            image: 'https://via.placeholder.com/300x200?text=Dell+Inspiron',
            rating: { average: 4.5, count: 89 },
            stock: { quantity: 8 }
        },
        {
            id: 'PROD-003',
            title: 'Tênis Nike Air Max',
            category: 'esportes',
            price: { final: 399.90 },
            image: 'https://via.placeholder.com/300x200?text=Nike+Air+Max',
            rating: { average: 4.6, count: 234 },
            stock: { quantity: 25 }
        },
        {
            id: 'PROD-004',
            title: 'Camiseta Polo Ralph Lauren',
            category: 'roupas',
            price: { final: 199.90 },
            image: 'https://via.placeholder.com/300x200?text=Polo+Ralph+Lauren',
            rating: { average: 4.3, count: 67 },
            stock: { quantity: 30 }
        },
        {
            id: 'PROD-005',
            title: 'Sofá 3 Lugares Cinza',
            category: 'casa',
            price: { final: 1299.90 },
            image: 'https://via.placeholder.com/300x200?text=Sofá+3+Lugares',
            rating: { average: 4.7, count: 45 },
            stock: { quantity: 5 }
        },
        {
            id: 'PROD-006',
            title: 'Fogão 4 Bocas Brastemp',
            category: 'casa',
            price: { final: 899.90 },
            image: 'https://via.placeholder.com/300x200?text=Fogão+4+Bocas',
            rating: { average: 4.4, count: 78 },
            stock: { quantity: 12 }
        }
    ];

    // Salvar produtos no localStorage para demonstração
    localStorage.setItem('testProducts', JSON.stringify(testProducts));

    // Dados de pedidos de exemplo
    const testOrders = [
        {
            id: 'ORD-001',
            userId: 'user_001',
            date: '2024-09-29',
            status: 'Entregue',
            total: 3399.80,
            items: [
                { productId: 'PROD-001', name: 'Smartphone Galaxy S24', quantity: 1, price: 2999.90 },
                { productId: 'PROD-003', name: 'Tênis Nike Air Max', quantity: 1, price: 399.90 }
            ]
        },
        {
            id: 'ORD-002',
            userId: 'user_001',
            date: '2024-09-28',
            status: 'Enviado',
            total: 599.80,
            items: [
                { productId: 'PROD-004', name: 'Camiseta Polo Ralph Lauren', quantity: 2, price: 199.90 },
                { productId: 'PROD-003', name: 'Tênis Nike Air Max', quantity: 1, price: 399.90 }
            ]
        }
    ];

    localStorage.setItem('testOrders', JSON.stringify(testOrders));

    showNotification('Dados de teste criados com sucesso!', 'success');
}

// Função para limpar dados de teste
function clearTestData() {
    localStorage.removeItem('testProducts');
    localStorage.removeItem('testOrders');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    
    showNotification('Dados de teste removidos', 'info');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Função para popular carrinho com produtos de teste
function populateCartWithTestData() {
    const testProducts = JSON.parse(localStorage.getItem('testProducts') || '[]');
    
    if (testProducts.length === 0) {
        showNotification('Execute "Criar Dados de Teste" primeiro', 'warning');
        return;
    }

    // Adicionar alguns produtos ao carrinho
    const cart = [
        {
            id: testProducts[0].id,
            name: testProducts[0].title,
            price: testProducts[0].price.final,
            image: testProducts[0].image,
            quantity: 1
        },
        {
            id: testProducts[2].id,
            name: testProducts[2].title,
            price: testProducts[2].price.final,
            image: testProducts[2].image,
            quantity: 2
        }
    ];

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    
    showNotification('Carrinho populado com produtos de teste!', 'success');
}

// Adicionar botões de teste na página (apenas em desenvolvimento)
function addTestButtons() {
    // Verificar se já existem botões de teste
    if (document.getElementById('test-buttons')) return;

    const testButtons = document.createElement('div');
    testButtons.id = 'test-buttons';
    testButtons.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 1rem;
        border-radius: 10px;
        z-index: 9999;
        font-size: 0.9rem;
        max-width: 300px;
    `;

    testButtons.innerHTML = `
        <h4 style="margin: 0 0 1rem 0; color: #28a745;">🧪 Modo Teste</h4>
        <div style="display: grid; gap: 0.5rem;">
            <button onclick="createTestData()" style="padding: 0.5rem; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                📊 Criar Dados de Teste
            </button>
            <button onclick="populateCartWithTestData()" style="padding: 0.5rem; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer;">
                🛒 Popular Carrinho
            </button>
            <button onclick="clearTestData()" style="padding: 0.5rem; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                🗑️ Limpar Dados
            </button>
        </div>
        <div style="margin-top: 1rem; font-size: 0.8rem; color: #ccc;">
            <strong>Contas de Teste:</strong><br>
            Admin: admin@ecommerce.com<br>
            Fornecedor: fornecedor@teste.com<br>
            Cliente: cliente@teste.com<br>
            Operador: operador@teste.com<br>
            Senha: [Role]123!@#
        </div>
    `;

    document.body.appendChild(testButtons);
}

// Adicionar botões de teste quando a página carregar (apenas em desenvolvimento)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', addTestButtons);
}
