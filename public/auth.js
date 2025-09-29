// Sistema de Autenticação
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadUserFromStorage();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Password strength checker
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.checkPasswordStrength());
        }

        // Confirm password checker
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.checkPasswordMatch());
        }
    }

    handleLogin(e) {
        e.preventDefault();
        console.log('Login iniciado');
        
        const formData = new FormData(e.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password'),
            remember: formData.get('remember') === 'on'
        };

        console.log('Dados do login:', loginData);

        // Validações básicas
        if (!loginData.email || !loginData.password) {
            console.log('Campos vazios');
            alert('Por favor, preencha todos os campos.');
            return;
        }

        if (!this.isValidEmail(loginData.email)) {
            console.log('Email inválido');
            alert('Por favor, digite um email válido.');
            return;
        }

        if (loginData.password.length < 6) {
            console.log('Senha muito curta');
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        // Modo demo - verificar se há usuário cadastrado
        const savedUser = localStorage.getItem('demo_user');
        console.log('Usuário salvo:', savedUser);
        
        if (!savedUser) {
            alert('Nenhuma conta encontrada. Faça o cadastro primeiro.');
            return;
        }

        const userData = JSON.parse(savedUser);
        console.log('Dados do usuário:', userData);
        
        // Verificar se o email corresponde
        if (userData.email !== loginData.email) {
            alert('Email não encontrado. Verifique o email digitado.');
            return;
        }

        // Login bem-sucedido
        this.currentUser = userData;
        localStorage.setItem('demo_logged_in', 'true');
        
        alert(`Bem-vindo de volta, ${userData.firstName}!`);
        window.location.href = 'index.html';
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const registerData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            role: formData.get('role')
        };

        // Validate password match
        if (registerData.password !== registerData.confirmPassword) {
            this.showNotification('As senhas não coincidem', 'error');
            return;
        }

        // Validate password strength
        if (!this.isPasswordStrong(registerData.password)) {
            this.showNotification('A senha deve ter pelo menos 8 caracteres, incluindo letras e números', 'error');
            return;
        }

        // Modo demo - simular cadastro bem-sucedido
        try {
            // Simular delay de rede
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Salvar dados no localStorage (modo demo)
            const userData = {
                id: Date.now().toString(),
                firstName: registerData.firstName,
                lastName: registerData.lastName,
                email: registerData.email,
                phone: registerData.phone,
                role: registerData.role,
                createdAt: new Date().toISOString()
            };

            localStorage.setItem('demo_user', JSON.stringify(userData));
            localStorage.setItem('demo_logged_in', 'true');

            alert('Conta criada com sucesso! Login automático realizado...');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Register error:', error);
            this.showNotification('Erro ao criar conta. Tente novamente.', 'error');
        }
    }

    checkPasswordStrength() {
        const password = document.getElementById('password').value;
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');

        if (!strengthFill || !strengthText) return;

        const strength = this.calculatePasswordStrength(password);
        
        strengthFill.style.width = strength.percentage + '%';
        strengthFill.className = 'strength-fill ' + strength.level;
        strengthText.textContent = strength.text;
    }

    calculatePasswordStrength(password) {
        let score = 0;
        let feedback = [];

        // Mínimo 10 caracteres
        if (password.length >= 10) score += 20;
        else feedback.push('pelo menos 10 caracteres');

        // Letras minúsculas
        if (/[a-z]/.test(password)) score += 20;
        else feedback.push('letras minúsculas');

        // Letras maiúsculas
        if (/[A-Z]/.test(password)) score += 20;
        else feedback.push('letras maiúsculas');

        // Números
        if (/[0-9]/.test(password)) score += 20;
        else feedback.push('números');

        // Caracteres especiais
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;
        else feedback.push('caracteres especiais');

        if (score < 60) {
            return { percentage: score, level: 'weak', text: 'Senha fraca - ' + feedback.join(', ') };
        } else if (score < 80) {
            return { percentage: score, level: 'medium', text: 'Senha média' };
        } else {
            return { percentage: score, level: 'strong', text: 'Senha forte' };
        }
    }

    isPasswordStrong(password) {
        return password.length >= 8 && 
               /[a-z]/.test(password) && 
               /[A-Z]/.test(password) && 
               /[0-9]/.test(password);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    checkPasswordMatch() {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmInput.style.borderColor = '#dc3545';
        } else {
            confirmInput.style.borderColor = '#28a745';
        }
    }

    saveUserToStorage(user, token, remember = false) {
        if (remember) {
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);
        } else {
            sessionStorage.setItem('user', JSON.stringify(user));
            sessionStorage.setItem('token', token);
        }
    }

    loadUserFromStorage() {
        // Verificar se está logado em modo demo
        const isLoggedIn = localStorage.getItem('demo_logged_in');
        const demoUser = localStorage.getItem('demo_user');
        
        if (isLoggedIn === 'true' && demoUser) {
            this.currentUser = JSON.parse(demoUser);
            this.updateUIForLoggedUser();
        } else {
            // Verificar modo normal (com banco de dados)
            const user = localStorage.getItem('user') || sessionStorage.getItem('user');
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            if (user && token) {
                this.currentUser = JSON.parse(user);
                this.updateUIForLoggedUser();
            }
        }
    }

    logout() {
        this.currentUser = null;
        
        // Limpar dados do modo normal
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        
        // Limpar dados do modo demo
        localStorage.removeItem('demo_user');
        localStorage.removeItem('demo_logged_in');
        
        this.showNotification('Logout realizado com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    showNotification(message, type = 'info') {
        console.log(`Notification: ${type} - ${message}`);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remove notification
        setTimeout(() => {
            notification.classList.remove('show');
    setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getAuthToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }
}

// Initialize auth system
const auth = new AuthSystem();

// Global functions for compatibility
function logout() {
    auth.logout();
}

function getCurrentUser() {
    return auth.getCurrentUser();
}

function getAuthToken() {
    return auth.getAuthToken();
}

function isAuthenticated() {
    return auth.isAuthenticated();
}

function hasRole(role) {
    return auth.hasRole(role);
}

// Check auth status on page load
document.addEventListener('DOMContentLoaded', function() {
    if (typeof checkAuthStatus === 'function') {
        checkAuthStatus();
    }
});