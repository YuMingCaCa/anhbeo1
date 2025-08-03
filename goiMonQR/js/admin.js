import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { restaurantId } from './config.js'; // <-- THÊM DÒNG NÀY

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

// Sử dụng restaurantId từ file config để tạo tên collection động
const menuCollection = collection(db, `${restaurantId}-menu`);
const categoriesCollection = collection(db, `${restaurantId}-categories`);
const ordersCollection = collection(db, `${restaurantId}-orders`);

// --- DOM Elements ---
const soundModal = document.getElementById('sound-modal');
const enableSoundBtn = document.getElementById('enable-sound-btn');
const mainContainer = document.getElementById('main-container');
const notificationSound = document.getElementById('notification-sound');
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');
let allProducts = [];

// --- NEW: Text-to-Speech Functionality (Robust Version) ---
let vietnameseVoice = null;
let speechPromise = null;

function initializeSpeech() {
    if (speechPromise) return speechPromise;

    speechPromise = new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            return reject("Trình duyệt không hỗ trợ giọng nói.");
        }

        let voices = window.speechSynthesis.getVoices();

        function findVoice() {
            voices = window.speechSynthesis.getVoices();
            vietnameseVoice = voices.find(v => v.lang === 'vi-VN') || voices.find(v => v.lang.startsWith('vi'));
            if (vietnameseVoice) {
                console.log("Đã tìm thấy giọng đọc tiếng Việt:", vietnameseVoice.name);
                resolve();
                return true;
            }
            return false;
        }

        if (findVoice()) return;

        window.speechSynthesis.onvoiceschanged = () => {
            findVoice();
        };
    });
    return speechPromise;
}

const speak = async (text) => {
    try {
        await initializeSpeech();
        if (!vietnameseVoice) {
            console.warn("Không có giọng đọc tiếng Việt. Không thể phát thông báo.");
            return;
        }
        
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = vietnameseVoice;
        utterance.lang = 'vi-VN';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);

    } catch (error) {
        console.error("Lỗi khi phát giọng nói:", error);
    }
};
// --- END NEW ---


// --- Utility Functions ---
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const normalizeCategory = (str) => {
    if (!str) return '';
    const trimmedStr = str.trim();
    if (trimmedStr.length === 0) return '';
    return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1);
};
const showToast = (message) => {
    toastMessage.textContent = message;
    toastNotification.classList.remove('hidden');
    setTimeout(() => {
        toastNotification.classList.add('hidden');
    }, 5000);
};

// --- Render Functions ---
const renderCategories = (categories) => {
    const categoryManagementList = document.getElementById('category-management-list');
    const productCategorySelect = document.getElementById('product-category-select');
    categoryManagementList.innerHTML = '';
    if (categories.length === 0) {
        categoryManagementList.innerHTML = '<p class="text-center text-gray-500">Chưa có phân loại nào.</p>';
    } else {
        categories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
            const catEl = document.createElement('div');
            catEl.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';
            catEl.innerHTML = `<span>${cat.name}</span><button data-id="${cat.id}" data-name="${cat.name}" class="delete-category-btn text-red-500 hover:text-red-700 w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors"><i class="fas fa-trash"></i></button>`;
            categoryManagementList.appendChild(catEl);
        });
    }
    productCategorySelect.innerHTML = '<option value="">-- Chọn loại món ăn --</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        productCategorySelect.appendChild(option);
    });
};
const renderProducts = (products) => {
    const productListDiv = document.getElementById('product-list');
    const loadingMessage = document.getElementById('loading-products');
    productListDiv.innerHTML = '';
    if (products.length === 0) {
        loadingMessage.textContent = 'Chưa có món ăn nào. Vui lòng thêm ở trên.';
        loadingMessage.style.display = 'block';
        return;
    }
    loadingMessage.style.display = 'none';
    const groupedProducts = products.reduce((acc, product) => {
        const category = product.category || 'Chưa phân loại';
        if (!acc[category]) acc[category] = [];
        acc[category].push(product);
        return acc;
    }, {});
    Object.keys(groupedProducts).sort().forEach(category => {
        const categorySection = document.createElement('div');
        categorySection.className = 'mb-6 bg-white p-5 rounded-lg shadow-md';
        categorySection.innerHTML = `<h3 class="text-xl font-bold text-gray-800 mb-3 pb-2 border-b">${category}</h3>`;
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'space-y-3';
        groupedProducts[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(product => {
            const productEl = document.createElement('div');
            productEl.className = 'flex justify-between items-center p-3 rounded-md hover:bg-gray-50';
            productEl.innerHTML = `<div><p class="font-bold text-lg">${product.name}</p><p class="text-gray-600 text-sm">${formatCurrency(product.price)}</p></div><div class="flex items-center gap-2"><button data-id="${product.id}" class="edit-btn text-blue-500 hover:text-blue-700 w-10 h-10 rounded-full hover:bg-blue-50 flex items-center justify-center"><i class="fas fa-edit"></i></button><button data-id="${product.id}" class="delete-btn text-red-500 hover:text-red-700 w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center"><i class="fas fa-trash"></i></button></div>`;
            itemsContainer.appendChild(productEl);
        });
        categorySection.appendChild(itemsContainer);
        productListDiv.appendChild(categorySection);
    });
};

// --- Firebase Listeners ---
const startDataListeners = () => {
    onSnapshot(query(categoriesCollection), (snapshot) => renderCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), console.error);
    onSnapshot(query(menuCollection), (snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(allProducts);
    }, console.error);
};

const startNotificationListener = () => {
    onSnapshot(query(ordersCollection, where("status", "==", "new")), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const newOrder = change.doc.data();
                
                // Play sound
                notificationSound.play().catch(e => console.log("Lỗi phát âm thanh:", e));

                // Create and speak the announcement
                const itemsText = newOrder.items.map(item => `${item.quantity} ${item.name}`).join(', ');
                const announcementText = `Có đơn mới từ Bàn ${newOrder.table}. Gồm có: ${itemsText}`;
                speak(announcementText);

                showToast(`Có đơn hàng mới từ Bàn ${newOrder.table}!`);
            }
        });
    });
};

// --- Event Handlers & Main Execution ---

const unlockAudioAndStart = () => {
    // Initialize speech on the first user interaction
    initializeSpeech();

    // Play a silent sound to unlock the audio context
    notificationSound.play().then(() => {
        notificationSound.pause();
        notificationSound.currentTime = 0;
        console.log("Âm thanh đã được kích hoạt.");
    }).catch(error => {
        console.warn("Không thể phát âm thanh để kích hoạt, nhưng vẫn tiếp tục vì người dùng đã tương tác.", error);
    });

    // Start the notification listener
    startNotificationListener();

    // Remove the banner and event listeners after activation
    const banner = document.getElementById('sound-unlock-banner');
    if (banner) banner.remove();
    document.removeEventListener('click', unlockAudioAndStart);
    document.removeEventListener('keydown', unlockAudioAndStart);
};

// --- Main Application Logic ---
function initializeApp() {
    // Always start by listening to data that doesn't require sound
    startDataListeners();

    // Check if the user has previously granted permission
    if (localStorage.getItem('soundPermissionGranted') === 'true') {
        soundModal.classList.add('hidden');
        mainContainer.classList.remove('hidden');

        // Create a small banner to notify the user
        const banner = document.createElement('div');
        banner.id = 'sound-unlock-banner';
        banner.className = 'bg-yellow-400 text-yellow-900 text-center p-2 font-medium sticky top-0 z-20';
        banner.textContent = 'Âm thanh đang tắt. Nhấn vào bất cứ đâu để bật lại.';
        document.body.prepend(banner);

        // Wait for the first user interaction to enable sound
        document.addEventListener('click', unlockAudioAndStart, { once: true });
        document.addEventListener('keydown', unlockAudioAndStart, { once: true });

    } else {
        // If it's the first time, show the request modal
        mainContainer.classList.add('hidden');
        soundModal.classList.remove('hidden');
        
        enableSoundBtn.addEventListener('click', () => {
            localStorage.setItem('soundPermissionGranted', 'true'); // Save the choice permanently
            soundModal.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            unlockAudioAndStart();
        });
    }
}

initializeApp();


// --- Other form event handlers (unchanged) ---
const addCategoryForm = document.getElementById('add-category-form');
addCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newCategoryNameInput = document.getElementById('new-category-name');
    const categoryName = normalizeCategory(newCategoryNameInput.value);
    if (!categoryName) return;
    const q = query(categoriesCollection, where("name", "==", categoryName));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        alert('Phân loại này đã tồn tại!');
        return;
    }
    try {
        await addDoc(categoriesCollection, { name: categoryName });
        addCategoryForm.reset();
    } catch (error) {
        console.error("Lỗi khi thêm phân loại: ", error);
        alert("Không thể thêm phân loại mới.");
    }
});

const categoryManagementList = document.getElementById('category-management-list');
categoryManagementList.addEventListener('click', async (e) => {
    const target = e.target.closest('.delete-category-btn');
    if (!target) return;
    const categoryId = target.dataset.id;
    const categoryName = target.dataset.name;
    const isCategoryInUse = allProducts.some(p => p.category === categoryName);
    if (isCategoryInUse) {
        alert(`Không thể xóa! Phân loại "${categoryName}" đang được sử dụng cho một hoặc nhiều món ăn.`);
        return;
    }
    if (confirm(`Bạn có chắc muốn xóa phân loại "${categoryName}"?`)) {
        try {
            await deleteDoc(doc(db, `${restaurantId}-categories`, categoryId));
        } catch (error) {
            console.error("Lỗi khi xóa phân loại: ", error);
            alert("Không thể xóa phân loại.");
        }
    }
});

const resetProductForm = () => {
    const productForm = document.getElementById('product-form');
    const productIdInput = document.getElementById('product-id');
    const formTitle = document.getElementById('form-title');
    const saveBtnText = document.getElementById('save-btn-text');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const productNameInput = document.getElementById('product-name');
    productForm.reset();
    productIdInput.value = '';
    formTitle.textContent = 'Thêm Món Ăn Mới';
    saveBtnText.textContent = 'Lưu Món';
    cancelEditBtn.classList.add('hidden');
    productNameInput.focus();
};

const productForm = document.getElementById('product-form');
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productIdInput = document.getElementById('product-id');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const productCategorySelect = document.getElementById('product-category-select');
    const id = productIdInput.value;
    const productData = {
        name: productNameInput.value,
        price: Number(productPriceInput.value),
        category: productCategorySelect.value
    };
    if (!productData.category) {
        alert("Vui lòng chọn phân loại cho món ăn!");
        return;
    }
    try {
        if (id) {
            await updateDoc(doc(db, `${restaurantId}-menu`, id), productData);
        } else {
            await addDoc(menuCollection, productData);
        }
        resetProductForm();
    } catch (error) {
        console.error("Lỗi khi lưu món ăn: ", error);
        alert("Đã có lỗi xảy ra, không thể lưu món ăn!");
    }
});

const productListDiv = document.getElementById('product-list');
productListDiv.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const id = target.dataset.id;
    const productDocRef = doc(db, `${restaurantId}-menu`, id);
    if (target.classList.contains('delete-btn')) {
        if (confirm('Bạn có chắc muốn xóa món ăn này?')) {
            await deleteDoc(productDocRef).catch(console.error);
        }
    } else if (target.classList.contains('edit-btn')) {
        const docSnap = await getDocs(query(menuCollection, where('__name__', '==', id)));
        if (!docSnap.empty) {
            const product = docSnap.docs[0].data();
            const productIdInput = document.getElementById('product-id');
            const productNameInput = document.getElementById('product-name');
            const productPriceInput = document.getElementById('product-price');
            const productCategorySelect = document.getElementById('product-category-select');
            const formTitle = document.getElementById('form-title');
            const saveBtnText = document.getElementById('save-btn-text');
            const cancelEditBtn = document.getElementById('cancel-edit-btn');
            productIdInput.value = id;
            productNameInput.value = product.name;
            productPriceInput.value = product.price;
            productCategorySelect.value = product.category;
            formTitle.textContent = 'Chỉnh Sửa Món Ăn';
            saveBtnText.textContent = 'Cập Nhật';
            cancelEditBtn.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            productNameInput.focus();
        }
    }
});

const cancelEditBtn = document.getElementById('cancel-edit-btn');
cancelEditBtn.addEventListener('click', resetProductForm);
