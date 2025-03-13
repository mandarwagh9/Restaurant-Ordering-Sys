// ✅ Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDwCAHYDf4GvOEXAH01LbzOF8IQamnBtQU",
  authDomain: "restraunt-ordering-sys.firebaseapp.com",
  databaseURL: "https://restraunt-ordering-sys-default-rtdb.firebaseio.com",
  projectId: "restraunt-ordering-sys",
  storageBucket: "restraunt-ordering-sys.firebasestorage.app",
  messagingSenderId: "800176717696",
  appId: "1:800176717696:web:f46757cbf8b4502a490b65",
  measurementId: "G-3K4KH81Z0N"
};

// ✅ Initialize Firebase (Avoid Duplicate Initialization)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // 🔄 Use existing Firebase instance
}

// ✅ Initialize Firebase Services
const database = firebase.database();   // Realtime Database
const auth = firebase.auth();           // Authentication

// ✅ Enable Anonymous Authentication
auth.signInAnonymously()
  .then(() => console.log("🔥 Signed in anonymously"))
  .catch(error => console.error("❌ Authentication error:", error));

// ✅ Handle Firebase Connection Status
firebase.database().ref(".info/connected").on("value", function(snapshot) {
  if (snapshot.val() === true) {
      console.log("✅ Connected to Firebase Realtime Database");
  } else {
      console.warn("⚠️ Not connected to Firebase");
  }
});

// ✅ Test Database Connection (Optional)
database.ref('test').set({ message: "Firebase is working!" })
  .then(() => console.log("✅ Test data written to database"))
  .catch(error => console.error("❌ Database error:", error));

// ✅ Firestore Test (Optional)
firestore.collection("test").add({ message: "Firestore is working!" })
  .then(() => console.log("✅ Test data written to Firestore"))
  .catch(error => console.error("❌ Firestore error:", error));
