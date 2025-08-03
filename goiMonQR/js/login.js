document.addEventListener('DOMContentLoaded', () => {
    // --- Mật khẩu mặc định ---
    // Chỉ còn một tài khoản duy nhất để vào trang Dashboard
    const LOGIN_CREDENTIALS = {
        // Ví dụ cho quán mới: 'phogia' : 'matkhau456'
        quanly: '123456' // <-- THAY TÊN ĐĂNG NHẬP VÀ MẬT KHẨU CHO QUÁN MỚI
    };
    // -------------------------

    const loginTriggerBtn = document.getElementById('login-trigger-btn');
    const loginModal = document.getElementById('login-modal');
    const closeLoginModalBtn = document.getElementById('close-login-modal-btn');
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const roleInputEl = document.getElementById('role');
    const passwordInputEl = document.getElementById('password');

    // Hiển thị cửa sổ đăng nhập khi nhấn nút
    loginTriggerBtn.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        roleInputEl.focus();
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
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Ngăn form reload lại trang
        const roleInput = roleInputEl.value.trim().toLowerCase();
        const passwordInput = passwordInputEl.value;

        errorMessage.textContent = ''; // Xóa lỗi cũ

        // Kiểm tra xem tên đăng nhập có tồn tại không
        if (LOGIN_CREDENTIALS.hasOwnProperty(roleInput)) {
            // Kiểm tra mật khẩu
            if (passwordInput === LOGIN_CREDENTIALS[roleInput]) {
                // Nếu đúng, chuyển hướng đến trang dashboard
                // Lưu trạng thái đã đăng nhập vào sessionStorage
                sessionStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'goiMonQR/dashboard/'; // Chuyển hướng đến thư mục dashboard một cách rõ ràng hơn
            } else {
                // Sai mật khẩu
                errorMessage.textContent = 'Mật khẩu không chính xác.';
            }
        } else {
            // Sai tên đăng nhập
            errorMessage.textContent = 'Tên đăng nhập không chính xác.';
        }
    });
});