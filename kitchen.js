document.addEventListener('DOMContentLoaded', function() {
    const ordersContainer = document.getElementById('ordersContainer');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    const orderFilter = document.getElementById('orderFilter');
    const newOrderSound = document.getElementById('newOrderSound');

    let orders = {}; // Store orders

    setupOrdersListener();

    orderFilter.addEventListener('change', function() {
        displayOrders();
    });

    function setupOrdersListener() {
        const ordersRef = database.ref('orders');
        ordersRef.off(); // Remove previous listeners to avoid duplicates

        ordersRef.on('child_added', (snapshot) => {
            const order = snapshot.val();
            const orderId = snapshot.key;

            order.id = orderId;
            orders[orderId] = order;

            if (order.status === 'new') {
                newOrderSound.play().catch(error => console.warn("Audio blocked:", error));
            }

            displayOrders();
        });

        ordersRef.on('child_changed', (snapshot) => {
            const updatedOrder = snapshot.val();
            updatedOrder.id = snapshot.key;
            orders[updatedOrder.id] = updatedOrder;
            displayOrders();
        });

        ordersRef.on('child_removed', (snapshot) => {
            delete orders[snapshot.key];
            displayOrders();
        });
    }

    function displayOrders() {
        ordersContainer.innerHTML = '';

        const filterValue = orderFilter.value;
        const filteredOrders = Object.values(orders)
            .filter(order => filterValue === 'all' || order.status === filterValue)
            .sort((a, b) => b.timestamp - a.timestamp);

        if (noOrdersMessage) {
            noOrdersMessage.style.display = filteredOrders.length === 0 ? 'block' : 'none';
        }

        filteredOrders.forEach(order => {
            ordersContainer.appendChild(createOrderElement(order));
        });
    }

    function createOrderElement(order) {
        const orderElement = document.createElement('div');
        orderElement.className = `card mb-3 kitchen-order ${order.status}`;

        const orderTime = new Date(order.timestamp);
        const formattedTime = orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let itemsContent = '<div class="card-body"><h6>Items:</h6><ul class="list-group mb-3">';
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                itemsContent += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${item.name} (${item.category})</span>
                        <span class="badge bg-primary rounded-pill">x${item.quantity}</span>
                    </li>
                `;
            });
        } else {
            itemsContent += `<p class="text-muted">No items found</p>`;
        }
        itemsContent += '</ul></div>';

        let actionButtons = '';
        if (order.status === 'new') {
            actionButtons = `<button class="btn btn-primary" onclick="updateOrderStatus('${order.id}', 'preparing')">Start Preparing</button>`;
        } else if (order.status === 'preparing') {
            actionButtons = `<button class="btn btn-info text-white" onclick="updateOrderStatus('${order.id}', 'ready')">Mark as Ready</button>`;
        } else if (order.status === 'ready') {
            actionButtons = `<button class="btn btn-success" disabled>Ready for Service</button>`;
        } else if (order.status === 'served') {
            actionButtons = `<button class="btn btn-success" disabled>Served</button>`;
        }

        let statusBadge = `<span class="badge bg-${order.status === 'new' ? 'danger' : 
                                                    order.status === 'preparing' ? 'warning text-dark' :
                                                    order.status === 'ready' ? 'primary' : 
                                                    'success'} ms-2">${order.status}</span>`;

        orderElement.innerHTML = `
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Table #${order.table} - Order #${order.id.substring(0, 8)}</h5>
                <span class="badge bg-dark">${formattedTime}</span>
            </div>
            ${itemsContent}
            <div class="card-footer bg-light d-flex justify-content-between align-items-center">
                <div>Status: ${statusBadge}</div>
                ${actionButtons}
            </div>
        `;

        return orderElement;
    }

    window.updateOrderStatus = function(orderId, newStatus) {
        database.ref('orders/' + orderId).update({ status: newStatus }).catch(error => {
            console.error('Error updating order status:', error);
            alert('Error updating order. Try again.');
        });
    };
});
