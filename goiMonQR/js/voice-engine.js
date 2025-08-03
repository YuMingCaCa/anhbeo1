// ==================================================================
// === BỘ MÁY GIỌNG NÓI TIẾNG VIỆT (VIETNAMESE VOICE ENGINE) V3.1 ===
// ==================================================================
const voiceEngine = (() => {
    let vietnameseVoice = null;
    const speechQueue = [];
    let isEngineInitialized = false;
    let isCurrentlySpeaking = false;
    let initializationInterval = null;

    function processQueue() {
        if (!isEngineInitialized || isCurrentlySpeaking || speechQueue.length === 0) {
            return;
        }
        isCurrentlySpeaking = true;
        const text = speechQueue.shift();
        console.log(`[Voice Engine] Đang đọc: "${text}"`);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = vietnameseVoice;
        utterance.lang = 'vi-VN';
        utterance.rate = 1.0;
        utterance.onend = () => {
            isCurrentlySpeaking = false;
            setTimeout(processQueue, 100);
        };
        utterance.onerror = (e) => {
            console.error("[Voice Engine] Lỗi khi phát giọng nói:", e.error);
            isCurrentlySpeaking = false;
            processQueue();
        };
        window.speechSynthesis.speak(utterance);
    }

    function initialize() {
        if (isEngineInitialized || initializationInterval) return;
        console.log("[Voice Engine] Đang khởi tạo...");
        if (!('speechSynthesis' in window)) {
            console.error("[Voice Engine] Lỗi: Trình duyệt này không hỗ trợ giọng nói.");
            return;
        }
        
        let attemptCount = 0;
        initializationInterval = setInterval(() => {
            attemptCount++;
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                vietnameseVoice = voices.find(v => v.lang === 'vi-VN') || voices.find(v => v.lang.startsWith('vi'));
                if (vietnameseVoice) {
                    console.log(`[Voice Engine] THÀNH CÔNG: Đã tìm thấy giọng đọc Tiếng Việt sau ${attemptCount} lần thử:`, vietnameseVoice.name);
                    isEngineInitialized = true;
                    clearInterval(initializationInterval);
                    initializationInterval = null;
                    processQueue();
                    return;
                }
            }
            if (attemptCount > 50) { // Dừng sau 5 giây
                clearInterval(initializationInterval);
                initializationInterval = null;
                console.error("[Voice Engine] LỖI: Không tìm thấy giọng đọc Tiếng Việt sau 5 giây.");
            }
        }, 100);
    }

    function speak(text) {
        if (!text) return;
        console.log(`[Voice Engine] Đã thêm vào hàng đợi: "${text}"`);
        speechQueue.push(text);
        processQueue();
    }

    return { initialize, speak };
})();

export { voiceEngine };