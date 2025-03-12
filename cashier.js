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
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    
    // Payment modal elements
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    const modalTableNumber = document.getElementById('modalTableNumber');
    const modalOrderNumber = document.getElementById('modalOrderNumber');
    const modalOrderItems = document.getElementById('modalOrderItems');
    const modalSubtotal = document.getElementById('modalSubtotal');
    const modalTax = document.getElementById('modalTax');
    const modalTotal = document.getElementById('modalTotal');
    const completePaymentBtn = document.getElementById('completePaymentBtn');
    
    // Store orders and tables
    let orders = {};
    let tables = {};
    let currentOrderId = null;
    
    // Initialize
    setupOrdersListener();
    
    // Listen for table filter changes
    tableFilter.addEventListener('change', function() {
        displayActiveOrders();
    });
    
    // Setup Firebase orders listener
    function setupOrdersListener() {
        const ordersRef = database.ref('orders');
        
        // Listen for new orders
        ordersRef.on('child_added', (snapshot) => {
            const order = snapshot.val();
            const orderId = snapshot.key;
            
            // Add order to local storage
            order.id = orderId;
            orders[orderId] = order;
            
            // Update tables
            updateTableStatus(order.table, order);
            
            // Update daily summary
            updateDailySummary();
            
            // Update table filter options
            updateTableFilter();
            
            // Update the display
            displayActiveOrders();
            displayTableStatus();
        });
        
        // Listen for order changes
        ordersRef.on('child_changed', (snapshot) => {
            const updatedOrder = snapshot.val();
            const orderId = snapshot.key;
            
            // Update order in local storage
            updatedOrder.id = orderId;
            orders[orderId] = updatedOrder;
            
            // Update tables
            updateTableStatus(updatedOrder.table, updatedOrder);
            
            // Update daily summary
            updateDailySummary();
            
            // Update the display
            displayActiveOrders();
            displayTableStatus();
        });
        
        // Listen for order removals
        ordersRef.on('child_removed', (snapshot) => {
            const orderId = snapshot.key;
            const tableNumber = orders[orderId].table;
            
            // Remove order from local storage
            delete orders[orderId];
            
            // Update tables
            updateTableStatus(tableNumber);
            
            // Update daily summary
            updateDailySummary();
            
            // Update table filter options
            updateTableFilter();
            
            // Update the display
            displayActiveOrders();
            displayTableStatus();
        });
    }
    
    // Update table status
    function updateTableStatus(tableNumber, order) {
        // Initialize table if not exists
        if (!tables[tableNumber]) {
            tables[tableNumber] = {
                orders: {},
                activeOrderCount: 0
            };
        }
        
        // Get table's orders
        const tableOrders = Object.values(orders).filter(o => o.table === tableNumber);
        
        // Update table with active orders
        tables[tableNumber].orders = {};
        tables[tableNumber].activeOrderCount = 0;
        
        tableOrders.forEach(o => {
            if (o.status !== 'completed') {
                tables[tableNumber].orders[o.id] = o;
                tables[tableNumber].activeOrderCount++;
            }
        });
        
        // Remove table if no orders
        if (tables[tableNumber].activeOrderCount === 0) {
            delete tables[tableNumber];
        }
    }
    
    // Update table filter options
    function updateTableFilter() {
        // Save current selection
        const currentSelection = tableFilter.value;
        
        // Clear options except 'All Tables'
        while (tableFilter.options.length > 1) {
            tableFilter.remove(1);
        }
        
        // Add table options
        const tableNumbers = Object.keys(tables).sort((a, b) => a - b);
        
        tableNumbers.forEach(tableNum => {
            const option = document.createElement('option');
            option.value = tableNum;
            option.textContent = `Table ${tableNum}`;
            tableFilter.appendChild(option);
        });
        
        // Restore selection if it still exists
        if (currentSelection !== 'all' && tableNumbers.includes(currentSelection)) {
            tableFilter.value = currentSelection;
        } else {
            tableFilter.value = 'all';
        }
    }
    
    // Display active orders
    function displayActiveOrders() {
        // Clear existing orders
        activeOrdersContainer.innerHTML = '';
        
        // Get selected filter
        const filterValue = tableFilter.value;
        
        // Filter active orders
        const activeOrders = Object.values(orders)
            .filter(order => order.status !== 'completed' &&
                            (filterValue === 'all' || order.table.toString() === filterValue))
            .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
        
        // Show no orders message if needed
        if (activeOrders.length === 0) {
            noActiveOrdersMessage.style.display = 'block';
            return;
        } else {
            noActiveOrdersMessage.style.display = 'none';
        }
        
        // Display each order
        activeOrders.forEach(order => {
            const orderElement = createOrderElement(order);
            activeOrdersContainer.appendChild(orderElement);
        });
    }
    
    // Create an order element for cashier view
    function createOrderElement(order) {
        const orderElement = document.createElement('div');
        orderElement.className = `card mb-3 order-card`;
        
        // Format time
        const orderTime = new Date(order.timestamp);
        const formattedTime = orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Get status badge
        let statusBadge = '';
        if (order.status === 'new') {
            statusBadge = '<span class="badge bg-danger">New</span>';
        } else if (order.status === 'preparing') {
            statusBadge = '<span class="badge bg-warning text-dark">Preparing</span>';
        } else if (order.status === 'ready') {
            statusBadge = '<span class="badge bg-primary">Ready</span>';
        } else if (order.status === 'served') {
            statusBadge = '<span class="badge bg-success">Served</span>';
        }
        
        // Create header content
        let headerContent = `
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                    Table #${order.table} - Order #${order.id.substring(0, 8)}
                </h5>
                <div>
                    ${statusBadge}
                    <span class="badge bg-dark ms-2">${formattedTime}</span>
                </div>
            </div>
        `;
        
        // Create order items content
        let itemsContent = '<div class="card-body"><h6>Items:</h6><ul class="list-group mb-3">';
        
        order.items.forEach(item => {
            itemsContent += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${item.name}</span>
                    <span>
                        $${item.price.toFixed(2)} x ${item.quantity}
                        <span class="ms-2 badge bg-secondary rounded-pill">$${(item.price * item.quantity).toFixed(2)}</span>
                    </span>
                </li>
            `;
        });
        
        itemsContent += `</ul>
            <div class="d-flex justify-content-between">
                <h6>Total:</h6>
                <h6>$${order.total.toFixed(2)}</h6>
            </div>
        `;
        
        // Create action buttons based on current status
        let actionButtons = '';
        
        if (order.status === 'ready') {
            actionButtons = `
                <button class="btn btn-primary" onclick="markAsServed('${order.id}')">
                    Mark as Served
                </button>
            `;
        } else if (order.status === 'served') {
            if (order.paid) {
                actionButtons = `
                    <button class="btn btn-success" disabled>
                        Paid
                    </button>
                    <button class="btn btn-secondary" onclick="markAsCompleted('${order.id}')">
                        Complete Order
                    </button>
                `;
            } else {
                actionButtons = `
                    <button class="btn btn-warning" onclick="openPaymentModal('${order.id}')">
                        Process Payment
                    </button>
                `;
            }
        }
        
        // Create footer with action buttons
        const footerContent = `
            <div class="card-footer bg-light d-flex justify-content-end">
                ${actionButtons}
            </div>
        `;
        
        // Set the full content
        orderElement.innerHTML = headerContent + itemsContent + '</div>' + footerContent;
        
        return orderElement;
    }
    
    // Display table status
    function displayTableStatus() {
        // Clear existing table status
        tableStatusContainer.innerHTML = '';
        
        // Show no tables message if needed
        if (Object.keys(tables).length === 0) {
            noTablesMessage.style.display = 'block';
            return;
        } else {
            noTablesMessage.style.display = 'none';
        }
        
        // Get sorted table numbers
        const tableNumbers = Object.keys(tables).sort((a, b) => a - b);
        
        // Display each table
        tableNumbers.forEach(tableNum => {
            const tableData = tables[tableNum];
            const tableElement = createTableElement(tableNum, tableData);
            tableStatusContainer.appendChild(tableElement);
        });
    }
    
    // Create a table element
    function createTableElement(tableNum, tableData) {
        const tableElement = document.createElement('div');
        tableElement.className = 'card mb-3';
        
        // Count orders by status
        const ordersByStatus = {
            new: 0,
            preparing: 0,
            ready: 0,
            served: 0
        };
        
        Object.values(tableData.orders).forEach(order => {
            if (order.status in ordersByStatus) {
                ordersByStatus[order.status]++;
            }
        });
        
        // Calculate the latest order time
        let latestTimestamp = 0;
        Object.values(tableData.orders).forEach(order => {
            if (order.timestamp > latestTimestamp) {
                latestTimestamp = order.timestamp;
            }
        });
        const latestTime = new Date(latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Create content
        tableElement.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Table #${tableNum}</h5>
                    <span class="badge bg-info text-white">${latestTime}</span>
                </div>
                <div class="d-flex mt-2">
                    <span class="me-2">
                        <span class="badge bg-danger">${ordersByStatus.new}</span> New
                    </span>
                    <span class="me-2">
                        <span class="badge bg-warning text-dark">${ordersByStatus.preparing}</span> Preparing
                    </span>
                    <span class="me-2">
                        <span class="badge bg-primary">${ordersByStatus.ready}</span> Ready
                    </span>
                    <span class="me-2">
                        <span class="badge bg-success">${ordersByStatus.served}</span> Served
                    </span>
                </div>
            </div>
        `;
        
        return tableElement;
    }
    
    // Other functions and event listeners...
});