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
    const orderNumber = document.getElementById('orderNumber');
    const paymentSection = document.getElementById('paymentSection');
    const processPaymentBtn = document.getElementById('processPaymentBtn');
    
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
    
    // Variables
    let currentTable = null;
    let cart = [];
    let currentOrderId = null;
    let toast = null;
    
    // Initialize Bootstrap toast
    function initToast() {
        toast = new bootstrap.Toast(orderNotification);
    }
    initToast();
    
    // Start ordering - show main content after table number is entered
    startOrderBtn.addEventListener('click', function() {
        const tableNum = tableNumberInput.value.trim();
        if (!tableNum || isNaN(tableNum) || tableNum <= 0) {
            alert('Please enter a valid table number');
            return;
        }
        
        currentTable = tableNum;
        tableDisplay.textContent = currentTable;
        
        // Hide table number section and show main content
        tableNumberSection.style.display = 'none';
        mainContent.style.display = 'block';
        
        // Check if table has active orders
        checkTableOrders(currentTable);
        
        // Load menu items
        loadMenuItems();
    });
    
    // Check if table has active orders
    function checkTableOrders(tableNum) {
        const ordersRef = database.ref('orders');
        
        ordersRef.orderByChild('table').equalTo(parseInt(tableNum)).once('value', (snapshot) => {
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const orderData = childSnapshot.val();
                    if (orderData.status !== 'completed') {
                        // Active order exists for this table
                        currentOrderId = childSnapshot.key;
                        displayOrderStatus(orderData);
                    }
                });
            }
        });
    }
    
    // Load menu items from Firebase
    function loadMenuItems() {
        const menuRef = database.ref('menu');
        
        menuRef.once('value', (snapshot) => {
            const menuData = snapshot.val();
            
            // Clear containers
            startersContainer.innerHTML = '';
            mainsContainer.innerHTML = '';
            dessertsContainer.innerHTML = '';
            drinksContainer.innerHTML = '';
            
            if (menuData) {
                // Load starters
                if (menuData.starters) {
                    Object.keys(menuData.starters).forEach(key => {
                        const item = menuData.starters[key];
                        startersContainer.appendChild(createMenuItemCard(key, item));
                    });
                }
                
                // Load main courses
                if (menuData.mains) {
                    Object.keys(menuData.mains).forEach(key => {
                        const item = menuData.mains[key];
                        mainsContainer.appendChild(createMenuItemCard(key, item));
                    });
                }
                
                // Load desserts
                if (menuData.desserts) {
                    Object.keys(menuData.desserts).forEach(key => {
                        const item = menuData.desserts[key];
                        dessertsContainer.appendChild(createMenuItemCard(key, item));
                    });
                }
                
                // Load drinks
                if (menuData.drinks) {
                    Object.keys(menuData.drinks).forEach(key => {
                        const item = menuData.drinks[key];
                        drinksContainer.appendChild(createMenuItemCard(key, item));
                    });
                }
            }
        });
    }
    
    // Create menu item card
    function createMenuItemCard(itemId, item) {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-4';
        
        const cardHTML = `
            <div class="card menu-item">
                <img src="${item.image}" class="card-img-top" alt="${item.name}">
                <div class="card-body">
                    <h5 class="card-title">${item.name}</h5>
                    <p class="card-text">${item.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-primary fw-bold">$${item.price.toFixed(2)}</span>
                        <button class="btn btn-sm btn-outline-primary add-to-cart-btn" 
                                data-id="${itemId}" 
                                data-name="${item.name}" 
                                data-price="${item.price}" 
                                data-category="${item.category}">
                            Add to Order
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        colDiv.innerHTML = cardHTML;
        
        // Add event listener to the "Add to Order" button
        colDiv.querySelector('.add-to-cart-btn').addEventListener('click', function() {
            const btn = this;
            const itemData = {
                id: btn.getAttribute('data-id'),
                name: btn.getAttribute('data-name'),
                price: parseFloat(btn.getAttribute('data-price')),
                category: btn.getAttribute('data-category'),
                quantity: 1
            };
            
            addToCart(itemData);
        });
        
        return colDiv;
    }
    
    // Add item to cart
    function addToCart(itemData) {
        // Check if item already exists in cart
        const existingItemIndex = cart.findIndex(item => item.id === itemData.id && item.category === itemData.category);
        
        if (existingItemIndex !== -1) {
            // Item exists, increment quantity
            cart[existingItemIndex].quantity++;
        } else {
            // New item, add to cart
            cart.push(itemData);
        }
        
        // Update cart display
        updateCartDisplay();
    }
    
    // Update cart display
    function updateCartDisplay() {
        // Hide empty cart message if cart has items
        emptyCartMessage.style.display = cart.length > 0 ? 'none' : 'block';
        
        // Clear cart items
        cartItems.innerHTML = cart.length > 0 ? '' : emptyCartMessage.outerHTML;
        
        // Calculate total
        let total = 0;
        
        // Add each item to cart display
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'cart-item';
            cartItemDiv.innerHTML = `
                <div class="d-flex justify-content-between">
                    <h6>${item.name}</h6>
                    <div>
                        <button class="btn btn-sm btn-outline-danger remove-item" data-index="${index}">-</button>
                        <span class="mx-2">${item.quantity}</span>
                        <button class="btn btn-sm btn-outline-success add-item" data-index="${index}">+</button>
                    </div>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <small class="text-muted">$${item.price.toFixed(2)} each</small>
                    <span>$${itemTotal.toFixed(2)}</span>
                </div>
            `;
            
            cartItems.appendChild(cartItemDiv);
            
            // Add event listeners to the buttons
            cartItemDiv.querySelector('.remove-item').addEventListener('click', function() {
                removeFromCart(parseInt(this.getAttribute('data-index')));
            });
            
            cartItemDiv.querySelector('.add-item').addEventListener('click', function() {
                incrementCartItem(parseInt(this.getAttribute('data-index')));
            });
        });
        
        // Update total
        cartTotal.textContent = total.toFixed(2);
        
        // Enable/disable place order button
        placeOrderBtn.disabled = cart.length === 0;
    }
    
    // Remove item from cart
    function removeFromCart(index) {
        if (cart[index].quantity > 1) {
            cart[index].quantity--;
        } else {
            cart.splice(index, 1);
        }
        
        // Update cart display
        updateCartDisplay();
    }
    
    // Increment cart item quantity
    function incrementCartItem(index) {
        cart[index].quantity++;
        
        // Update cart display
        updateCartDisplay();
    }
    
    // Place order
    placeOrderBtn.addEventListener('click', function() {
        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }
        
        // Create order object
        const order = {
            table: parseInt(currentTable),
            items: cart,
            status: 'new',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            total: parseFloat(cartTotal.textContent)
        };
        
        // Push order to Firebase
        const ordersRef = database.ref('orders');
        const newOrderRef = ordersRef.push();
        
        newOrderRef.set(order)
            .then(() => {
                // Set current order ID
                currentOrderId = newOrderRef.key;
                
                // Show order notification
                orderNotification.querySelector('.toast-body').textContent = `Your order #${currentOrderId.slice(-5)} has been placed successfully!`;
                toast.show();
                
                // Set order status in UI
                displayOrderStatus(order);
                
                // Clear cart
                cart = [];
                updateCartDisplay();
                
                // Listen for order status updates
                listenForOrderUpdates(currentOrderId);
            })
            .catch(error => {
                console.error('Error placing order:', error);
                alert('Error placing order. Please try again.');
            });
    });
    
    // Display order status
    function displayOrderStatus(order) {
        // Show order status card
        orderStatusCard.style.display = 'block';
        
        // Update order number
        orderNumber.innerHTML = `<h5>Order #${currentOrderId.slice(-5)}</h5>`;
        
        // Update status indicators
        updateStatusIndicators(order.status);
        
        // Show payment section if order is ready to serve
        if (order.status === 'ready' || order.status === 'served') {
            paymentSection.style.display = 'block';
        } else {
            paymentSection.style.display = 'none';
        }
    }
    
    // Update status indicators
    function updateStatusIndicators(status) {
        // Reset all indicators
        statusNew.className = 'status-indicator';
        statusPreparing.className = 'status-indicator';
        statusReady.className = 'status-indicator';
        statusServed.className = 'status-indicator';
        
        // Set active indicators based on status
        switch (status) {
            case 'new':
                statusNew.className = 'status-indicator status-new';
                break;
            case 'preparing':
                statusNew.className = 'status-indicator status-new';
                statusPreparing.className = 'status-indicator status-preparing';
                break;
            case 'ready':
                statusNew.className = 'status-indicator status-new';
                statusPreparing.className = 'status-indicator status-preparing';
                statusReady.className = 'status-indicator status-ready';
                break;
            case 'served':
                statusNew.className = 'status-indicator status-new';
                statusPreparing.className = 'status-indicator status-preparing';
                statusReady.className = 'status-indicator status-ready';
                statusServed.className = 'status-indicator status-served';
                break;
        }
    }
    
    // Listen for order status updates
    function listenForOrderUpdates(orderId) {
        const orderRef = database.ref(`orders/${orderId}`);
        
        orderRef.on('value', (snapshot) => {
            const orderData = snapshot.val();
            if (orderData) {
                // Update status indicators
                updateStatusIndicators(orderData.status);
                
                // Show payment section if order is ready to serve
                if (orderData.status === 'ready' || orderData.status === 'served') {
                    paymentSection.style.display = 'block';
                } else {
                    paymentSection.style.display = 'none';
                }
                
                // If order is completed, stop listening for updates
                if (orderData.status === 'completed') {
                    orderRef.off();
                    orderStatusCard.style.display = 'none';
                    currentOrderId = null;
                }
            }
        });
    }
    
    // Process payment
    processPaymentBtn.addEventListener('click', function() {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        
        if (paymentMethod === 'now') {
            // If customer wants to pay now, update order with payment info
            const orderRef = database.ref(`orders/${currentOrderId}`);
            
            orderRef.update({
                paymentStatus: 'pending',
                paymentMethod: 'online'
            })
            .then(() => {
                alert('Your payment request has been sent to the cashier. Please proceed to the counter to complete your payment.');
            })
            .catch(error => {
                console.error('Error processing payment:', error);
                alert('Error processing payment. Please try again or pay at the cashier.');
            });
        } else {
            // If customer wants to pay at cashier, just acknowledge
            alert('Thank you! Please pay at the cashier when you\'re done with your meal.');
        }
    });
    
    // Real-time menu updates (for instant menu changes)
    function listenForMenuUpdates() {
        const menuRef = database.ref('menu');
        
        menuRef.on('child_changed', (snapshot) => {
            const category = snapshot.key;
            const categoryData = snapshot.val();
            
            // Determine which container to update
            let container;
            switch (category) {
                case 'starters':
                    container = startersContainer;
                    break;
                case 'mains':
                    container = mainsContainer;
                    break;
                case 'desserts':
                    container = dessertsContainer;
                    break;
                case 'drinks':
                    container = drinksContainer;
                    break;
                default:
                    return;
            }
            
            // Clear container
            container.innerHTML = '';
            
            // Add updated items
            Object.keys(categoryData).forEach(key => {
                const item = categoryData[key];
                container.appendChild(createMenuItemCard(key, item));
            });
        });
    }
    
    // Start listening for menu updates
    listenForMenuUpdates();
});