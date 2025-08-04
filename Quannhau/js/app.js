// d:/1 HE THONG WEB/TestQuan/Quannhau/js/app.js

import { initBanHang, huyThanhToan, generateAndPrintInvoice } from './modules/banHang.js';
import { initNhapHang } from './modules/nhapHang.js';
import { initBaoCao, loadBaoCaoData } from './modules/baoCao.js';

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- LOGIC CHUYỂN TAB ---
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Bỏ qua nếu là link hướng dẫn
            if (e.currentTarget.tagName === 'A') return;

            e.preventDefault();

            // Bỏ active ở tất cả các tab và nội dung
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Active tab và nội dung được chọn
            tab.classList.add('active');
            const targetTabContent = document.getElementById(tab.dataset.tab);
            if (targetTabContent) {
                targetTabContent.classList.add('active');
            }

            // Tải dữ liệu cho tab báo cáo CHỈ KHI người dùng nhấn vào nó
            // Đây là một tối ưu để không tải dữ liệu nặng khi không cần thiết.
            if (tab.dataset.tab === 'tab-bao-cao') {
                loadBaoCaoData();
            }
        });
    });

    // --- KHỞI TẠO CÁC MODULE VÀ KẾT NỐI CHÚNG ---

    /**
     * Hàm callback này được truyền cho các module Bán Hàng và Nhập Kho.
     * Khi có một hành động làm thay đổi dữ liệu (thanh toán, nhập hàng mới),
     * nó sẽ được gọi để làm mới tab báo cáo nếu tab đó đang được mở.
     */
    const refreshBaoCaoIfNeeded = () => {
        if (document.getElementById('tab-bao-cao').classList.contains('active')) {
            loadBaoCaoData(); // Tải lại toàn bộ dữ liệu cho tab báo cáo
        }
    };

    // Khởi tạo các module và truyền các hàm cần thiết
    initBanHang(refreshBaoCaoIfNeeded);
    initNhapHang(refreshBaoCaoIfNeeded);
    initBaoCao({
        onCancelInvoice: huyThanhToan, // Truyền hàm hủy thanh toán từ banHang.js
        onPrintInvoice: generateAndPrintInvoice // Truyền hàm in hóa đơn từ banHang.js
    });
});

