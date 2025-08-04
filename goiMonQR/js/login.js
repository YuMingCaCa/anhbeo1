import { auth } from '../../js/firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginTriggerBtn = document.getElementById('login-trigger-btn');
    const loginModal = document.getElementById('login-modal');
    const closeLoginModalBtn = document.getElementById('close-login-modal-btn');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const emailInputEl = document.getElementById('role'); // Giữ nguyên ID nhưng giờ đây là email
    const passwordInputEl = document.getElementById('password');

    // Hiển thị cửa sổ đăng nhập khi nhấn nút
    loginTriggerBtn.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        emailInputEl.focus();
    });

    // Hàm để ẩn cửa sổ đăng nhập
    const hideModal = () => {
        loginModal.classList.add('hidden');
        errorMessage.textContent = ''; // Xóa thông báo lỗi khi đóng
        loginForm.reset(); // Xóa dữ liệu đã nhập trong form
    };

    // Gán sự kiện cho nút đóng và nền mờ
    closeLoginModalBtn.addEventListener('click', hideModal);
    loginModal.addEventListener('click', (e) => {
        // Chỉ đóng khi nhấn vào vùng nền mờ bên ngoài
        if (e.target === loginModal) {
            hideModal();
        }
    });

    // Xử lý logic khi gửi form đăng nhập
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Ngăn form reload lại trang
        const emailInput = emailInputEl.value.trim();
        const passwordInput = passwordInputEl.value;

        errorMessage.textContent = ''; // Xóa lỗi cũ

        try {
            const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
            // Đăng nhập thành công, Firebase sẽ tự động quản lý phiên.
            // Chỉ cần chuyển hướng.
            console.log("Đăng nhập thành công:", userCredential.user.email);
            window.location.href = 'goiMonQR/dashboard/';
        } catch (error) {
            // Xử lý lỗi
            console.error("Lỗi đăng nhập:", error.code);
            // Cung cấp thông báo lỗi chung để tăng bảo mật
            errorMessage.textContent = 'Email hoặc mật khẩu không chính xác.';
        }
    });
});
