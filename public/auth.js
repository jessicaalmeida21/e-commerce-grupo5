// Sistema de Autenticação
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.inactivityTimer = null;
        this.eventListenersAdded = false;
        this.init();
    }

    init() {
        this.loadUserFromStorage();
        this.setupEventListeners();
        this.fillLoginFieldsFromUrl();
        // Temporariamente desabilitar timer para evitar travamento
        // this.setupInactivityTimer();
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
        const existingUsers = JSON.parse(localStorage.getItem('demo_users')) || [];
        console.log('Usuários cadastrados:', existingUsers);
        
        if (existingUsers.length === 0) {
            alert('Nenhuma conta encontrada. Faça o cadastro primeiro.');
            return;
        }

        // Verificar se o email corresponde
        const userData = existingUsers.find(user => user.email === loginData.email);
        if (!userData) {
            alert('Email não encontrado. Verifique o email digitado.');
            return;
        }

        // Login bem-sucedido
        this.currentUser = userData;
        localStorage.setItem('demo_logged_in', 'true');
        
        alert(`Bem-vindo, ${userData.firstName}! Redirecionando para seu dashboard...`);
        
        // Redirecionar baseado no perfil
        if (userData.role === 'cliente') {
            window.location.href = 'index.html'; // Cliente vai para loja
        } else if (userData.role === 'vendedor') {
            window.location.href = 'dashboard.html'; // Vendedor vai para dashboard
        } else {
            window.location.href = 'index.html';
        }
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

        // Validar todos os campos obrigatórios
        if (!registerData.firstName || !registerData.firstName.trim()) {
            alert('Por favor, preencha o nome.');
            return;
        }

        // Validar que nome não contenha números
        if (/\d/.test(registerData.firstName)) {
            alert('O nome não pode conter números. Digite apenas letras.');
            return;
        }

        if (!registerData.lastName || !registerData.lastName.trim()) {
            alert('Por favor, preencha o sobrenome.');
            return;
        }

        // Validar que sobrenome não contenha números
        if (/\d/.test(registerData.lastName)) {
            alert('O sobrenome não pode conter números. Digite apenas letras.');
            return;
        }

        if (!registerData.email || !registerData.email.trim()) {
            alert('Por favor, preencha o email.');
            return;
        }

        if (!this.isValidEmail(registerData.email)) {
            alert('Por favor, digite um email válido.');
            return;
        }

        // Verificar se email já existe (modo demo)
        const existingUsers = JSON.parse(localStorage.getItem('demo_users')) || [];
        if (existingUsers.some(user => user.email === registerData.email)) {
            alert('Este email já está cadastrado no sistema.');
            return;
        }

        if (!registerData.phone || !registerData.phone.trim()) {
            alert('Por favor, preencha o telefone.');
            return;
        }

        // Validar que telefone contenha apenas números (removendo máscara)
        const phoneNumbers = registerData.phone.replace(/\D/g, '');
        if (!/^\d+$/.test(phoneNumbers) || phoneNumbers.length < 10) {
            alert('O telefone deve conter apenas números e ter pelo menos 10 dígitos.');
            return;
        }

        if (!registerData.password || !registerData.password.trim()) {
            alert('Por favor, preencha a senha.');
            return;
        }

        if (!registerData.confirmPassword || !registerData.confirmPassword.trim()) {
            alert('Por favor, confirme a senha.');
            return;
        }

        if (!registerData.role || registerData.role === '') {
            alert('Por favor, selecione o perfil (Cliente ou Vendedor).');
            return;
        }

        // Verificar se aceitou os termos
        const termsAccepted = document.getElementById('terms');
        if (!termsAccepted || !termsAccepted.checked) {
            alert('Você deve aceitar os Termos de Uso e Política de Privacidade para continuar.');
            return;
        }

        // Validate password match
        if (registerData.password !== registerData.confirmPassword) {
            alert('As senhas não coincidem');
            return;
        }

        // Validate password strength
        if (!this.isPasswordStrong(registerData.password)) {
            alert('A senha deve ter pelo menos 10 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais (!@#$%^&*)');
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

            // Salvar no sistema de múltiplos usuários
            const existingUsers = JSON.parse(localStorage.getItem('demo_users')) || [];
            existingUsers.push(userData);
            localStorage.setItem('demo_users', JSON.stringify(existingUsers));
            
            // Salvar como usuário atual
            localStorage.setItem('demo_user', JSON.stringify(userData));

            alert('Conta criada com sucesso! Redirecionando para login...');
            
            // Redirecionar para login com dados preenchidos
            const loginUrl = `login.html?email=${encodeURIComponent(registerData.email)}&password=${encodeURIComponent(registerData.password)}`;
            window.location.href = loginUrl;
            
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
        return password.length >= 10 && 
               /[a-z]/.test(password) && 
               /[A-Z]/.test(password) && 
               /[0-9]/.test(password) &&
               /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    updateUIForLoggedUser() {
        if (!this.currentUser) return;

        const authLinks = document.getElementById('auth-links');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');

        if (authLinks && userMenu && userName) {
            authLinks.style.display = 'none';
            userMenu.style.display = 'block';
            userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
    }

    fillLoginFieldsFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        const password = urlParams.get('password');

        if (email) {
            const emailInput = document.getElementById('email');
            if (emailInput) {
                emailInput.value = email;
            }
        }

        if (password) {
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.value = password;
            }
        }
    }

    setupInactivityTimer() {
        // Limpar timer existente
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        // Definir novo timer de 30 minutos (1800000 ms)
        this.inactivityTimer = setTimeout(() => {
            if (this.currentUser) {
                this.autoLogout();
            }
        }, 30 * 60 * 1000); // 30 minutos

        // Adicionar event listeners apenas uma vez
        if (!this.eventListenersAdded) {
            document.addEventListener('click', () => this.resetInactivityTimer());
            document.addEventListener('keypress', () => this.resetInactivityTimer());
            document.addEventListener('scroll', () => this.resetInactivityTimer());
            this.eventListenersAdded = true;
        }
    }

    resetInactivityTimer() {
        if (this.currentUser && this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = setTimeout(() => {
                if (this.currentUser) {
                    this.autoLogout();
                }
            }, 30 * 60 * 1000); // 30 minutos
        }
    }

    autoLogout() {
        alert('Sessão expirada por inatividade. Você será redirecionado para o login.');
        this.logout();
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