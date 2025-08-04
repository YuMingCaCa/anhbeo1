import { db } from '../../../js/firebase.js';
import {
    collection,
    doc,
    setDoc,
    onSnapshot,
    addDoc,
    deleteDoc,
    query,
    getDoc,
    runTransaction,
    serverTimestamp,
    getDocs,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { restaurantId, restaurantName } from '../../../js/config.js';
import { currencyFormatter } from '../utils/formatters.js';

// =================================================================
// --- CẤU HÌNH & KHAI BÁO ---
// =================================================================

// --- Lấy các phần tử HTML ---
const danhSachBanDiv = document.getElementById('danh-sach-ban');
const soBanHienTaiSpan = document.getElementById('so-ban-hien-tai');
const formOrderWrapper = document.getElementById('form-order-wrapper');
const formGoiMon = document.getElementById('form-goi-mon');
const selectMonAn = document.getElementById('select-mon-an');
const inputSoLuongMon = document.getElementById('so-luong-mon');
const bangChiTietMonBody = document.querySelector('#bang-chi-tiet-mon tbody');
const strongTamTinh = document.getElementById('tam-tinh');
const btnInHoaDon = document.getElementById('btn-in-hoa-don');
const btnThanhToan = document.getElementById('btn-thanh-toan');

// Biến trạng thái của module
let banDuocChon = null; // Lưu số của bàn đang được chọn, ví dụ: '1'
let donHangCuaCacBan = new Map(); // Lưu trạng thái tất cả các bàn đang có khách
let danhSachBanData = []; // Lưu danh sách tất cả các bàn
let toanBoThucDon = []; // Lưu toàn bộ thực đơn dạng [{id, name, price, ...}]

// =================================================================
// --- CÁC HÀM RENDER GIAO DIỆN ---
// =================================================================

/**
 * Vẽ lại toàn bộ lưới bàn ăn dựa trên trạng thái mới nhất.
 */
function renderLuoiBanAn() {
    danhSachBanDiv.innerHTML = ''; // Xóa các bàn cũ

    // CẢI TIẾN: Xử lý trường hợp chưa có bàn nào được thiết lập
    if (danhSachBanData.length === 0) {
        danhSachBanDiv.innerHTML = `<p class="no-tables-message">Chưa có bàn nào được thiết lập. Vui lòng vào <strong>Dashboard chính -> Quản Lý Bàn</strong> để thêm bàn.</p>`;
        return;
    }

    danhSachBanData.forEach(ban => {
        const banElement = document.createElement('button');
        banElement.classList.add('table-item');
        banElement.textContent = ban.ten_ban;
        banElement.dataset.soBan = ban.ten_ban;

        // Thêm class 'occupied' nếu bàn có khách
        if (donHangCuaCacBan.has(ban.ten_ban)) {
            banElement.classList.add('occupied');
        }

        // Thêm class 'selected' nếu là bàn đang được chọn
        if (ban.ten_ban === banDuocChon) {
            banElement.classList.add('selected');
        }

        danhSachBanDiv.appendChild(banElement);
    });
}

/**
 * Hiển thị chi tiết các món đã gọi của bàn được chọn.
 */
function renderChiTietDonHang() {
    const donHang = donHangCuaCacBan.get(banDuocChon);
    bangChiTietMonBody.innerHTML = ''; // Xóa chi tiết cũ

    if (!donHang) {
        bangChiTietMonBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Bàn trống, hãy gọi món!</td></tr>`;
        strongTamTinh.textContent = currencyFormatter.format(0);
        return;
    }

    donHang.chi_tiet_mon.forEach((mon, index) => {
        const row = bangChiTietMonBody.insertRow();
        row.innerHTML = `
            <td>${mon.ten_mon}</td>
            <td>${mon.so_luong}</td>
            <td>${currencyFormatter.format(mon.don_gia)}</td>
            <td><button class="btn-xoa-mon" data-index="${index}">Xóa</button></td>
        `;
    });
    strongTamTinh.textContent = currencyFormatter.format(donHang.tong_tien);
}

// =================================================================
// --- CÁC HÀM XỬ LÝ LOGIC ---
// =================================================================

/**
 * Xử lý khi người dùng nhấn vào một bàn.
 * @param {string} soBan - Số của bàn được nhấn.
 */
function chonBan(soBan) {
    banDuocChon = soBan;
    soBanHienTaiSpan.textContent = soBan;
    formOrderWrapper.style.display = 'block'; // Hiện form gọi món
    renderChiTietDonHang();
    renderLuoiBanAn(); // Vẽ lại lưới để highlight bàn được chọn
    selectMonAn.focus();
}

/**
 * Thêm món mới vào bàn đang được chọn.
 */
async function themMon(e) {
    e.preventDefault();
    if (!banDuocChon) {
        alert("Vui lòng chọn một bàn trước khi thêm món!");
        return;
    }

    const selectedOption = selectMonAn.options[selectMonAn.selectedIndex];
    const monId = selectedOption.value;
    const soLuong = parseFloat(inputSoLuongMon.value);

    if (!monId || isNaN(soLuong) || soLuong <= 0) {
        alert("Vui lòng chọn món và nhập số lượng hợp lệ.");
        return;
    }

    const monDaChon = toanBoThucDon.find(m => m.id === monId);
    if (!monDaChon) {
        alert("Món ăn không hợp lệ.");
        return;
    }

    const monMoi = {
        ten_mon: monDaChon.name,
        so_luong: soLuong,
        don_gia: monDaChon.price,
        thanh_tien: soLuong * monDaChon.price,
    };

    const docRef = doc(db, "restaurants", restaurantId, "current_orders", `ban_${banDuocChon}`);
    try {
        await runTransaction(db, async (transaction) => {
            const orderDoc = await transaction.get(docRef);

            if (!orderDoc.exists()) {
                // --- TẠO ĐƠN HÀNG MỚI ---
                const newOrderData = {
                    ten_ban: banDuocChon,
                    chi_tiet_mon: [monMoi],
                    tong_tien: monMoi.thanh_tien,
                    thoi_gian_tao: serverTimestamp(),
                    new_items_for_kitchen: {
                        items: [monMoi],
                        notes: `Nhân viên thêm món.`,
                        timestamp: serverTimestamp()
                    }
                };
                transaction.set(docRef, newOrderData);
            } else {
                // --- CẬP NHẬT ĐƠN HÀNG CÓ SẴN ---
                const currentData = orderDoc.data();
                const updatedItems = [...currentData.chi_tiet_mon];
                const existingItemIndex = updatedItems.findIndex(item => item.ten_mon === monMoi.ten_mon && item.don_gia === monMoi.don_gia);

                if (existingItemIndex > -1) {
                    updatedItems[existingItemIndex].so_luong += monMoi.so_luong;
                    updatedItems[existingItemIndex].thanh_tien += monMoi.thanh_tien;
                } else {
                    updatedItems.push(monMoi);
                }

                transaction.update(docRef, {
                    chi_tiet_mon: updatedItems,
                    tong_tien: currentData.tong_tien + monMoi.thanh_tien,
                    new_items_for_kitchen: { items: [monMoi], notes: `Nhân viên thêm món.`, timestamp: serverTimestamp() }
                });
            }
        });
        formGoiMon.reset();
        selectMonAn.focus();
    } catch (error) {
        console.error("Lỗi khi thêm món: ", error);
        alert("Đã có lỗi xảy ra khi thêm món. Vui lòng thử lại.");
    }
}

/**
 * Xóa một món khỏi đơn hàng của bàn đang được chọn.
 */
async function xoaMon(e) {
    if (!e.target.classList.contains('btn-xoa-mon') || !banDuocChon) return;

    const index = parseInt(e.target.dataset.index);
    const docRef = doc(db, "restaurants", restaurantId, "current_orders", `ban_${banDuocChon}`);

    try {
        await runTransaction(db, async (transaction) => {
            const orderDoc = await transaction.get(docRef);
            if (!orderDoc.exists()) {
                console.error("Không tìm thấy đơn hàng để xóa món.");
                return;
            }

            const currentData = orderDoc.data();
            const updatedItems = [...currentData.chi_tiet_mon];
            const itemToRemove = updatedItems.splice(index, 1)[0]; // Xóa và lấy ra phần tử đã xóa

            if (updatedItems.length === 0) {
                transaction.delete(docRef); // Nếu hết món thì xóa luôn đơn hàng
            } else {
                const newTotal = currentData.tong_tien - itemToRemove.thanh_tien;
                transaction.update(docRef, { chi_tiet_mon: updatedItems, tong_tien: newTotal });
            }
        });
    } catch (error) {
        console.error("Lỗi khi xóa món: ", error);
        alert("Đã có lỗi xảy ra khi xóa món. Vui lòng thử lại.");
    }
}

/**
 * Tạo nội dung hóa đơn từ dữ liệu và mở cửa sổ in.
 * Hàm này có thể được tái sử dụng để in lại hóa đơn cũ.
 * @param {object} hoaDonData - Dữ liệu của hóa đơn cần in.
 */
export function generateAndPrintInvoice(hoaDonData) {
    if (!hoaDonData || !hoaDonData.chi_tiet_mon || hoaDonData.chi_tiet_mon.length === 0) {
        console.error("Dữ liệu hóa đơn không hợp lệ để in.");
        return;
    }

    // Nếu là hóa đơn cũ (có trường ngay_thanh_toan), dùng ngày đó. Nếu không, dùng ngày giờ hiện tại.
    const thoiGianHoaDon = hoaDonData.ngay_thanh_toan ? hoaDonData.ngay_thanh_toan.toDate() : new Date();
    const ngayIn = thoiGianHoaDon.toLocaleDateString('vi-VN');
    const gioIn = thoiGianHoaDon.toLocaleTimeString('vi-VN');

    let danhSachMonHTML = '';
    hoaDonData.chi_tiet_mon.forEach((mon, index) => {
        danhSachMonHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${mon.ten_mon}</td>
                <td>${mon.so_luong}</td>
                <td class="text-right">${mon.don_gia.toLocaleString('vi-VN')}</td>
                <td class="text-right">${(mon.so_luong * mon.don_gia).toLocaleString('vi-VN')}</td>
            </tr>
        `;
    });

    const htmlContent = `
        <html>
        <head>
            <title>Hóa Đơn Bàn ${hoaDonData.ten_ban}</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 10px; font-size: 12px; }
                .invoice-box { max-width: 300px; margin: auto; padding: 10px; border: 1px solid #eee; box-shadow: 0 0 5px rgba(0, 0, 0, 0.15); }
                .header { text-align: center; margin-bottom: 10px; }
                .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
                .header p { margin: 2px 0; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border-bottom: 1px dashed #ccc; padding: 5px 0; }
                th { text-align: left; }
                .total-row td { border-bottom: none; border-top: 1px solid #000; font-weight: bold; }
                .footer { text-align: center; margin-top: 15px; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <div class="header">
                    <h2>${restaurantName}</h2>
                    <p>HÓA ĐƠN THANH TOÁN</p>
                    <p>Bàn: ${hoaDonData.ten_ban}</p>
                    <p>Ngày: ${ngayIn} - Giờ: ${gioIn}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th><th>Tên món</th><th>SL</th><th class="text-right">Đ.Giá</th><th class="text-right">T.Tiền</th>
                        </tr>
                    </thead>
                    <tbody>${danhSachMonHTML}</tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="4">TỔNG CỘNG</td>
                            <td class="text-right">${currencyFormatter.format(hoaDonData.tong_tien)}</td>
                        </tr>
                    </tfoot>
                </table>
                <div class="footer">
                    <p>Cảm ơn quý khách & hẹn gặp lại!</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '', 'height=700,width=500');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

/**
 * In hóa đơn cho bàn đang được chọn.
 */
function inHoaDon() {
    const donHangHienTai = donHangCuaCacBan.get(banDuocChon);
    if (!donHangHienTai || donHangHienTai.chi_tiet_mon.length === 0) {
        alert("Bàn trống hoặc chưa chọn bàn, không có gì để in!");
        return;
    }
    generateAndPrintInvoice(donHangHienTai);
}

/**
 * Hủy một hóa đơn đã thanh toán, mở lại bàn.
 * @param {string} hoaDonId - ID của hóa đơn trong collection lich_su_ban_hang.
 * @param {object} hoaDonData - Dữ liệu của hóa đơn đó.
 * @returns {Promise<boolean>} - Trả về true nếu thành công, false nếu thất bại.
 */
export async function huyThanhToan(hoaDonId, hoaDonData) {
    const tenBan = hoaDonData.ten_ban;
    const donHangHienTaiRef = doc(db, "restaurants", restaurantId, "current_orders", `ban_${tenBan}`);

    try {
        // 1. Kiểm tra xem bàn có đang được sử dụng không
        const docSnap = await getDoc(donHangHienTaiRef);
        if (docSnap.exists()) {
            alert(`Không thể hủy thanh toán. Bàn "${tenBan}" hiện đang có khách!`);
            return false;
        }

        // 2. Tạo lại đơn hàng hiện tại từ dữ liệu hóa đơn cũ
        // Loại bỏ trường ngay_thanh_toan trước khi tạo lại
        const { ngay_thanh_toan, ...donHangDeMoLai } = hoaDonData;
        await setDoc(donHangHienTaiRef, donHangDeMoLai);

        // 3. Xóa hóa đơn khỏi lịch sử bán hàng
        const hoaDonLichSuRef = doc(db, "restaurants", restaurantId, "sales_history", hoaDonId);
        await deleteDoc(hoaDonLichSuRef);

        alert(`Đã hủy thanh toán và mở lại bàn "${tenBan}" thành công!`);
        return true;

    } catch (error) {
        console.error("Lỗi khi hủy thanh toán: ", error);
        alert("Có lỗi xảy ra trong quá trình hủy thanh toán.");
        return false;
    }
}

/**
 * Thanh toán cho bàn đang được chọn.
 */
async function thanhToan(onSaleCompletedCallback) {
    const donHangHienTai = donHangCuaCacBan.get(banDuocChon);
    if (!donHangHienTai || donHangHienTai.chi_tiet_mon.length === 0) {
        alert("Bàn trống hoặc chưa chọn bàn, không có gì để thanh toán!");
        return;
    }

    let chiTietHoaDon = `--- HÓA ĐƠN BÀN ${donHangHienTai.ten_ban} ---\n\n`;
    donHangHienTai.chi_tiet_mon.forEach(mon => {
        chiTietHoaDon += `- ${mon.ten_mon} (SL: ${mon.so_luong}, ĐG: ${mon.don_gia.toLocaleString('vi-VN')}đ)\n`;
    });
    chiTietHoaDon += `\n-----------------------------------\n`;
    chiTietHoaDon += `TỔNG CỘNG: ${currencyFormatter.format(donHangHienTai.tong_tien)}`;

    if (confirm(chiTietHoaDon + "\n\nXác nhận thanh toán cho bàn này?")) {
        try {
            // *** LƯU LỊCH SỬ DOANH THU ***
            const hoaDonLuuTru = {
                ...donHangHienTai,
                ngay_thanh_toan: Timestamp.now() // Thêm ngày giờ thanh toán
            };
            await addDoc(collection(db, "restaurants", restaurantId, "sales_history"), hoaDonLuuTru);

            // Xóa đơn hàng hiện tại
            const docRef = doc(db, "restaurants", restaurantId, "current_orders", `ban_${banDuocChon}`);
            await deleteDoc(docRef);

            alert(`Đã thanh toán thành công cho bàn ${donHangHienTai.ten_ban}!`);
            
            // Reset giao diện
            banDuocChon = null;
            soBanHienTaiSpan.textContent = 'Chưa chọn bàn';
            formOrderWrapper.style.display = 'none';
            renderLuoiBanAn();

            // Gọi hàm callback để thông báo cho app.js biết cần làm mới báo cáo
            if (onSaleCompletedCallback) onSaleCompletedCallback();
        } catch (error) {
            console.error("Lỗi khi thanh toán: ", error);
        }
    }
}

// =================================================================
// --- KHỞI TẠO MODULE ---
// =================================================================

/**
 * Tải dữ liệu các bàn ăn từ Firestore và lắng nghe thay đổi.
 */
async function loadTableData() {
    const tablesCollectionRef = collection(db, 'restaurants', restaurantId, 'tables');
    const q = query(tablesCollectionRef, orderBy('ten_ban'));
    onSnapshot(q,
        (snapshot) => {
            const allTables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // CẢI TIẾN: Thêm logic sắp xếp mạnh mẽ để đồng bộ với Dashboard
            allTables.sort((a, b) => {
                const numA = parseInt(a.ten_ban, 10);
                const numB = parseInt(b.ten_ban, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.ten_ban.localeCompare(b.ten_ban, 'vi');
            });
            danhSachBanData = allTables;
            renderLuoiBanAn(); // Vẽ lại lưới bàn mỗi khi có thay đổi
        },
        (error) => { // CẢI TIẾN: Thêm xử lý lỗi
            console.error("Lỗi khi tải danh sách bàn: ", error);
            danhSachBanDiv.innerHTML = `<p class="no-tables-message error">Không thể tải danh sách bàn. Vui lòng kiểm tra kết nối và thử lại.</p>`;
        });
}

/**
 * Tải dữ liệu thực đơn từ Firestore và điền vào thẻ <select>
 */
async function loadMenuData() {
    const menuCollectionRef = collection(db, 'restaurants', restaurantId, 'menu');
    const q = query(menuCollectionRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    toanBoThucDon = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    selectMonAn.innerHTML = '<option value="">-- Chọn món --</option>';
    toanBoThucDon.forEach(mon => {
        const option = document.createElement('option');
        option.value = mon.id;
        option.textContent = `${mon.name} - ${currencyFormatter.format(mon.price)}`;
        selectMonAn.appendChild(option);
    });
}

export function initBanHang(onSaleCompletedCallback) {
    loadTableData();
    loadMenuData();

    // Lắng nghe sự thay đổi của TẤT CẢ các đơn hàng đang hoạt động
    const q = query(collection(db, "restaurants", restaurantId, "current_orders"));
    onSnapshot(q, (querySnapshot) => {
        donHangCuaCacBan.clear(); // Xóa dữ liệu cũ
        querySnapshot.forEach((doc) => {
            // Lưu lại tất cả các bàn có khách vào Map
            donHangCuaCacBan.set(doc.data().ten_ban, doc.data());
        });
        renderLuoiBanAn(); // Cập nhật lại màu sắc các bàn
        if (banDuocChon) {
            renderChiTietDonHang(); // Cập nhật lại chi tiết nếu bàn đang chọn có thay đổi
        }
    });

    // Gắn sự kiện click cho toàn bộ lưới bàn ăn
    danhSachBanDiv.addEventListener('click', (e) => {
        // Sử dụng .closest() để đảm bảo luôn tìm thấy nút bàn dù click vào đâu bên trong nó
        const banDuocClick = e.target.closest('.table-item');
        if (banDuocClick) {
            const soBan = banDuocClick.dataset.soBan;
            chonBan(soBan); 
        }
    });

    // Gắn các sự kiện khác
    formGoiMon.addEventListener('submit', themMon);
    bangChiTietMonBody.addEventListener('click', xoaMon);
    btnInHoaDon.addEventListener('click', inHoaDon);
    btnThanhToan.addEventListener('click', () => thanhToan(onSaleCompletedCallback));
}