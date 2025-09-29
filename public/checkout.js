// Sistema de Checkout
class CheckoutManager {
    constructor() {
        this.currentStep = 1;
        this.cart = { items: [], total: 0, itemCount: 0 };
        this.addresses = [];
        this.selectedAddress = null;
        this.selectedPayment = null;
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.loadCart();
        this.loadAddresses();
    }

    checkAuthStatus() {
        const user = getCurrentUser();
        if (!user) {
            alert('Você precisa estar logado para finalizar a compra.');
            window.location.href = 'login.html';
            return;
        }
    }

    setupEventListeners() {
        // Navegação entre passos
        document.getElementById('next-step-1').addEventListener('click', () => this.nextStep());
        document.getElementById('next-step-2').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-step-2').addEventListener('click', () => this.prevStep());
        document.getElementById('prev-step-3').addEventListener('click', () => this.prevStep());

        // Endereços
        document.getElementById('add-address-btn').addEventListener('click', () => this.showNewAddressForm());
        document.getElementById('cancel-address-btn').addEventListener('click', () => this.hideNewAddressForm());
        document.getElementById('address-form').addEventListener('submit', (e) => this.saveAddress(e));

        // CEP
        document.getElementById('cep').addEventListener('blur', () => this.searchCEP());

        // Pagamento
        document.querySelectorAll('input[name="payment"]').forEach(radio => {
            radio.addEventListener('change', () => this.updatePaymentMethod());
        });

        // Confirmação
        document.getElementById('confirm-order').addEventListener('click', () => this.confirmOrder());
    }

    async loadCart() {
        try {
            const response = await fetch('/api/cart', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.cart = data;
                this.renderOrderSummary();
            } else {
                this.showNotification('Erro ao carregar carrinho', 'error');
                window.location.href = 'carrinho.html';
            }
        } catch (error) {
            console.error('Erro ao carregar carrinho:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    async loadAddresses() {
        try {
            const response = await fetch('/api/addresses', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.addresses = data.addresses;
                this.renderAddresses();
            } else {
                console.error('Erro ao carregar endereços');
            }
        } catch (error) {
            console.error('Erro ao carregar endereços:', error);
        }
    }

    renderOrderSummary() {
        const orderItems = document.getElementById('order-items');
        const subtotal = this.cart.total;
        const shipping = this.calculateShipping(subtotal);
        const total = subtotal + shipping;

        // Renderizar itens
        orderItems.innerHTML = '';
        this.cart.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'order-item';
            itemElement.innerHTML = `
                <div class="item-image">
                    <img src="${item.product?.image || 'https://via.placeholder.com/50x50?text=Produto'}" alt="${item.productName}">
                </div>
                <div class="item-details">
                    <h4>${item.productName}</h4>
                    <p>Quantidade: ${item.quantity}</p>
                </div>
                <div class="item-price">
                    R$ ${item.subtotal.toFixed(2).replace('.', ',')}
                </div>
            `;
            orderItems.appendChild(itemElement);
        });

        // Atualizar totais
        document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        document.getElementById('shipping').textContent = `R$ ${shipping.toFixed(2).replace('.', ',')}`;
        document.getElementById('total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    calculateShipping(subtotal) {
        if (subtotal >= 200) {
            return 0;
        }
        return 15;
    }

    renderAddresses() {
        const addressesList = document.getElementById('addresses-list');
        addressesList.innerHTML = '';

        if (this.addresses.length === 0) {
            addressesList.innerHTML = '<p class="no-addresses">Nenhum endereço cadastrado</p>';
            return;
        }

        this.addresses.forEach(address => {
            const addressElement = document.createElement('div');
            addressElement.className = 'address-option';
            addressElement.innerHTML = `
                <input type="radio" name="selected-address" value="${address.id}" id="address-${address.id}">
                <label for="address-${address.id}">
                    <div class="address-info">
                        <h4>${address.typeLabel}</h4>
                        <p>${address.fullAddress}</p>
                        ${address.isDefault ? '<span class="default-badge">Padrão</span>' : ''}
                    </div>
                </label>
            `;
            addressesList.appendChild(addressElement);
        });

        // Adicionar event listeners para seleção de endereço
        document.querySelectorAll('input[name="selected-address"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateAddressSelection());
        });
    }

    updateAddressSelection() {
        const selectedRadio = document.querySelector('input[name="selected-address"]:checked');
        if (selectedRadio) {
            const addressId = parseInt(selectedRadio.value);
            this.selectedAddress = this.addresses.find(a => a.id === addressId);
            document.getElementById('next-step-1').disabled = false;
        } else {
            this.selectedAddress = null;
            document.getElementById('next-step-1').disabled = true;
        }
    }

    showNewAddressForm() {
        document.getElementById('new-address-form').style.display = 'block';
        document.getElementById('add-address-btn').style.display = 'none';
    }

    hideNewAddressForm() {
        document.getElementById('new-address-form').style.display = 'none';
        document.getElementById('add-address-form').reset();
        document.getElementById('add-address-btn').style.display = 'block';
    }

    async searchCEP() {
        const cep = document.getElementById('cep').value.replace(/\D/g, '');
        
        if (cep.length === 8) {
            try {
                const response = await fetch('/api/addresses/cep', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ cep: cep })
                });

                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('street').value = data.street;
                    document.getElementById('neighborhood').value = data.neighborhood;
                    document.getElementById('city').value = data.city;
                    document.getElementById('state').value = data.state;
                } else {
                    this.showNotification('CEP não encontrado', 'error');
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
        }
    }

    async saveAddress(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const addressData = {
            type: formData.get('address-type'),
            cep: formData.get('cep'),
            street: formData.get('street'),
            number: formData.get('number'),
            complement: formData.get('complement'),
            neighborhood: formData.get('neighborhood'),
            city: formData.get('city'),
            state: formData.get('state'),
            isDefault: this.addresses.length === 0
        };

        try {
            const response = await fetch('/api/addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(addressData)
            });

            if (response.ok) {
                const data = await response.json();
                this.addresses.push(data.address);
                this.renderAddresses();
                this.hideNewAddressForm();
                this.showNotification('Endereço salvo com sucesso', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Erro ao salvar endereço', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar endereço:', error);
            this.showNotification('Erro de conexão', 'error');
        }
    }

    updatePaymentMethod() {
        const selectedRadio = document.querySelector('input[name="payment"]:checked');
        if (selectedRadio) {
            this.selectedPayment = selectedRadio.value;
            document.getElementById('next-step-2').disabled = false;
        } else {
            this.selectedPayment = null;
            document.getElementById('next-step-2').disabled = true;
        }
    }

    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
            this.updateStepDisplay();
            this.updateStepContent();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.updateStepContent();
        }
    }

    updateStepDisplay() {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        document.querySelector(`[data-step="${this.currentStep}"]`).classList.add('active');
    }

    updateStepContent() {
        document.querySelectorAll('.checkout-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(`step-${this.currentStep}`).classList.add('active');

        if (this.currentStep === 3) {
            this.updateConfirmationContent();
        }
    }

    updateConfirmationContent() {
        if (this.selectedAddress) {
            document.getElementById('selected-address').textContent = this.selectedAddress.fullAddress;
        }

        if (this.selectedPayment) {
            const paymentLabels = {
                'credit-card': 'Cartão de Crédito',
                'pix': 'PIX'
            };
            document.getElementById('selected-payment').textContent = paymentLabels[this.selectedPayment];
        }

        const subtotal = this.cart.total;
        const shipping = this.calculateShipping(subtotal);
        const total = subtotal + shipping;
        document.getElementById('confirmation-total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }

    async confirmOrder() {
        if (!this.selectedAddress) {
            this.showNotification('Selecione um endereço de entrega', 'error');
            return;
        }

        if (!this.selectedPayment) {
            this.showNotification('Selecione uma forma de pagamento', 'error');
            return;
        }

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    items: this.cart.items,
                    shippingAddressId: this.selectedAddress.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.showNotification('Pedido criado com sucesso!', 'success');
                
                // Limpar carrinho
                await fetch('/api/cart/clear', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                });

                // Redirecionar para página de pedidos
                setTimeout(() => {
                    window.location.href = 'pedidos.html';
                }, 2000);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Erro ao criar pedido', 'error');
            }
        } catch (error) {
            console.error('Erro ao criar pedido:', error);
            this.showNotification('Erro de conexão', 'error');
        }
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
    window.checkoutManager = new CheckoutManager();
});
