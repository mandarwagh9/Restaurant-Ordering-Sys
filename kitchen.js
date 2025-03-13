document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const ordersContainer = document.getElementById('ordersContainer');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    const orderFilter = document.getElementById('orderFilter');
    const newOrderSound = document.getElementById('newOrderSound');
    
    // Orders collection and tracking
    let orders = {};
    let lastOrderTimestamp = Date.now();
    
    // Load orders from Firebase
    function loadOrders() {
        database.ref('orders').orderByChild('timestamp').on('value', (snapshot) => {
            // Clear existing orders
            orders = {};
            
            // Process new data
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                orders[order.orderId] = order;
            });
            
            // Render orders
            renderOrders();
            
            // Check for new orders to play sound
            const latestOrder = getLatestOrder();
            if (latestOrder && latestOrder.timestamp > lastOrderTimestamp && latestOrder.status === 'new') {
                playNewOrderSound();
                lastOrderTimestamp = latestOrder.timestamp;
            }
        });
    }
    
    // Get latest order by timestamp
    function getLatestOrder() {
        let latestOrder = null;
        let latestTimestamp = 0;
        
        for (const orderId in orders) {
            if (orders[orderId].timestamp > latestTimestamp) {
                latestOrder = orders[orderId];
                latestTimestamp = orders[orderId].timestamp;
            }
        }
        
        return latestOrder;
    }
    
    // Play new order sound
    function playNewOrderSound() {
        newOrderSound.play().catch(error => {
            console.log("Audio playback failed:", error);
        });
    }
    
    // Render orders based on filter
    function renderOrders() {
        // Clear orders container
        ordersContainer.innerHTML = '';
        
        // Get selected filter
        const filterValue = orderFilter.value;
        
        // Sort orders by timestamp (newest first)
        const sortedOrders = Object.values(orders).sort((a, b) => b.timestamp - a.timestamp);
        
        // Filter orders
        const filteredOrders = filterValue === 'all' 
            ? sortedOrders 
            : sortedOrders.filter(order => order.status === filterValue);
        
        // Check if there are orders to display
        if (filteredOrders.length === 0) {
            noOrdersMessage.style.display = 'block';
        } else {
            noOrdersMessage.style.display = 'none';
            
            // Render each order
            filteredOrders.forEach(order => {
                renderOrderCard(order);
            });
        }
    }
    
    // Render a single order card
    function renderOrderCard(order) {
        const orderCard = document.createElement('div');
        orderCard.className = `card mb-3 kitchen-order ${order.status}`;
        
        // Format timestamp
        const orderDate = new Date(order.timestamp);
        const formattedTime = orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Create order header
        const orderHeader = document.createElement('div');
        orderHeader.className = 'card-header d-flex justify-content-between align-items-center';
        orderHeader.innerHTML = `
            <div>
                <h5 class="mb-0">Order #${order.orderId.slice(-6)}</h5>
                <small class="text-muted">Table ${order.tableNumber} - ${formattedTime}</small>
            </div>
            <div class="badge bg-${getStatusBadgeColor(order.status)}">${capitalizeFirstLetter(order.status)}</div>
        `;
        
        // Create order body
        const orderBody = document.createElement('div');
        orderBody.className = 'card-body';
        
        // Create items list
        const itemsList = document.createElement('ul');
        itemsList.className = 'list-group mb-3';
        
        order.items.forEach(item => {
            const itemElement = document.createElement('li');
            itemElement.className = 'list-group-item d-flex justify-content-between align-items-center';
            itemElement.innerHTML = `
                <div>
                    <h6 class="mb-0">${item.name}</h6>
                    <small class="text-muted">${item.description}</small>
                </div>
                <span class="badge bg-secondary rounded-pill">${item.quantity}</span>
            `;
            itemsList.appendChild(itemElement);
        });
        
        orderBody.appendChild(itemsList);
        
        // Create action buttons
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        switch(order.status) {
            case 'new':
                actionButtons.innerHTML = `
                    <button class="btn btn-warning prepare-btn" data-order-id="${order.orderId}">
                        Start Preparing
                    </button>
                `;
                break;
            case 'preparing':
                actionButtons.innerHTML = `
                    <button class="btn btn-primary ready-btn" data-order-id="${order.orderId}">
                        Mark as Ready
                    </button>
                `;
                break;
            case 'ready':
                actionButtons.innerHTML = `
                    <button class="btn btn-success serve-btn" data-order-id="${order.orderId}" disabled>
                        Waiting for Serving
                    </button>
                `;
                break;
            case 'served':
                actionButtons.innerHTML = `
                    <button class="btn btn-outline-success" disabled>
                        Order Served
                    </button>
                `;
                break;
        }
        
        orderBody.appendChild(actionButtons);
        
        // Assemble order card
        orderCard.appendChild(orderHeader);
        orderCard.appendChild(orderBody);
        
        // Add button event listeners
        if (order.status === 'new') {
            const prepareBtn = orderCard.querySelector('.prepare-btn');
            prepareBtn.addEventListener('click', function() {
                updateOrderStatus(this.getAttribute('data-order-id'), 'preparing');
            });
        } else if (order.status === 'preparing') {
            const readyBtn = orderCard.querySelector('.ready-btn');
            readyBtn.addEventListener('click', function() {
                updateOrderStatus(this.getAttribute('data-order-id'), 'ready');
            });
        }
        
        // Add order card to container
        ordersContainer.appendChild(orderCard);
    }
    
    // Update order status
    function updateOrderStatus(orderId, newStatus) {
        database.ref('orders/' + orderId).update({
            status: newStatus
        })
        .catch((error) => {
            console.error("Error updating order status:", error);
            alert("Failed to update order status. Please try again.");
        });
    }
    
    // Helper function to get badge color based on status
    function getStatusBadgeColor(status) {
        switch(status) {
            case 'new':
                return 'danger';
            case 'preparing':
                return 'warning';
            case 'ready':
                return 'primary';
            case 'served':
                return 'success';
            default:
                return 'secondary';
        }
    }
    
    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Filter change event
    orderFilter.addEventListener('change', renderOrders);
    
    // Initialize orders
    loadOrders();
});