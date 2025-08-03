// js/config.js
// Thay đổi các giá trị này để thiết lập cho một nhà hàng mới.
// QUAN TRỌNG: restaurantId phải là duy nhất, không dấu, không khoảng trắng, viết liền.
// Ví dụ cho quán mới:
// export const restaurantId = 'pho-gia-truyen';
// export const restaurantName = 'Phở Gia Truyền';
export const restaurantId = 'anhbeoquan'; // <-- THAY MÃ ĐỊNH DANH QUÁN MỚI VÀO ĐÂY
export const restaurantName = 'Quán Anh Béo'; // <-- THAY TÊN QUÁN MỚI VÀO ĐÂY

// Cấu hình BASE_URL cho việc triển khai trên GitHub Pages hoặc các môi trường khác.
// Khi chạy cục bộ (ví dụ với Live Server), giữ nguyên là ''.
// Khi triển khai lên GitHub Pages, thay đổi thành '/tên_repository_của_bạn' (ví dụ: '/TestQuan').
export const BASE_URL = '/anhbeo1'; // <-- QUAN TRỌNG: Đã cập nhật cho GitHub Pages. Nếu tên repo khác, hãy sửa lại.
