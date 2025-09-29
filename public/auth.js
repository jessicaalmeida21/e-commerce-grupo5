// Configurações da API
const API_BASE_URL = '/api';

// Elementos DOM
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se já está logado
    if (localStorage.getItem('token')) {
        redirectToDashboard();
    }

    // Configurar formulários
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// Função de login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        showLoading('Entrando...');
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (response.ok) {
            // Salvar token e dados do usuário
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showNotification('Login realizado com sucesso!', 'success');
            
            // Redirecionar após 1 segundo
            setTimeout(() => {
                redirectToDashboard();
            }, 1000);
        } else {
            showNotification(data.error || 'Erro no login', 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

// Função de cadastro
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(registerForm);
    const registerData = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role')
    };

    // Validar confirmação de senha
    const confirmPassword = formData.get('confirmPassword');
    if (registerData.password !== confirmPassword) {
        showNotification('As senhas não coincidem', 'error');
        return;
    }

    // Validar senha
    if (!isValidPassword(registerData.password)) {
        showNotification('Senha deve ter pelo menos 10 caracteres com números, letras e símbolos', 'error');
        return;
    }

    try {
        showLoading('Criando conta...');
        
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Conta criada com sucesso!', 'success');
            
            // Redirecionar para login após 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            if (data.details) {
                showNotification(data.details.join(', '), 'error');
            } else {
                showNotification(data.error || 'Erro no cadastro', 'error');
            }
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

// Login com conta de demonstração
async function loginDemo(email, password) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
    
    // Simular clique no botão de login
    const submitEvent = new Event('submit');
    loginForm.dispatchEvent(submitEvent);
}

// Redirecionar para dashboard baseado no perfil
function redirectToDashboard() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    switch (user.role) {
        case 'admin':
            window.location.href = 'dashboard.html?tab=admin';
            break;
        case 'supplier':
            window.location.href = 'dashboard.html?tab=supplier';
            break;
        case 'operator':
            window.location.href = 'dashboard.html?tab=operator';
            break;
        case 'client':
        default:
            window.location.href = 'index.html';
            break;
    }
}

// Validar senha
function isValidPassword(password) {
    // Mínimo 10 caracteres, com números, letras e caracteres especiais
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
    return passwordRegex.test(password);
}

// Alternar visibilidade da senha
function togglePassword(fieldId = 'password') {
    const field = document.getElementById(fieldId);
    const button = field.parentNode.querySelector('.toggle-password i');
    
    if (field.type === 'password') {
        field.type = 'text';
        button.classList.remove('fa-eye');
        button.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        button.classList.remove('fa-eye-slash');
        button.classList.add('fa-eye');
    }
}

// Esqueci minha senha
async function forgotPassword() {
    const email = prompt('Digite seu email para recuperação de senha:');
    if (!email) return;

    try {
        showLoading('Enviando instruções...');
        
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        showNotification(data.message, 'info');
    } catch (error) {
        console.error('Erro na recuperação:', error);
        showNotification('Erro de conexão. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    
    showNotification('Logout realizado com sucesso!', 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

// Verificar autenticação
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Obter token de autorização
function getAuthToken() {
    return localStorage.getItem('token');
}

// Obter dados do usuário
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Verificar permissão
function hasPermission(requiredRole) {
    const user = getCurrentUser();
    if (!user) return false;
    
    const roleHierarchy = {
        'client': 1,
        'supplier': 2,
        'operator': 3,
        'admin': 4
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Mostrar loading
function showLoading(message = 'Carregando...') {
    // Remover loading existente
    const existingLoading = document.querySelector('.loading-overlay');
    if (existingLoading) {
        existingLoading.remove();
    }

    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
        <div class="loading-content">
            <i class="fas fa-spinner fa-spin"></i>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(loading);
}

// Esconder loading
function hideLoading() {
    const loading = document.querySelector('.loading-overlay');
    if (loading) {
        loading.remove();
    }
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Remover notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Adicionar estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Obter ícone da notificação
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Obter cor da notificação
function getNotificationColor(type) {
    switch (type) {
        case 'success': return '#28a745';
        case 'error': return '#dc3545';
        case 'warning': return '#ffc107';
        default: return '#17a2b8';
    }
}

// Adicionar estilos para notificações
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 4000;
    }
    
    .loading-content {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .loading-content i {
        font-size: 2rem;
        color: #28a745;
        margin-bottom: 1rem;
    }
    
    .loading-content p {
        margin: 0;
        color: #333;
        font-weight: 500;
    }
`;
document.head.appendChild(notificationStyles);