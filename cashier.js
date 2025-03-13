document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const activeOrdersContainer = document.getElementById('activeOrdersContainer');
    const noActiveOrdersMessage = document.getElementById('noActiveOrdersMessage');
    const tableStatusContainer = document.getElementById('tableStatusContainer');
    const noTablesMessage = document.getElementById('noTablesMessage');
    const tableFilter = document.getElementById('tableFilter');
    const totalOrders = document.getElementById('totalOrders');
    const totalRevenue = document.getElementById('totalRevenue');
    const avgOrderValue = document.getElementById('avgOrderValue');

    // Payment modal elements
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    
    // Store orders and tables
    let orders = {};
    let tables = {};

    // Initialize Firebase orders listener
    setupOrdersListener();

    // Listen for table filter changes
    tableFilter.addEventListener('change', displayActiveOrders);

    function setupOrdersListener() {
        const ordersRef = database.ref('orders');

        ordersRef.on('child_added', (snapshot) => {
            const order = snapshot.val();
            order.id = snapshot.key;
            orders[order.id] = order;
            updateTableStatus(order.table, order);
            updateDailySummary();
            updateTableFilter();
            displayActiveOrders();
            displayTableStatus();
        });

        ordersRef.on('child_changed', (snapshot) => {
            const updatedOrder = snapshot.val();
            updatedOrder.id = snapshot.key;
            orders[updatedOrder.id] = updatedOrder;
            updateTableStatus(updatedOrder.table, updatedOrder);
            updateDailySummary();
            displayActiveOrders();
            displayTableStatus();
        });

        ordersRef.on('child_removed', (snapshot) => {
            const orderId = snapshot.key;
            const tableNumber = orders[orderId].table;
            delete orders[orderId];
            updateTableStatus(tableNumber);
            updateDailySummary();
            updateTableFilter();
            displayActiveOrders();
            displayTableStatus();
        });
    }

    // Update daily summary with completed orders
    function updateDailySummary() {
        let orderCount = 0;
        let revenue = 0;

        Object.values(orders).forEach(order => {
            if (order.status === 'completed') {
                orderCount++;
                revenue += order.total;
            }
        });

        totalOrders.textContent = orderCount;
        totalRevenue.textContent = `$${revenue.toFixed(2)}`;
        avgOrderValue.textContent = orderCount > 0 ? `$${(revenue / orderCount).toFixed(2)}` : '$0.00';
    }

    // Update table status
    function updateTableStatus(tableNumber, order) {
        if (!tables[tableNumber]) {
            tables[tableNumber] = { orders: {}, activeOrderCount: 0 };
        }

        const tableOrders = Object.values(orders).filter(o => o.table === tableNumber);
        tables[tableNumber].orders = {};
        tables[tableNumber].activeOrderCount = 0;

        tableOrders.forEach(o => {
            if (o.status !== 'completed') {
                tables[tableNumber].orders[o.id] = o;
                tables[tableNumber].activeOrderCount++;
            }
        });

        if (tables[tableNumber].activeOrderCount === 0) {
            delete tables[tableNumber];
        }
    }

    // Update table filter options
    function updateTableFilter() {
        const currentSelection = tableFilter.value;
        while (tableFilter.options.length > 1) {
            tableFilter.remove(1);
        }

        Object.keys(tables).sort((a, b) => a - b).forEach(tableNum => {
            const option = document.createElement('option');
            option.value = tableNum;
            option.textContent = `Table ${tableNum}`;
            tableFilter.appendChild(option);
        });

        tableFilter.value = currentSelection !== 'all' && tables[currentSelection] ? currentSelection : 'all';
    }

    // Display active orders
    function displayActiveOrders() {
        activeOrdersContainer.innerHTML = '';
        const filterValue = tableFilter.value;

        const activeOrders = Object.values(orders)
            .filter(order => order.status !== 'completed' && (filterValue === 'all' || order.table.toString() === filterValue))
            .sort((a, b) => b.timestamp - a.timestamp);

        noActiveOrdersMessage.style.display = activeOrders.length === 0 ? 'block' : 'none';

        activeOrders.forEach(order => {
            activeOrdersContainer.appendChild(createOrderElement(order));
        });
    }

    // Create an order element
    function createOrderElement(order) {
        const orderElement = document.createElement('div');
        orderElement.className = `card mb-3 order-card`;

        const formattedTime = new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let statusBadge = '';
        if (order.status === 'new') statusBadge = '<span class="badge bg-danger">New</span>';
        else if (order.status === 'preparing') statusBadge = '<span class="badge bg-warning text-dark">Preparing</span>';
        else if (order.status === 'ready') statusBadge = '<span class="badge bg-primary">Ready</span>';
        else if (order.status === 'served') statusBadge = '<span class="badge bg-success">Served</span>';

        orderElement.innerHTML = `
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Table #${order.table} - Order #${order.id.substring(0, 8)}</h5>
                <div>
                    ${statusBadge}
                    <span class="badge bg-dark ms-2">${formattedTime}</span>
                </div>
            </div>
            <div class="card-body">
                <h6>Items:</h6>
                <ul class="list-group mb-3">
                    ${order.items.map(item => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>${item.name}</span>
                            <span>
                                $${item.price.toFixed(2)} x ${item.quantity}
                                <span class="ms-2 badge bg-secondary rounded-pill">$${(item.price * item.quantity).toFixed(2)}</span>
                            </span>
                        </li>
                    `).join('')}
                </ul>
                <div class="d-flex justify-content-between">
                    <h6>Total:</h6>
                    <h6>$${order.total.toFixed(2)}</h6>
                </div>
            </div>
        `;

        return orderElement;
    }

    // Display table status
    function displayTableStatus() {
        tableStatusContainer.innerHTML = '';
        Object.keys(tables).forEach(tableNum => {
            const table = tables[tableNum];
            const tableElement = document.createElement('div');
            tableElement.className = 'table-status-card';
            tableElement.innerHTML = `
                <h6>Table #${tableNum}</h6>
                <p>Active Orders: ${table.activeOrderCount}</p>
            `;
            tableStatusContainer.appendChild(tableElement);
        });

        noTablesMessage.style.display = Object.keys(tables).length === 0 ? 'block' : 'none';
    }
});
