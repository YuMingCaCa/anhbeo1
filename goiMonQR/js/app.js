// d:/1 HE THONG WEB/TestQuan/goiMonQR/js/app.js

import { db } from '../../js/firebase.js';
import { restaurantId, restaurantName } from '../../js/config.js';
import {
    collection,
    doc,
    getDocs,
    where,
    query,
    orderBy,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const menuContainer = document.getElementById('menu-container');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const sendOrderBtn = document.getElementById('send-order-btn');
    const orderNotesInput = document.getElementById('order-notes');
    const tableNumberSpan = document.getElementById('table-number');
    const restaurantNameSpan = document.getElementById('restaurant-name');
    const loadingMenuMessage = document.getElementById('loading-menu');
    const cartSection = document.getElementById('cart-section');

    // --- State ---
    let menu = [];
    let cart = {}; // { productId: { name, price, quantity }, ... }
    let tableNumber = null;

    // --- Helper Functions ---
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    /**
     * Extracts table number from URL query parameter.
     * CẢI TIẾN: Thêm bước xác thực bàn với cơ sở dữ liệu.
     * Example URL: .../goiMonQR/index.html?table=5
     */
    async function validateTableNumber() {
        const params = new URLSearchParams(window.location.search);
        const table = params.get('table');

        const showError = (message) => {
            document.body.innerHTML = `<div class="text-center p-8 bg-red-100 text-red-800">
                <h1 class="text-2xl font-bold">Lỗi: Bàn không hợp lệ</h1>
                <p>${message}</p>
            </div>`;
        };

        if (!table) {
            showError("Không tìm thấy số bàn. Vui lòng quét lại mã QR tại bàn của bạn.");
            return false;
        }

        const tablesCollectionRef = collection(db, 'restaurants', restaurantId, 'tables');
        const q = query(tablesCollectionRef, where("ten_ban", "==", table));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showError(`Bàn số "${table}" không tồn tại trong hệ thống. Vui lòng liên hệ nhân viên.`);
            return false;
        }

        tableNumber = table;
        tableNumberSpan.textContent = table;
        return true;
    }

    /**
     * Fetches menu from Firestore.
     * IMPORTANT: Assumes menu is stored in 'restaurants/{restaurantId}/menu'
     */
    async function loadMenu() {
        try {
            // Adjust collection path to match the new structure
            const menuCollectionRef = collection(db, 'restaurants', restaurantId, 'menu');
            const categoriesCollectionRef = collection(db, 'restaurants', restaurantId, 'categories');

            const [menuSnapshot, categoriesSnapshot] = await Promise.all([
                getDocs(query(menuCollectionRef, orderBy('name'))),
                getDocs(query(categoriesCollectionRef, orderBy('name')))
            ]);

            const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            menu = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            renderMenu(categories);
            loadingMenuMessage.style.display = 'none';

        } catch (error) {
            console.error("Error loading menu: ", error);
            loadingMenuMessage.textContent = "Lỗi tải thực đơn. Vui lòng thử lại.";
        }
    }

    /**
     * Renders the menu, grouped by category.
     */
    function renderMenu(categories) {
        menuContainer.innerHTML = '';

        const groupedProducts = menu.reduce((acc, product) => {
            const category = product.category || 'Chưa phân loại';
            if (!acc[category]) acc[category] = [];
            acc[category].push(product);
            return acc;
        }, {});

        // Order categories based on the fetched categories list
        const orderedCategories = categories.map(c => c.name);
        // Add any uncategorized items at the end
        Object.keys(groupedProducts).forEach(catName => {
            if (!orderedCategories.includes(catName)) {
                orderedCategories.push(catName);
            }
        });


        orderedCategories.forEach(categoryName => {
            if (!groupedProducts[categoryName]) return; // Skip if category has no items

            const categorySection = document.createElement('div');
            categorySection.className = 'mb-6';
            categorySection.innerHTML = `<h2 class="text-2xl font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-500">${categoryName}</h2>`;

            const itemsGrid = document.createElement('div');
            itemsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

            groupedProducts[categoryName].forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'bg-white rounded-lg shadow-md p-4 flex items-center gap-4';
                const imageHtml = product.imageUrl ?
                    `<img src="${product.imageUrl}" alt="${product.name}" class="w-20 h-20 object-cover rounded-md flex-shrink-0 shadow">` :
                    `<div class="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 flex-shrink-0"><i class="fas fa-image fa-lg"></i></div>`;

                productCard.innerHTML = `
                    ${imageHtml}
                    <div class="flex-grow">
                        <h3 class="font-bold text-lg">${product.name}</h3>
                        <p class="text-gray-600">${formatCurrency(product.price)}</p>
                        ${product.description ? `<p class="text-sm text-gray-500 mt-1 italic">"${product.description}"</p>` : ''}
                    </div>
                    <div class="flex-shrink-0">
                        <button data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" class="add-to-cart-btn bg-blue-500 text-white w-10 h-10 rounded-full font-bold text-xl hover:bg-blue-600 transition-transform transform hover:scale-110">+</button>
                    </div>
                `;
                itemsGrid.appendChild(productCard);
            });

            categorySection.appendChild(itemsGrid);
            menuContainer.appendChild(categorySection);
        });
    }

    /**
     * Adds an item to the cart or increases its quantity.
     */
    function addToCart(productId, name, price) {
        if (cart[productId]) {
            cart[productId].quantity++;
        } else {
            cart[productId] = { name, price: Number(price), quantity: 1 };
        }
        updateCartView();
    }

    /**
     * Updates the cart UI based on the cart state.
     */
    function updateCartView() {
        cartItemsContainer.innerHTML = '';
        let total = 0;
        if (Object.keys(cart).length === 0) {
            cartItemsContainer.innerHTML = '<p class="text-gray-500">Giỏ hàng của bạn đang trống.</p>';
            cartSection.classList.add('hidden'); // Hide cart if empty
        } else {
            cartSection.classList.remove('hidden'); // Show cart if not empty
            for (const id in cart) {
                const item = cart[id];
                total += item.price * item.quantity;
                const cartItemEl = document.createElement('div');
                cartItemEl.className = 'flex justify-between items-center py-2 border-b';
                cartItemEl.innerHTML = `
                    <div>
                        <p class="font-semibold">${item.name}</p>
                        <p class="text-sm text-gray-600">${formatCurrency(item.price)} x ${item.quantity}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button data-id="${id}" class="cart-quantity-btn decrease-btn">-</button>
                        <span class="w-8 text-center">${item.quantity}</span>
                        <button data-id="${id}" class="cart-quantity-btn increase-btn">+</button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItemEl);
            }
        }
        cartTotalSpan.textContent = formatCurrency(total);
    }

    /**
     * Handles quantity changes in the cart.
     */
    function handleCartQuantityChange(productId, change) {
        if (!cart[productId]) return;
        cart[productId].quantity += change;
        if (cart[productId].quantity <= 0) {
            delete cart[productId];
        }
        updateCartView();
    }

    /**
     * THE CORE LOGIC: Sends the order to Firestore using a transaction.
     */
    async function sendOrder() {
        if (Object.keys(cart).length === 0) {
            alert("Giỏ hàng trống, vui lòng chọn món!");
            return;
        }
        if (!tableNumber) {
            alert("Lỗi: Không có số bàn. Vui lòng quét lại mã QR.");
            return;
        }

        sendOrderBtn.disabled = true;
        sendOrderBtn.textContent = 'Đang gửi...';

        // Prepare the items to be added
        const newItemsForOrder = Object.values(cart).map(item => ({
            ten_mon: item.name,
            so_luong: item.quantity,
            don_gia: item.price,
            thanh_tien: item.price * item.quantity
        }));

        const totalForNewItems = newItemsForOrder.reduce((sum, item) => sum + item.thanh_tien, 0);
        const orderNotes = orderNotesInput.value.trim();

        // The document reference for the current table's order
        const orderDocRef = doc(db, "restaurants", restaurantId, "current_orders", `ban_${tableNumber}`);

        try {
            await runTransaction(db, async (transaction) => {
                const orderDoc = await transaction.get(orderDocRef);

                if (!orderDoc.exists()) {
                    // --- CASE 1: No existing order for this table, create a new one ---
                    const newOrderData = {
                        ten_ban: tableNumber,
                        chi_tiet_mon: newItemsForOrder,
                        tong_tien: totalForNewItems,
                        thoi_gian_tao: serverTimestamp(),
                        // This is the new field for the kitchen
                        new_items_for_kitchen: {
                            items: newItemsForOrder,
                            notes: orderNotes,
                            timestamp: serverTimestamp()
                        }
                    };
                    transaction.set(orderDocRef, newOrderData);
                } else {
                    // --- CASE 2: An order already exists, update it ---
                    const currentData = orderDoc.data();
                    const updatedItems = [...currentData.chi_tiet_mon];

                    // Merge new items with existing ones
                    newItemsForOrder.forEach(newItem => {
                        const existingItemIndex = updatedItems.findIndex(item => item.ten_mon === newItem.ten_mon && item.don_gia === newItem.don_gia);
                        if (existingItemIndex > -1) {
                            updatedItems[existingItemIndex].so_luong += newItem.so_luong;
                            updatedItems[existingItemIndex].thanh_tien += newItem.thanh_tien;
                        } else {
                            updatedItems.push(newItem);
                        }
                    });

                    const updatedTotal = currentData.tong_tien + totalForNewItems;

                    const updateData = {
                        chi_tiet_mon: updatedItems,
                        tong_tien: updatedTotal,
                        // Add/overwrite the field for the kitchen
                        new_items_for_kitchen: {
                            items: newItemsForOrder,
                            notes: orderNotes,
                            timestamp: serverTimestamp()
                        }
                    };
                    transaction.update(orderDocRef, updateData);
                }
            });

            // Success
            document.body.innerHTML = `<div class="text-center p-8 bg-green-100 text-green-800">
                <h1 class="text-2xl font-bold">Gửi đơn hàng thành công!</h1>
                <p>Nhà bếp đã nhận được yêu cầu của bạn. Vui lòng chờ trong giây lát.</p>
                <p class="mt-4">Bạn có thể tiếp tục gọi thêm món nếu muốn bằng cách tải lại trang này.</p>
            </div>`;

        } catch (e) {
            console.error("Transaction failed: ", e);
            alert("Gửi đơn hàng thất bại. Vui lòng thử lại hoặc báo cho nhân viên.");
            sendOrderBtn.disabled = false;
            sendOrderBtn.textContent = 'Gửi Đơn Hàng';
        }
    }


    // --- Event Listeners ---
    menuContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (btn) {
            addToCart(btn.dataset.id, btn.dataset.name, btn.dataset.price);
        }
    });

    cartItemsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.cart-quantity-btn');
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.classList.contains('increase-btn')) {
            handleCartQuantityChange(id, 1);
        } else if (btn.classList.contains('decrease-btn')) {
            handleCartQuantityChange(id, -1);
        }
    });

    sendOrderBtn.addEventListener('click', sendOrder);

    // --- Initialization ---
    async function init() {
        restaurantNameSpan.textContent = restaurantName;
        const isTableValid = await validateTableNumber();
        if (isTableValid) {
            loadMenu();
            updateCartView(); // Initial render
        }
    }

    init();
});