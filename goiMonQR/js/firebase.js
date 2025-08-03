import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDosCykP-rrTVAlwfAOXDGgGioxtt-VrOs", // **LƯU Ý BẢO MẬT**: Nên dùng biến môi trường
    authDomain: "quanlykinhdoanh-cb2b1.firebaseapp.com",
    projectId: "quanlykinhdoanh-cb2b1",
    storageBucket: "quanlykinhdoanh-cb2b1.firebasestorage.app",
    messagingSenderId: "478736931655",
    appId: "1:478736931655:web:b216ac919d9aeca334ca62"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };