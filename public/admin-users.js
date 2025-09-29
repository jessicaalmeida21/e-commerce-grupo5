// Sistema de Gerenciamento de Usuários
class UserManager {
    constructor() {
        this.users = [];
        this.currentUser = null;
        this.editingUserId = null;
        this.currentPage = 1;
        this.usersPerPage = 10;
        this.filteredUsers = [];
        
        this.init();
    }

    init() {
        this.checkAdminAccess();
        this.setupEventListeners();
        this.loadUsers();
    }

    checkAdminAccess() {
        const user = getCurrentUser();
        if (!user || user.role !== 'admin') {
            alert('Acesso negado. Apenas administradores podem acessar esta página.');
            window.location.href = 'index.html';
            return;
        }
        this.currentUser = user;
    }

    setupEventListeners() {
        // Botões
        document.getElementById('add-user-btn').addEventListener('click', () => this.openUserModal());
        document.getElementById('close-modal').addEventListener('click', () => this.closeUserModal());
        document.getElementById('cancel-user').addEventListener('click', () => this.closeUserModal());
        document.getElementById('close-delete-modal').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('cancel-delete').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirm-delete').addEventListener('click', () => this.confirmDelete());

        // Formulário
        document.getElementById('user-form').addEventListener('submit', (e) => this.handleSubmit(e));

        // Filtros
        document.getElementById('role-filter').addEventListener('change', () => this.applyFilters());
        document.getElementById('search-input').addEventListener('input', () => this.applyFilters());

        // Validação de senha
        document.getElementById('user-password').addEventListener('input', () => this.checkPasswordStrength());
        document.getElementById('user-confirmPassword').addEventListener('input', () => this.checkPasswordMatch());
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/auth/users', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.users = data.users;
                this.filteredUsers = [...this.users];
                this.renderUsers();
            } else {
                this.showNotification('Erro ao carregar usuários', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    applyFilters() {
        const roleFilter = document.getElementById('role-filter').value;
        const searchTerm = document.getElementById('search-input').value.toLowerCase();

        this.filteredUsers = this.users.filter(user => {
            const matchesRole = !roleFilter || user.role === roleFilter;
            const matchesSearch = !searchTerm || 
                user.name.toLowerCase().includes(searchTerm) || 
                user.email.toLowerCase().includes(searchTerm);
            
            return matchesRole && matchesSearch;
        });

        this.currentPage = 1;
        this.renderUsers();
    }

    renderUsers() {
        const tbody = document.getElementById('users-tbody');
        const startIndex = (this.currentPage - 1) * this.usersPerPage;
        const endIndex = startIndex + this.usersPerPage;
        const pageUsers = this.filteredUsers.slice(startIndex, endIndex);

        tbody.innerHTML = '';

        pageUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${this.getRoleLabel(user.role)}</span></td>
                <td>${user.phone || '-'}</td>
                <td><span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Ativo' : 'Inativo'}</span></td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <button class="btn-icon btn-edit" onclick="userManager.editUser(${user.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="userManager.deleteUser(${user.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.renderPagination();
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredUsers.length / this.usersPerPage);

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Botão anterior
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="userManager.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>`;
        }

        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                    onclick="userManager.goToPage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }

        // Botão próximo
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="userManager.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>`;
        }

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderUsers();
    }

    openUserModal(userId = null) {
        this.editingUserId = userId;
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        const title = document.getElementById('modal-title');

        if (userId) {
            title.textContent = 'Editar Usuário';
            this.loadUserData(userId);
        } else {
            title.textContent = 'Novo Usuário';
            form.reset();
            this.resetPasswordStrength();
        }

        modal.style.display = 'flex';
    }

    closeUserModal() {
        document.getElementById('user-modal').style.display = 'none';
        this.editingUserId = null;
    }

    async loadUserData(userId) {
        try {
            const response = await fetch(`/api/auth/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const user = data.user;
                
                const nameParts = user.name.split(' ');
                document.getElementById('user-firstName').value = nameParts[0] || '';
                document.getElementById('user-lastName').value = nameParts.slice(1).join(' ') || '';
                document.getElementById('user-email').value = user.email;
                document.getElementById('user-phone').value = user.phone || '';
                document.getElementById('user-role').value = user.role;
                
                // Para edição, senha não é obrigatória
                document.getElementById('user-password').required = false;
                document.getElementById('user-confirmPassword').required = false;
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            this.showNotification('Erro ao carregar dados do usuário', 'error');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: formData.get('role'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        // Validar senha se for novo usuário ou se foi fornecida
        if (!this.editingUserId || userData.password) {
            if (userData.password !== userData.confirmPassword) {
                this.showNotification('As senhas não coincidem', 'error');
                return;
            }

            if (!this.isPasswordStrong(userData.password)) {
                this.showNotification('Senha deve ter pelo menos 10 caracteres com números, letras e caracteres especiais', 'error');
                return;
            }
        }

        try {
            if (this.editingUserId) {
                await this.updateUser(userData);
            } else {
                await this.createUser(userData);
            }
        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            this.showNotification('Erro ao salvar usuário', 'error');
        }
    }

    async createUser(userData) {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok) {
            this.showNotification('Usuário criado com sucesso!', 'success');
            this.closeUserModal();
            this.loadUsers();
        } else {
            this.showNotification(result.error || 'Erro ao criar usuário', 'error');
        }
    }

    async updateUser(userData) {
        const updateData = {
            name: `${userData.firstName} ${userData.lastName}`,
            email: userData.email,
            phone: userData.phone
        };

        if (userData.password) {
            updateData.newPassword = userData.password;
        }

        const response = await fetch(`/api/auth/users/${this.editingUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (response.ok) {
            this.showNotification('Usuário atualizado com sucesso!', 'success');
            this.closeUserModal();
            this.loadUsers();
        } else {
            this.showNotification(result.error || 'Erro ao atualizar usuário', 'error');
        }
    }

    editUser(userId) {
        this.openUserModal(userId);
    }

    async deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('delete-message').textContent = 
            `Tem certeza que deseja excluir o usuário ${user.name}?`;
        document.getElementById('delete-modal').style.display = 'flex';
        this.userToDelete = userId;
    }

    closeDeleteModal() {
        document.getElementById('delete-modal').style.display = 'none';
        this.userToDelete = null;
    }

    async confirmDelete() {
        if (!this.userToDelete) return;

        try {
            const response = await fetch(`/api/auth/users/${this.userToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ confirm: true })
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification('Usuário excluído com sucesso!', 'success');
                this.closeDeleteModal();
                this.loadUsers();
            } else {
                this.showNotification(result.error || 'Erro ao excluir usuário', 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            this.showNotification('Erro ao excluir usuário', 'error');
        }
    }

    checkPasswordStrength() {
        const password = document.getElementById('user-password').value;
        const strengthFill = document.getElementById('user-strength-fill');
        const strengthText = document.getElementById('user-strength-text');

        const strength = this.calculatePasswordStrength(password);
        
        strengthFill.style.width = strength.percentage + '%';
        strengthFill.className = 'strength-fill ' + strength.level;
        strengthText.textContent = strength.text;
    }

    calculatePasswordStrength(password) {
        let score = 0;
        let feedback = [];

        if (password.length >= 10) score += 20;
        else feedback.push('pelo menos 10 caracteres');

        if (/[a-z]/.test(password)) score += 20;
        else feedback.push('letras minúsculas');

        if (/[A-Z]/.test(password)) score += 20;
        else feedback.push('letras maiúsculas');

        if (/[0-9]/.test(password)) score += 20;
        else feedback.push('números');

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

    checkPasswordMatch() {
        const password = document.getElementById('user-password').value;
        const confirmPassword = document.getElementById('user-confirmPassword').value;
        const confirmInput = document.getElementById('user-confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmInput.style.borderColor = '#dc3545';
        } else {
            confirmInput.style.borderColor = '#28a745';
        }
    }

    resetPasswordStrength() {
        const strengthFill = document.getElementById('user-strength-fill');
        const strengthText = document.getElementById('user-strength-text');
        
        strengthFill.style.width = '0%';
        strengthFill.className = 'strength-fill';
        strengthText.textContent = 'Digite uma senha';
    }

    getRoleLabel(role) {
        const labels = {
            'client': 'Cliente',
            'supplier': 'Fornecedor',
            'operator': 'Operador',
            'admin': 'Admin'
        };
        return labels[role] || role;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    showNotification(message, type = 'info') {
        // Usar a função de notificação do auth.js
        if (typeof auth !== 'undefined' && auth.showNotification) {
            auth.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    window.userManager = new UserManager();
});
