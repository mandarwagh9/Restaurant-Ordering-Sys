document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const tableNumberSection = document.getElementById('tableNumberSection');
    const mainContent = document.getElementById('mainContent');
    const tableNumberInput = document.getElementById('tableNumber');
    const startOrderBtn = document.getElementById('startOrderBtn');
    const tableDisplay = document.getElementById('tableDisplay');
    const cartItems = document.getElementById('cartItems');
    const emptyCartMessage = document.getElementById('emptyCartMessage');
    const cartTotal = document.getElementById('cartTotal');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const orderStatusCard = document.getElementById('orderStatusCard');
    const orderNotification = document.getElementById('orderNotification');
    const paymentSection = document.getElementById('paymentSection');
    
    // Status indicators
    const statusNew = document.getElementById('statusNew');
    const statusPreparing = document.getElementById('statusPreparing');
    const statusReady = document.getElementById('statusReady');
    const statusServed = document.getElementById('statusServed');
    
    // Menu containers
    const startersContainer = document.getElementById('startersContainer');
    const mainsContainer = document.getElementById('mainsContainer');
    const dessertsContainer = document.getElementById('dessertsContainer');
    const drinksContainer = document.getElementById('drinksContainer');
    
    // Cart and order variables
    let tableNumber = null;
    let cart = [];
    let currentOrderId = null;
    let menuItems = {};
    let orderStatusListener = null;
    
    // Initialize Bootstrap components
    const toastEl = new bootstrap.Toast(orderNotification);
    
    // Start order button click event
    startOrderBtn.addEventListener('click', function() {
        const tableNum = parseInt(tableNumberInput.value);
        if (tableNum && tableNum > 0) {
            tableNumber = tableNum;
            tableDisplay.textContent = tableNumber;
            tableNumberSection.style.display = 'none';
            mainContent.style.display = 'block';
            
            // Load menu items
            loadMenuItems();
            
            // Check if there's an existing order for this table
            checkExistingOrder(tableNumber);
        } else {
            alert('Please enter a valid table number');
        }
    });
    
    // Load menu items from Firebase
    function loadMenuItems() {
        database.ref('menu').once('value')
            .then((snapshot) => {
                const menu = snapshot.val();
                menuItems = menu;
                
                // Render menu items by category
                renderMenuCategory(menu.starters, startersContainer);
                renderMenuCategory(menu.mains, mainsContainer);
                renderMenuCategory(menu.desserts, dessertsContainer);
                renderMenuCategory(menu.drinks, drinksContainer);
            })
            .catch((error) => {
                console.error("Error loading menu items:", error);
                alert("Failed to load menu items. Please try again.");
            });
    }
    
    // Render menu items for a specific category
    function renderMenuCategory(categoryItems, container) {
        container.innerHTML = '';
        
        for (const itemId in categoryItems) {
            const item = categoryItems[itemId];
            
            const menuItemElement = document.createElement('div');
            menuItemElement.className = 'col-md-6 col-lg-4';
            menuItemElement.innerHTML = `
                <div class="card menu-item">
                    <img src="${item.image}" class="card-img-top" alt="${item.name}">
                    <div class="card-body">
                        <h5 class="card-title">${item.name}</h5>
                        <p class="card-text">${item.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">$${item.price.toFixed(2)}</h6>
                            <button class="btn btn-sm btn-primary add-to-cart" data-id="${itemId}" data-category="${item.category}">Add to Order</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add button click event
            const addButton = menuItemElement.querySelector('.add-to-cart');
            addButton.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                const category = this.getAttribute('data-category');
                addToCart(menuItems[category][itemId]);
            });
            
            container.appendChild(menuItemElement);
        }
    }
    
    // Add item to cart
    function addToCart(item) {
        // Check if item is already in cart
        const existingItemIndex = cart.findIndex(cartItem => 
            cartItem.name === item.name && cartItem.category === item.category);
        
        if (existingItemIndex !== -1) {
            // Update quantity if item exists
            cart[existingItemIndex].quantity += 1;
        } else {
            // Add new item with quantity 1
            cart.push({
                ...item,
                quantity: 1
            });
        }
        
        // Update cart UI
        updateCartUI();
    }
    
    // Update cart UI
    function updateCartUI() {
        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            placeOrderBtn.disabled = true;
        } else {
            emptyCartMessage.style.display = 'none';
            placeOrderBtn.disabled = false;
            
            // Clear and populate cart items
            const cartItemsContent = document.createElement('div');
            
            let total = 0;
            cart.forEach((item, index) => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                
                const cartItemElement = document.createElement('div');
                cartItemElement.className = 'cart-item';
                cartItemElement.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${item.name}</h6>
                            <small class="text-muted">$${item.price.toFixed(2)} × ${item.quantity}</small>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="me-2">$${itemTotal.toFixed(2)}</span>
                            <button class="btn btn-sm btn-outline-danger remove-item" data-index="${index}">×</button>
                        </div>
                    </div>
                `;
                
                // Add remove button click event
                const removeButton = cartItemElement.querySelector('.remove-item');
                removeButton.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    removeFromCart(index);
                });
                
                cartItemsContent.appendChild(cartItemElement);
            });
            
            cartItems.innerHTML = '';
            cartItems.appendChild(cartItemsContent);
            cartTotal.textContent = total.toFixed(2);
        }
    }
    
    // Remove item from cart
    function removeFromCart(index) {
        if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
        } else {
            cart.splice(index, 1);
        }
        updateCartUI();
    }
    
    // Place order button click event
    placeOrderBtn.addEventListener('click', function() {
        if (cart.length === 0) return;
        
        const orderId = Date.now().toString();
        currentOrderId = orderId;
        
        const order = {
            orderId: orderId,
            tableNumber: tableNumber,
            items: cart,
            status: 'new',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            total: parseFloat(cartTotal.textContent)
        };
        
        // Save order to Firebase
        database.ref('orders/' + orderId).set(order)
            .then(() => {
                // Update UI to show order status
                showOrderStatus(orderId);
                
                // Show notification
                document.querySelector('.toast-body').textContent = `Your order #${orderId.slice(-6)} has been placed successfully!`;
                toastEl.show();
                
                // Clear cart
                cart = [];
                updateCartUI();
            })
            .catch((error) => {
                console.error("Error placing order:", error);
                alert("Failed to place order. Please try again.");
            });
    });
    
    // Show order status
    function showOrderStatus(orderId) {
        document.getElementById('orderNumber').innerHTML = `<strong>Order #${orderId.slice(-6)}</strong>`;
        orderStatusCard.style.display = 'block';
        
        // Update status indicator for 'new' status
        updateStatusIndicators('new');
        
        // Set up listener for order status changes
        if (orderStatusListener) {
            orderStatusListener.off();
        }
        
        orderStatusListener = database.ref('orders/' + orderId);
        orderStatusListener.on('value', (snapshot) => {
            const order = snapshot.val();
            if (order) {
                updateStatusIndicators(order.status);
                
                // Show payment section when order is served
                if (order.status === 'served') {
                    paymentSection.style.display = 'block';
                }
            }
        });
    }
    
    // Update status indicators
    function updateStatusIndicators(status) {
        // Reset all indicators
        statusNew.className = 'status-indicator';
        statusPreparing.className = 'status-indicator';
        statusReady.className = 'status-indicator';
        statusServed.className = 'status-indicator';
        
        // Set appropriate indicators based on current status
        switch(status) {
            case 'new':
                statusNew.classList.add('status-new');
                break;
            case 'preparing':
                statusNew.classList.add('status-new');
                statusPreparing.classList.add('status-preparing');
                break;
            case 'ready':
                statusNew.classList.add('status-new');
                statusPreparing.classList.add('status-preparing');
                statusReady.classList.add('status-ready');
                break;
            case 'served':
                statusNew.classList.add('status-new');
                statusPreparing.classList.add('status-preparing');
                statusReady.classList.add('status-ready');
                statusServed.classList.add('status-served');
                break;
        }
    }
    
    // Process payment button click event
    document.getElementById('processPaymentBtn').addEventListener('click', function() {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        
        // Update order with payment method
        database.ref('orders/' + currentOrderId).update({
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'now' ? 'paid' : 'pending'
        })
        .then(() => {
            alert(`Payment ${paymentMethod === 'now' ? 'processed' : 'will be handled at the cashier'}. Thank you for your order!`);
            
            // Reset UI for new order
            orderStatusCard.style.display = 'none';
            paymentSection.style.display = 'none';
            currentOrderId = null;
            
            // Option to start a new order or return to table selection
            if (confirm('Would you like to place another order?')) {
                // Stay on the current page
            } else {
                // Return to table selection
                mainContent.style.display = 'none';
                tableNumberSection.style.display = 'block';
                tableNumberInput.value = '';
            }
        })
        .catch((error) => {
            console.error("Error processing payment:", error);
            alert("Failed to process payment. Please try again.");
        });
    });
    
    // Check for existing orders for this table
    function checkExistingOrder(tableNum) {
        database.ref('orders').orderByChild('tableNumber').equalTo(tableNum).once('value')
            .then((snapshot) => {
                const orders = snapshot.val();
                if (orders) {
                    // Find the most recent active order
                    let latestOrderId = null;
                    let latestTimestamp = 0;
                    
                    for (const orderId in orders) {
                        const order = orders[orderId];
                        if (order.timestamp > latestTimestamp && 
                            (order.status !== 'completed' && order.status !== 'cancelled')) {
                            latestOrderId = orderId;
                            latestTimestamp = order.timestamp;
                        }
                    }
                    
                    if (latestOrderId) {
                        currentOrderId = latestOrderId;
                        showOrderStatus(latestOrderId);
                    }
                }
            })
            .catch((error) => {
                console.error("Error checking existing orders:", error);
            });
    }
});