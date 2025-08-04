// d:/1 HE THONG WEB/TestQuan/js/firebase.js
// Đây là tệp khởi tạo Firebase DUY NHẤT cho toàn bộ dự án.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// QUAN TRỌNG: Đây là nơi duy nhất chứa cấu hình Firebase.
// Để bảo mật, bạn nên sử dụng Firebase App Check và thiết lập biến môi trường
// thay vì để API key trực tiếp trong code.
const firebaseConfig = {
    apiKey: "AIzaSyDosCykP-rrTVAlwfAOXDGgGioxtt-VrOs",
    authDomain: "quanlykinhdoanh-cb2b1.firebaseapp.com",
    projectId: "quanlykinhdoanh-cb2b1",
    storageBucket: "quanlykinhdoanh-cb2b1.firebasestorage.app",
    messagingSenderId: "478736931655",
    appId: "1:478736931655:web:b216ac919d9aeca334ca62"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };