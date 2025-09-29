// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    if (!requireAuth()) {
        return;
    }

    // Inicializar dashboard
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
});

function initializeDashboard() {
    const user = getCurrentUser();
    if (!user) return;

    // Atualizar nome do usuário
    const userName = document.getElementById('user-name');
    if (userName) {
        userName.textContent = user.name;
    }

    // Mostrar/ocultar tabs baseado no role
    const productsTab = document.getElementById('products-tab');
    if (productsTab) {
        if (user.role === 'supplier' || user.role === 'admin') {
            productsTab.style.display = 'block';
        } else {
            productsTab.style.display = 'none';
        }
    }

    const adminTab = document.getElementById('admin-tab');
    if (adminTab) {
        if (user.role === 'admin') {
            adminTab.style.display = 'block';
        } else {
            adminTab.style.display = 'none';
        }
    }

    // Carregar dados do perfil
    loadProfileData();
}

function setupEventListeners() {
    // Tabs de navegação
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Formulário de perfil
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Formulário de senha
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    // Botão adicionar produto
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
    }

    // Filtro de pedidos
    const orderStatusFilter = document.getElementById('order-status-filter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', filterOrders);
    }
}

function switchTab(tabId) {
    // Remover classe active de todas as tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Adicionar classe active na tab selecionada
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // Carregar dados específicos da tab
    switch (tabId) {
        case 'overview':
            loadOverviewData();
            break;
        case 'orders':
            loadOrdersData();
            break;
        case 'products':
            loadProductsData();
            break;
        case 'profile':
            loadProfileData();
            break;
    }
}

function loadDashboardData() {
    loadOverviewData();
}

function loadOverviewData() {
    // Simular dados do dashboard
    const stats = {
        totalOrders: 12,
        totalRevenue: 2450.00,
        totalProducts: 8,
        avgRating: 4.5
    };

    // Atualizar estatísticas
    document.getElementById('total-orders').textContent = stats.totalOrders;
    document.getElementById('total-revenue').textContent = stats.totalRevenue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
    document.getElementById('total-products').textContent = stats.totalProducts;
    document.getElementById('avg-rating').textContent = stats.avgRating;

    // Carregar pedidos recentes
    loadRecentOrders();
}

function loadRecentOrders() {
    const recentOrdersList = document.getElementById('recent-orders-list');
    
    // Simular pedidos recentes
    const recentOrders = [
        {
            id: 'ORD-001',
            date: '2024-09-29',
            status: 'Entregue',
            total: 299.90,
            items: 2
        },
        {
            id: 'ORD-002',
            date: '2024-09-28',
            status: 'Enviado',
            total: 150.00,
            items: 1
        },
        {
            id: 'ORD-003',
            date: '2024-09-27',
            status: 'Processando',
            total: 89.90,
            items: 1
        }
    ];

    if (recentOrders.length === 0) {
        recentOrdersList.innerHTML = '<p class="no-data">Nenhum pedido encontrado</p>';
        return;
    }

    recentOrdersList.innerHTML = recentOrders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <h4>Pedido #${order.id}</h4>
                <p>Data: ${formatDate(order.date)}</p>
                <p>${order.items} item(s) - ${order.total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })}</p>
            </div>
            <div class="order-status">
                <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
            </div>
        </div>
    `).join('');
}

function loadOrdersData() {
    const ordersList = document.getElementById('orders-list');
    
    // Simular lista de pedidos
    const orders = [
        {
            id: 'ORD-001',
            date: '2024-09-29',
            status: 'Entregue',
            total: 299.90,
            items: [
                { name: 'Produto A', quantity: 1, price: 199.90 },
                { name: 'Produto B', quantity: 1, price: 100.00 }
            ]
        },
        {
            id: 'ORD-002',
            date: '2024-09-28',
            status: 'Enviado',
            total: 150.00,
            items: [
                { name: 'Produto C', quantity: 1, price: 150.00 }
            ]
        }
    ];

    if (orders.length === 0) {
        ordersList.innerHTML = '<p class="no-data">Nenhum pedido encontrado</p>';
        return;
    }

    ordersList.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <h4>Pedido #${order.id}</h4>
                <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
            </div>
            <div class="order-details">
                <p><strong>Data:</strong> ${formatDate(order.date)}</p>
                <p><strong>Total:</strong> ${order.total.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })}</p>
                <div class="order-items">
                    <h5>Itens:</h5>
                    <ul>
                        ${order.items.map(item => `
                            <li>${item.name} x${item.quantity} - ${item.price.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            })}</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `).join('');
}

function loadProductsData() {
    const productsList = document.getElementById('supplier-products-list');
    
    // Simular produtos do fornecedor
    const products = [
        {
            id: 'PROD-001',
            name: 'Produto A',
            price: 199.90,
            stock: 10,
            status: 'Ativo'
        },
        {
            id: 'PROD-002',
            name: 'Produto B',
            price: 150.00,
            stock: 5,
            status: 'Ativo'
        }
    ];

    if (products.length === 0) {
        productsList.innerHTML = '<p class="no-data">Nenhum produto cadastrado</p>';
        return;
    }

    productsList.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-info">
                <h4>${product.name}</h4>
                <p><strong>Preço:</strong> ${product.price.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })}</p>
                <p><strong>Estoque:</strong> ${product.stock} unidades</p>
                <p><strong>Status:</strong> <span class="status-badge status-${product.status.toLowerCase()}">${product.status}</span></p>
            </div>
            <div class="product-actions">
                <button class="btn-secondary" onclick="editProduct('${product.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-danger" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

function loadProfileData() {
    const user = getCurrentUser();
    if (!user) return;

    // Preencher formulário de perfil
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-address').value = user.address || '';
}

function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address')
    };

    // Simular atualização do perfil
    showNotification('Perfil atualizado com sucesso!', 'success');
    
    // Atualizar dados do usuário no localStorage
    const user = getCurrentUser();
    if (user) {
        Object.assign(user, profileData);
        localStorage.setItem('user', JSON.stringify(user));
    }
}

function handlePasswordChange(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    // Validar senhas
    if (newPassword !== confirmPassword) {
        showNotification('As senhas não coincidem', 'error');
        return;
    }

    if (newPassword.length < 10) {
        showNotification('A nova senha deve ter pelo menos 10 caracteres', 'error');
        return;
    }

    // Simular alteração de senha
    showNotification('Senha alterada com sucesso!', 'success');
    e.target.reset();
}

function filterOrders() {
    const statusFilter = document.getElementById('order-status-filter').value;
    // Implementar filtro de pedidos
    console.log('Filtrar pedidos por status:', statusFilter);
}

function showAddProductModal() {
    showNotification('Funcionalidade de adicionar produto em desenvolvimento', 'info');
}

function editProduct(productId) {
    showNotification(`Editar produto ${productId} - Funcionalidade em desenvolvimento`, 'info');
}

function deleteProduct(productId) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        showNotification(`Produto ${productId} excluído com sucesso!`, 'success');
        loadProductsData(); // Recarregar lista
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Adicionar estilos específicos do dashboard
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    .dashboard-main {
        padding: 2rem 0;
        min-height: calc(100vh - 80px);
        background-color: #f8f9fa;
    }

    .dashboard-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .dashboard-header h1 {
        color: #333;
        margin-bottom: 0.5rem;
    }

    .dashboard-header p {
        color: #6c757d;
        font-size: 1.1rem;
    }

    .dashboard-tabs {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        border-bottom: 2px solid #dee2e6;
        padding-bottom: 1rem;
    }

    .tab-btn {
        background: none;
        border: none;
        padding: 1rem 1.5rem;
        border-radius: 8px 8px 0 0;
        cursor: pointer;
        transition: all 0.3s ease;
        color: #6c757d;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .tab-btn:hover {
        background-color: #f8f9fa;
        color: #28a745;
    }

    .tab-btn.active {
        background-color: #28a745;
        color: white;
    }

    .tab-content {
        display: none;
    }

    .tab-content.active {
        display: block;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .stat-icon {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #28a745, #20c997);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.5rem;
    }

    .stat-info h3 {
        margin: 0 0 0.5rem 0;
        color: #333;
        font-size: 1rem;
    }

    .stat-number {
        font-size: 2rem;
        font-weight: bold;
        color: #28a745;
        margin: 0 0 0.25rem 0;
    }

    .stat-label {
        color: #6c757d;
        font-size: 0.9rem;
    }

    .recent-orders, .orders-header, .products-header {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 1.5rem;
    }

    .recent-orders h3, .orders-header h3, .products-header h3 {
        margin: 0 0 1rem 0;
        color: #333;
    }

    .orders-header, .products-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .order-item, .order-card {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .order-card {
        flex-direction: column;
        align-items: flex-start;
    }

    .order-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 0.5rem;
    }

    .order-details {
        width: 100%;
    }

    .order-items {
        margin-top: 0.5rem;
    }

    .order-items ul {
        margin: 0.5rem 0 0 1rem;
        padding: 0;
    }

    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
    }

    .status-pendente { background-color: #ffc107; color: #000; }
    .status-processando { background-color: #17a2b8; color: white; }
    .status-enviado { background-color: #007bff; color: white; }
    .status-entregue { background-color: #28a745; color: white; }
    .status-cancelado { background-color: #dc3545; color: white; }
    .status-ativo { background-color: #28a745; color: white; }
    .status-inativo { background-color: #6c757d; color: white; }

    .product-card {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .product-actions {
        display: flex;
        gap: 0.5rem;
    }

    .btn-secondary {
        background-color: #6c757d;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .btn-danger {
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .profile-section {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 1.5rem;
    }

    .profile-section h3 {
        margin: 0 0 1rem 0;
        color: #333;
    }

    .profile-form {
        max-width: 500px;
    }

    .no-data {
        text-align: center;
        color: #6c757d;
        padding: 2rem;
        font-style: italic;
    }

    @media (max-width: 768px) {
        .dashboard-tabs {
            flex-wrap: wrap;
        }

        .tab-btn {
            padding: 0.75rem 1rem;
            font-size: 0.9rem;
        }

        .stats-grid {
            grid-template-columns: 1fr;
        }

        .order-item, .product-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }

        .orders-header, .products-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
    }
`;
document.head.appendChild(dashboardStyles);
