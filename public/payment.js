// Variáveis globais
let currentOrder = null;
let paymentQuotes = null;
let pixInterval = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    initializePayment();
    setupEventListeners();
    loadOrderData();
});

// Inicializar página de pagamento
function initializePayment() {
    // Verificar se usuário está logado
    if (!getCurrentUser()) {
        showNotification('Você precisa estar logado para acessar esta página', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Verificar se há dados do pedido
    const orderData = sessionStorage.getItem('currentOrder');
    if (!orderData) {
        showNotification('Nenhum pedido encontrado', 'error');
        setTimeout(() => {
            window.location.href = 'carrinho.html';
        }, 2000);
        return;
    }

    currentOrder = JSON.parse(orderData);
    displayOrderSummary();
    loadPaymentQuotes();
}

// Configurar event listeners
function setupEventListeners() {
    // Mudança de método de pagamento
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', handlePaymentMethodChange);
    });

    // Formatação de campos
    document.getElementById('card-number').addEventListener('input', formatCardNumber);
    document.getElementById('card-expiry').addEventListener('input', formatCardExpiry);
    document.getElementById('card-cvv').addEventListener('input', formatCardCvv);
    document.getElementById('pix-cpf').addEventListener('input', formatCpf);
    document.getElementById('pix-cnpj').addEventListener('input', formatCnpj);

    // Processar pagamento
    document.getElementById('process-payment').addEventListener('click', processPayment);

    // Mudança de parcelas
    document.getElementById('installments').addEventListener('change', updateInstallmentDetails);
}

// Carregar dados do pedido
function loadOrderData() {
    if (!currentOrder) return;

    // Atualizar total
    document.getElementById('order-total').textContent = formatCurrency(currentOrder.totalAmount);
}

// Exibir resumo do pedido
function displayOrderSummary() {
    if (!currentOrder) return;

    const summaryContent = document.getElementById('order-summary-content');
    summaryContent.innerHTML = '';

    currentOrder.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item';
        itemDiv.innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-quantity">Qtd: ${item.quantity}</span>
            </div>
            <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
        `;
        summaryContent.appendChild(itemDiv);
    });
}

// Carregar cotações de pagamento
async function loadPaymentQuotes() {
    try {
        const response = await fetch('/api/payments/quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: currentOrder.totalAmount
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar cotações');
        }

        const data = await response.json();
        paymentQuotes = data.quotes;
        updateInstallmentOptions();
        updateInstallmentDetails();

    } catch (error) {
        console.error('Erro ao carregar cotações:', error);
        showNotification('Erro ao carregar opções de pagamento', 'error');
    }
}

// Atualizar opções de parcelas
function updateInstallmentOptions() {
    if (!paymentQuotes) return;

    const select = document.getElementById('installments');
    select.innerHTML = '';

    paymentQuotes.forEach(quote => {
        const option = document.createElement('option');
        option.value = quote.installments;
        
        if (quote.installments === 1) {
            option.textContent = `1x de ${formatCurrency(quote.installmentAmount)} (à vista)`;
        } else {
            option.textContent = `${quote.installments}x de ${formatCurrency(quote.installmentAmount)}`;
        }
        
        select.appendChild(option);
    });
}

// Atualizar detalhes das parcelas
function updateInstallmentDetails() {
    if (!paymentQuotes) return;

    const selectedInstallments = parseInt(document.getElementById('installments').value);
    const quote = paymentQuotes.find(q => q.installments === selectedInstallments);
    
    if (!quote) return;

    const detailsDiv = document.getElementById('installment-details');
    
    if (selectedInstallments === 1) {
        detailsDiv.innerHTML = `
            <div class="installment-info">
                <span class="installment-total">Total: ${formatCurrency(quote.totalWithInterest)}</span>
                <span class="installment-interest">Sem juros</span>
            </div>
        `;
    } else {
        detailsDiv.innerHTML = `
            <div class="installment-info">
                <span class="installment-total">Total: ${formatCurrency(quote.totalWithInterest)}</span>
                <span class="installment-interest">Juros: ${formatCurrency(quote.totalInterest)} (${quote.interestRate}% a.m.)</span>
            </div>
        `;
    }
}

// Manipular mudança de método de pagamento
function handlePaymentMethodChange(event) {
    const method = event.target.value;
    
    // Esconder todos os formulários
    document.getElementById('card-form').style.display = 'none';
    document.getElementById('pix-form').style.display = 'none';
    
    // Mostrar formulário correspondente
    if (method === 'credit_card' || method === 'debit_card') {
        document.getElementById('card-form').style.display = 'block';
        
        // Mostrar/ocultar seção de parcelas
        const installmentsSection = document.getElementById('installments-section');
        if (method === 'credit_card') {
            installmentsSection.style.display = 'block';
        } else {
            installmentsSection.style.display = 'none';
        }
    } else if (method === 'pix') {
        document.getElementById('pix-form').style.display = 'block';
    }
}

// Processar pagamento
async function processPayment() {
    const method = document.querySelector('input[name="payment-method"]:checked').value;
    
    try {
        if (method === 'credit_card' || method === 'debit_card') {
            await processCardPayment(method);
        } else if (method === 'pix') {
            await processPixPayment();
        }
    } catch (error) {
        console.error('Erro no pagamento:', error);
        showNotification('Erro ao processar pagamento', 'error');
    }
}

// Processar pagamento com cartão
async function processCardPayment(method) {
    const cardData = {
        orderId: currentOrder.id,
        amount: currentOrder.totalAmount,
        pan: document.getElementById('card-number').value.replace(/\s/g, ''),
        cvv: document.getElementById('card-cvv').value,
        expiryMonth: document.getElementById('card-expiry').value.split('/')[0],
        expiryYear: '20' + document.getElementById('card-expiry').value.split('/')[1],
        installments: method === 'credit_card' ? parseInt(document.getElementById('installments').value) : 1
    };

    // Validar dados
    if (!validateCardData(cardData)) {
        return;
    }

    // Mostrar loading
    const button = document.getElementById('process-payment');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    button.disabled = true;

    try {
        const endpoint = method === 'credit_card' ? '/api/payments/credit-card' : '/api/payments/debit-card';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(cardData)
        });

        const result = await response.json();

        if (result.success) {
            showSuccessModal(result);
        } else {
            showNotification(result.message || 'Pagamento recusado', 'error');
        }

    } catch (error) {
        showNotification('Erro ao processar pagamento', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Processar pagamento PIX
async function processPixPayment() {
    const pixData = {
        orderId: currentOrder.id,
        amount: currentOrder.totalAmount,
        payerCpf: document.getElementById('pix-cpf').value.replace(/\D/g, ''),
        payerCnpj: document.getElementById('pix-cnpj').value.replace(/\D/g, '')
    };

    // Validar dados
    if (!validatePixData(pixData)) {
        return;
    }

    // Mostrar loading
    const button = document.getElementById('process-payment');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PIX...';
    button.disabled = true;

    try {
        const response = await fetch('/api/payments/pix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(pixData)
        });

        const result = await response.json();

        if (result.success) {
            showPixModal(result.pixData);
        } else {
            showNotification(result.message || 'Erro ao gerar PIX', 'error');
        }

    } catch (error) {
        showNotification('Erro ao processar PIX', 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Validar dados do cartão
function validateCardData(data) {
    if (!data.pan || data.pan.length < 13) {
        showNotification('Número do cartão inválido', 'error');
        return false;
    }

    if (!data.cvv || data.cvv.length < 3) {
        showNotification('CVV inválido', 'error');
        return false;
    }

    if (!data.expiryMonth || !data.expiryYear) {
        showNotification('Data de expiração inválida', 'error');
        return false;
    }

    if (!data.cardHolder || data.cardHolder.trim().length < 2) {
        showNotification('Nome no cartão é obrigatório', 'error');
        return false;
    }

    return true;
}

// Validar dados PIX
function validatePixData(data) {
    if (!data.payerCpf && !data.payerCnpj) {
        showNotification('CPF ou CNPJ é obrigatório', 'error');
        return false;
    }

    if (data.payerCpf && data.payerCpf.length !== 11) {
        showNotification('CPF inválido', 'error');
        return false;
    }

    if (data.payerCnpj && data.payerCnpj.length !== 14) {
        showNotification('CNPJ inválido', 'error');
        return false;
    }

    return true;
}

// Mostrar modal de sucesso
function showSuccessModal(paymentData) {
    document.getElementById('payment-id').textContent = paymentData.paymentId;
    document.getElementById('payment-amount').textContent = formatCurrency(currentOrder.totalAmount);
    document.getElementById('payment-method').textContent = getPaymentMethodLabel(document.querySelector('input[name="payment-method"]:checked').value);
    
    document.getElementById('success-modal').style.display = 'block';
}

// Mostrar modal PIX
function showPixModal(pixData) {
    document.getElementById('pix-key-display').textContent = pixData.pixKey;
    document.getElementById('pix-amount').textContent = formatCurrency(currentOrder.totalAmount);
    
    // Calcular tempo de expiração
    const expiresAt = new Date(pixData.expiresAt);
    const now = new Date();
    const minutesLeft = Math.ceil((expiresAt - now) / (1000 * 60));
    document.getElementById('pix-expiry').textContent = `${minutesLeft} minutos`;
    
    document.getElementById('pix-modal').style.display = 'block';
    
    // Iniciar polling do status
    startPixPolling(pixData.txid);
}

// Iniciar polling do PIX
function startPixPolling(txid) {
    pixInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/payments/pix/${txid}/status`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            const result = await response.json();
            
            if (result.status === 'paid') {
                clearInterval(pixInterval);
                closePixModal();
                showSuccessModal({ paymentId: txid });
            } else if (result.status === 'expired' || result.isExpired) {
                clearInterval(pixInterval);
                showNotification('PIX expirado', 'error');
                closePixModal();
            }

        } catch (error) {
            console.error('Erro ao verificar status PIX:', error);
        }
    }, 10000); // Verificar a cada 10 segundos
}

// Fechar modal PIX
function closePixModal() {
    document.getElementById('pix-modal').style.display = 'none';
    if (pixInterval) {
        clearInterval(pixInterval);
    }
}

// Copiar chave PIX
function copyPixKey() {
    const pixKey = document.getElementById('pix-key-display').textContent;
    navigator.clipboard.writeText(pixKey).then(() => {
        showNotification('Chave PIX copiada!', 'success');
    });
}

// Redirecionar para pedidos
function redirectToOrders() {
    window.location.href = 'pedidos.html';
}

// Formatação de campos
function formatCardNumber(input) {
    let value = input.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.target.value = value;
}

function formatCardExpiry(input) {
    let value = input.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    input.target.value = value;
}

function formatCardCvv(input) {
    input.target.value = input.target.value.replace(/\D/g, '');
}

function formatCpf(input) {
    let value = input.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    input.target.value = value;
}

function formatCnpj(input) {
    let value = input.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    input.target.value = value;
}

// Funções auxiliares
function getPaymentMethodLabel(method) {
    const labels = {
        'credit_card': 'Cartão de Crédito',
        'debit_card': 'Cartão de Débito',
        'pix': 'PIX'
    };
    return labels[method] || method;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Fechar modais ao clicar fora
window.addEventListener('click', function(event) {
    const pixModal = document.getElementById('pix-modal');
    const successModal = document.getElementById('success-modal');
    
    if (event.target === pixModal) {
        closePixModal();
    }
    
    if (event.target === successModal) {
        successModal.style.display = 'none';
    }
});
