// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwCAHYDf4GvOEXAH01LbzOF8IQamnBtQU",  // Replace this with a new restricted key
  authDomain: "restraunt-ordering-sys.firebaseapp.com",
  projectId: "restraunt-ordering-sys",
  storageBucket: "restraunt-ordering-sys.appspot.com",  // Fixed this
  messagingSenderId: "800176717696",
  appId: "1:800176717696:web:f46757cbf8b4502a490b65",
  measurementId: "G-3K4KH81Z0N"
};
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Get a reference to the database service
  const database = firebase.database();
  
  // Check connection status
  const connectedRef = database.ref('.info/connected');
  connectedRef.on('value', (snap) => {
    if (snap.val() === true) {
      console.log('Connected to Firebase');
      document.querySelectorAll('.firebase-status-indicator').forEach(el => {
        el.classList.remove('offline');
        el.classList.add('online');
        el.setAttribute('title', 'Connected to database');
      });
    } else {
      console.log('Not connected to Firebase');
      document.querySelectorAll('.firebase-status-indicator').forEach(el => {
        el.classList.remove('online');
        el.classList.add('offline');
        el.setAttribute('title', 'Not connected to database');
      });
    }
  });
  
  // Database structure validation
  function validateStructure(data, structure) {
    for (const key in structure) {
      if (structure[key] === 'required' && !data.hasOwnProperty(key)) {
        return false;
      }
    }
    return true;
  }
  
  // Order validator schema
  const orderSchema = {
    table: 'required',
    items: 'required',
    status: 'required',
    timestamp: 'required',
    total: 'required'
  };
  
  // Push validated order
  function pushValidatedOrder(order) {
    return new Promise((resolve, reject) => {
      // Validate order structure
      if (!validateStructure(order, orderSchema)) {
        reject(new Error('Invalid order structure'));
        return;
      }
      
      // Push order to Firebase
      const ordersRef = database.ref('orders');
      const newOrderRef = ordersRef.push();
      
      newOrderRef.set(order)
        .then(() => {
          resolve(newOrderRef.key);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
  
  // Check if menu items exist, if not, initialize with sample data
  function initializeMenuItems() {
    const menuRef = database.ref('menu');
    
    menuRef.once('value', (snapshot) => {
      if (!snapshot.exists()) {
        // Sample menu data
        const sampleMenu = {
          starters: {
            item1: {
              name: "Garlic Bread",
              description: "Freshly baked bread with garlic butter",
              price: 4.99,
              image: "https://via.placeholder.com/150?text=Garlic+Bread",
              category: "starters",
              available: true,
              allergens: ["gluten", "dairy"],
              vegetarian: true
            },
            item2: {
              name: "Mozzarella Sticks",
              description: "Crispy breaded mozzarella with marinara sauce",
              price: 6.99,
              image: "https://via.placeholder.com/150?text=Mozzarella+Sticks",
              category: "starters",
              available: true,
              allergens: ["gluten", "dairy"],
              vegetarian: true
            },
            item3: {
              name: "Caesar Salad",
              description: "Fresh romaine lettuce with Caesar dressing",
              price: 7.99,
              image: "https://via.placeholder.com/150?text=Caesar+Salad",
              category: "starters",
              available: true,
              allergens: ["dairy", "eggs"],
              vegetarian: true
            }
          },
          mains: {
            item1: {
              name: "Margherita Pizza",
              description: "Classic pizza with tomatoes, mozzarella and basil",
              price: 12.99,
              image: "https://via.placeholder.com/150?text=Margherita+Pizza",
              category: "mains",
              available: true,
              allergens: ["gluten", "dairy"],
              vegetarian: true
            },
            item2: {
              name: "Spaghetti Bolognese",
              description: "Spaghetti with rich meat sauce",
              price: 14.99,
              image: "https://via.placeholder.com/150?text=Spaghetti+Bolognese",
              category: "mains",
              available: true,
              allergens: ["gluten", "dairy"],
              vegetarian: false
            },
            item3: {
              name: "Grilled Salmon",
              description: "Fresh salmon with seasonal vegetables",
              price: 18.99,
              image: "https://via.placeholder.com/150?text=Grilled+Salmon",
              category: "mains",
              available: true,
              allergens: ["fish"],
              vegetarian: false
            }
          },
          desserts: {
            item1: {
              name: "Tiramisu",
              description: "Classic Italian dessert with coffee and mascarpone",
              price: 6.99,
              image: "https://via.placeholder.com/150?text=Tiramisu",
              category: "desserts",
              available: true,
              allergens: ["dairy", "eggs", "gluten"],
              vegetarian: true
            },
            item2: {
              name: "Chocolate Cake",
              description: "Rich chocolate cake with ganache",
              price: 5.99,
              image: "https://via.placeholder.com/150?text=Chocolate+Cake",
              category: "desserts",
              available: true,
              allergens: ["dairy", "eggs", "gluten"],
              vegetarian: true
            }
          },
          drinks: {
            item1: {
              name: "House Wine",
              description: "Red or white wine, glass",
              price: 7.99,
              image: "https://via.placeholder.com/150?text=House+Wine",
              category: "drinks",
              available: true,
              allergens: ["sulfites"],
              vegetarian: true,
              alcoholic: true
            },
            item2: {
              name: "Soft Drink",
              description: "Cola, lemon, orange",
              price: 2.99,
              image: "https://via.placeholder.com/150?text=Soft+Drink",
              category: "drinks",
              available: true,
              allergens: [],
              vegetarian: true,
              alcoholic: false
            },
            item3: {
              name: "Sparkling Water",
              description: "500ml bottle",
              price: 3.49,
              image: "https://via.placeholder.com/150?text=Sparkling+Water",
              category: "drinks",
              available: true,
              allergens: [],
              vegetarian: true,
              alcoholic: false
            }
          }
        };
        
        // Set the sample menu data
        menuRef.set(sampleMenu);
        
        // Also initialize other required database nodes
        database.ref('settings').set({
          restaurantName: "Restaurant Name",
          restaurantAddress: "123 Main St, City",
          restaurantPhone: "(123) 456-7890",
          taxRate: 10, // 10%
          serviceCharge: 0, // 0%
          orderNumberPrefix: "ORD-"
        });
        
        // Initialize categories
        database.ref('categories').set({
          starters: {
            name: "Starters",
            order: 1
          },
          mains: {
            name: "Main Courses",
            order: 2
          },
          desserts: {
            name: "Desserts",
            order: 3
          },
          drinks: {
            name: "Drinks",
            order: 4
          }
        });
      }
    });
  }
  
  // Initialize the database with sample data
  initializeMenuItems();
  
  // Data backup function
  function backupDatabase() {
    // Get all data
    return database.ref('/').once('value')
      .then(snapshot => {
        const data = snapshot.val();
        // Create a backup JSON string
        const backupJSON = JSON.stringify(data);
        // Create a Blob
        const blob = new Blob([backupJSON], { type: 'application/json' });
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `restaurant_data_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      })
      .catch(error => {
        console.error('Backup failed:', error);
        return false;
      });
  }
  
  // Restore database from JSON file
  function restoreDatabase(jsonFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          // Write to database
          database.ref('/').set(data)
            .then(() => {
              resolve(true);
            })
            .catch(error => {
              reject(error);
            });
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = function() {
        reject(new Error('Error reading file'));
      };
      reader.readAsText(jsonFile);
    });
  }
  
  // Export helper functions
  window.restaurantApp = {
    backupDatabase,
    restoreDatabase,
    pushValidatedOrder
  };
