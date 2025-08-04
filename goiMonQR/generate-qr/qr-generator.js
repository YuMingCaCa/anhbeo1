import { db } from '../../js/firebase.js';
import { restaurantId, restaurantName } from '../../../js/config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    const qrContainer = document.getElementById('qr-container');
    const loadingMessage = document.getElementById('loading-message');
    document.getElementById('main-title').textContent = `Mã QR Cho ${restaurantName}`;

    try {
        // 1. Lấy danh sách bàn từ Firestore
        const tablesCollectionRef = collection(db, 'restaurants', restaurantId, 'tables');
        const q = query(tablesCollectionRef, orderBy('ten_ban'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loadingMessage.textContent = 'Không tìm thấy bàn nào. Vui lòng thêm bàn trong Dashboard.';
            return;
        }

        loadingMessage.style.display = 'none';

        // 2. Xác định URL gốc của trang gọi món
        const currentUrl = window.location.href;
        const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/generate-qr/'));
        const orderPageUrl = `${baseUrl}/index.html`;

        // 3. Lặp qua từng bàn và tạo mã QR
        querySnapshot.forEach(doc => {
            const table = doc.data();
            const tableName = table.ten_ban;
            const fullUrl = `${orderPageUrl}?table=${encodeURIComponent(tableName)}`;

            const card = document.createElement('div');
            card.className = 'qr-card flex flex-col items-center justify-center gap-4';

            const qrCodeDiv = document.createElement('div');
            card.appendChild(qrCodeDiv);
            card.innerHTML += `<h3 class="text-2xl font-bold">${tableName}</h3>`;
            qrContainer.appendChild(card);

            new QRCode(qrCodeDiv, { text: fullUrl, width: 200, height: 200 });
        });

    } catch (error) {
        console.error("Lỗi khi tạo mã QR:", error);
        loadingMessage.textContent = 'Đã có lỗi xảy ra khi tải dữ liệu bàn.';
    }
});