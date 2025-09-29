// Variáveis globais
let currentUser = null;
let logisticsData = [];
let currentPage = 1;
let totalPages = 1;
let currentLogisticsId = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    initializeLogistics();
    setupEventListeners();
    loadLogisticsData();
});

// Inicializar página de logística
function initializeLogistics() {
    currentUser = getCurrentUser();
    
    if (!currentUser) {
        showNotification('Você precisa estar logado para acessar esta página', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Verificar se é admin para mostrar opções administrativas
    if (currentUser.role === 'admin') {
        showAdminOptions();
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Formulário de atualização de status
    document.getElementById('update-status-form').addEventListener('submit', handleUpdateStatus);
    
    // Formulário de correção de status
    document.getElementById('correct-status-form').addEventListener('submit', handleCorrectStatus);
    
    // Filtros
    document.getElementById('search-order').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
}

// Mostrar opções administrativas
function showAdminOptions() {
    // Adicionar botões administrativos se necessário
    const header = document.querySelector('.logistics-header');
    const adminButtons = document.createElement('div');
    adminButtons.className = 'admin-actions';
    adminButtons.innerHTML = `
        <button class="btn-primary" onclick="showStats()">
            <i class="fas fa-chart-bar"></i> Estatísticas
        </button>
    `;
    header.appendChild(adminButtons);
}

// Carregar dados de logística
async function loadLogisticsData() {
    try {
        const response = await fetch('/api/logistics', {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados de logística');
        }

        const data = await response.json();
        logisticsData = data.logistics || [];
        totalPages = data.totalPages || 1;
        
        displayLogisticsList();
        displayPagination();

    } catch (error) {
        console.error('Erro ao carregar logística:', error);
        showNotification('Erro ao carregar dados de logística', 'error');
    }
}

// Exibir lista de logística
function displayLogisticsList() {
    const listContainer = document.getElementById('logistics-list');
    listContainer.innerHTML = '';

    if (logisticsData.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-logistics">
                <i class="fas fa-truck"></i>
                <h3>Nenhum pedido encontrado</h3>
                <p>Você ainda não possui pedidos para acompanhar.</p>
            </div>
        `;
        return;
    }

    logisticsData.forEach(logistics => {
        const logisticsCard = createLogisticsCard(logistics);
        listContainer.appendChild(logisticsCard);
    });
}

// Criar card de logística
function createLogisticsCard(logistics) {
    const card = document.createElement('div');
    card.className = 'logistics-card';
    
    const statusIcon = getStatusIcon(logistics.status);
    const statusColor = getStatusColor(logistics.status);
    const progress = getProgress(logistics.status);
    
    card.innerHTML = `
        <div class="card-header">
            <div class="order-info">
                <h4>Pedido #${logistics.orderId}</h4>
                <span class="order-date">${formatDate(logistics.createdAt)}</span>
            </div>
            <div class="status-badge" style="background-color: ${statusColor}">
                <i class="${statusIcon}"></i>
                <span>${logistics.statusLabel}</span>
            </div>
        </div>
        
        <div class="card-content">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            
            <div class="logistics-details">
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>Data do Pedido: ${formatDate(logistics.createdAt)}</span>
                </div>
                
                ${logistics.shippingDate ? `
                    <div class="detail-item">
                        <i class="fas fa-shipping-fast"></i>
                        <span>Enviado em: ${formatDate(logistics.shippingDate)}</span>
                    </div>
                ` : ''}
                
                ${logistics.deliveryDate ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Entregue em: ${formatDate(logistics.deliveryDate)}</span>
                    </div>
                ` : ''}
                
                ${logistics.trackingCode ? `
                    <div class="detail-item">
                        <i class="fas fa-barcode"></i>
                        <span>Código: ${logistics.trackingCode}</span>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="card-actions">
            <button class="btn-primary" onclick="viewLogisticsDetails('${logistics.id}')">
                <i class="fas fa-eye"></i> Ver Detalhes
            </button>
            
            ${currentUser.role === 'admin' ? `
                <button class="btn-secondary" onclick="updateLogisticsStatus('${logistics.id}')" 
                        ${!logistics.canBeUpdated ? 'disabled' : ''}>
                    <i class="fas fa-edit"></i> Atualizar
                </button>
                <button class="btn-warning" onclick="correctLogisticsStatus('${logistics.id}')">
                    <i class="fas fa-exclamation-triangle"></i> Corrigir
                </button>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Exibir paginação
function displayPagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    // Botão anterior
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => changePage(currentPage - 1);
    paginationContainer.appendChild(prevButton);

    // Números das páginas
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageButton.textContent = i;
        pageButton.onclick = () => changePage(i);
        paginationContainer.appendChild(pageButton);
    }

    // Botão próximo
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn';
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => changePage(currentPage + 1);
    paginationContainer.appendChild(nextButton);
}

// Aplicar filtros
async function applyFilters() {
    const status = document.getElementById('status-filter').value;
    const searchOrder = document.getElementById('search-order').value;
    
    try {
        let url = '/api/logistics?';
        const params = new URLSearchParams();
        
        if (status) params.append('status', status);
        if (searchOrder) params.append('orderId', searchOrder);
        
        url += params.toString();
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao aplicar filtros');
        }

        const data = await response.json();
        logisticsData = data.logistics || [];
        totalPages = data.totalPages || 1;
        currentPage = 1;
        
        displayLogisticsList();
        displayPagination();

    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        showNotification('Erro ao aplicar filtros', 'error');
    }
}

// Mudar página
function changePage(page) {
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    loadLogisticsData();
}

// Ver detalhes da logística
async function viewLogisticsDetails(logisticsId) {
    try {
        const response = await fetch(`/api/logistics/orders/${logisticsId}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar detalhes');
        }

        const logistics = await response.json();
        showLogisticsModal(logistics);

    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        showNotification('Erro ao carregar detalhes', 'error');
    }
}

// Mostrar modal de detalhes
function showLogisticsModal(logistics) {
    document.getElementById('modal-order-id').textContent = logistics.orderId;
    document.getElementById('modal-order-date').textContent = formatDate(logistics.createdAt);
    document.getElementById('modal-order-total').textContent = formatCurrency(logistics.totalAmount || 0);
    
    // Status atual
    const statusIcon = document.getElementById('modal-status-icon');
    const statusLabel = document.getElementById('modal-status-label');
    const statusDate = document.getElementById('modal-status-date');
    
    statusIcon.innerHTML = `<i class="${getStatusIcon(logistics.status)}"></i>`;
    statusLabel.textContent = logistics.statusLabel;
    statusDate.textContent = formatDate(logistics.updatedAt);
    
    // Código de rastreamento
    if (logistics.trackingCode) {
        document.getElementById('tracking-section').style.display = 'block';
        document.getElementById('modal-tracking-code').textContent = logistics.trackingCode;
        document.getElementById('modal-carrier').textContent = logistics.carrier || 'E2E Transportes';
    } else {
        document.getElementById('tracking-section').style.display = 'none';
    }
    
    // Histórico
    displayTimeline(logistics.history);
    
    document.getElementById('logistics-modal').style.display = 'block';
}

// Exibir timeline
function displayTimeline(history) {
    const timeline = document.getElementById('modal-timeline');
    timeline.innerHTML = '';

    if (!history || history.length === 0) {
        timeline.innerHTML = '<p>Nenhum histórico disponível</p>';
        return;
    }

    history.forEach(entry => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        const isCorrection = entry.isCorrection;
        const iconClass = isCorrection ? 'fas fa-exclamation-triangle' : getStatusIcon(entry.toStatus);
        const correctionClass = isCorrection ? 'correction' : '';
        
        timelineItem.innerHTML = `
            <div class="timeline-icon ${correctionClass}">
                <i class="${iconClass}"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="timeline-status">${entry.statusLabel}</span>
                    <span class="timeline-time">${entry.timeAgo}</span>
                </div>
                <div class="timeline-details">
                    <p>${entry.reason || 'Atualização de status'}</p>
                    <small>Atualizado por: ${entry.updatedBy}</small>
                </div>
            </div>
        `;
        
        timeline.appendChild(timelineItem);
    });
}

// Atualizar status da logística
function updateLogisticsStatus(logisticsId) {
    currentLogisticsId = logisticsId;
    document.getElementById('update-status-modal').style.display = 'block';
}

// Corrigir status da logística
function correctLogisticsStatus(logisticsId) {
    currentLogisticsId = logisticsId;
    document.getElementById('correct-status-modal').style.display = 'block';
}

// Manipular atualização de status
async function handleUpdateStatus(event) {
    event.preventDefault();
    
    const newStatus = document.getElementById('new-status').value;
    const reason = document.getElementById('status-reason').value;
    
    if (!newStatus) {
        showNotification('Selecione um status', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/logistics/${currentLogisticsId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                status: newStatus,
                reason: reason
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao atualizar status');
        }

        showNotification('Status atualizado com sucesso', 'success');
        closeUpdateStatusModal();
        loadLogisticsData();

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showNotification(error.message || 'Erro ao atualizar status', 'error');
    }
}

// Manipular correção de status
async function handleCorrectStatus(event) {
    event.preventDefault();
    
    const correctStatus = document.getElementById('correct-status').value;
    const reason = document.getElementById('correct-reason').value;
    
    if (!correctStatus || !reason) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }
    
    if (reason.trim().length < 10) {
        showNotification('Motivo deve ter pelo menos 10 caracteres', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/logistics/${currentLogisticsId}/correct`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
                status: correctStatus,
                reason: reason
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao corrigir status');
        }

        showNotification('Status corrigido com sucesso', 'success');
        closeCorrectStatusModal();
        loadLogisticsData();

    } catch (error) {
        console.error('Erro ao corrigir status:', error);
        showNotification(error.message || 'Erro ao corrigir status', 'error');
    }
}

// Fechar modais
function closeLogisticsModal() {
    document.getElementById('logistics-modal').style.display = 'none';
}

function closeUpdateStatusModal() {
    document.getElementById('update-status-modal').style.display = 'none';
    document.getElementById('update-status-form').reset();
    currentLogisticsId = null;
}

function closeCorrectStatusModal() {
    document.getElementById('correct-status-modal').style.display = 'none';
    document.getElementById('correct-status-form').reset();
    currentLogisticsId = null;
}

// Copiar código de rastreamento
function copyTrackingCode() {
    const trackingCode = document.getElementById('modal-tracking-code').textContent;
    navigator.clipboard.writeText(trackingCode).then(() => {
        showNotification('Código copiado!', 'success');
    });
}

// Mostrar estatísticas (admin)
async function showStats() {
    try {
        const response = await fetch('/api/logistics/stats', {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar estatísticas');
        }

        const stats = await response.json();
        
        const statsModal = document.createElement('div');
        statsModal.className = 'modal';
        statsModal.style.display = 'block';
        statsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-chart-bar"></i> Estatísticas de Logística</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="stats-grid">
                        <div class="stat-item">
                            <h4>${stats.total}</h4>
                            <p>Total de Pedidos</p>
                        </div>
                        <div class="stat-item">
                            <h4>${stats.awaitingShipment}</h4>
                            <p>Aguardando Envio</p>
                        </div>
                        <div class="stat-item">
                            <h4>${stats.inTransit}</h4>
                            <p>Em Transporte</p>
                        </div>
                        <div class="stat-item">
                            <h4>${stats.delivered}</h4>
                            <p>Entregues</p>
                        </div>
                        <div class="stat-item">
                            <h4>${stats.averageDeliveryTime} dias</h4>
                            <p>Tempo Médio de Entrega</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(statsModal);

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        showNotification('Erro ao carregar estatísticas', 'error');
    }
}

// Funções auxiliares
function getStatusIcon(status) {
    const icons = {
        'awaiting_shipment': 'fas fa-clock',
        'in_transit': 'fas fa-truck',
        'delivered': 'fas fa-check-circle'
    };
    return icons[status] || 'fas fa-question';
}

function getStatusColor(status) {
    const colors = {
        'awaiting_shipment': '#ffc107',
        'in_transit': '#17a2b8',
        'delivered': '#28a745'
    };
    return colors[status] || '#666';
}

function getProgress(status) {
    const progress = {
        'awaiting_shipment': 0,
        'in_transit': 50,
        'delivered': 100
    };
    return progress[status] || 0;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Fechar modais ao clicar fora
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
