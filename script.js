const selectFrom = document.getElementById("select-from");
const selectTo = document.getElementById("select-to");
const textFrom = document.getElementById("text-from");
const textTo = document.getElementById("text-to");
const translateBtn = document.getElementById("translate-btn");
const micBtn = document.getElementById("mic-btn");
const speakBtn = document.getElementById("speak-btn");
const exchangeBtn = document.getElementById("exchange");
const charCount = document.getElementById("char-count");
const imageInput = document.getElementById("image-input");
const ocrStatus = document.getElementById("ocr-status");

// 1. POPULATE LANGUAGES
if (typeof countries !== 'undefined') {
    selectFrom.innerHTML = "";
    selectTo.innerHTML = "";
    Object.keys(countries).forEach((code) => {
        let selectedFrom = code === "ne-NP" ? "selected" : "";
        let selectedTo = code === "en-US" ? "selected" : "";
        let langName = countries[code].split('(')[0].trim();
        
        let optionFrom = `<option value="${code}" ${selectedFrom}>${langName}</option>`;
        let optionTo = `<option value="${code}" ${selectedTo}>${langName}</option>`;
        selectFrom.insertAdjacentHTML("beforeend", optionFrom);
        selectTo.insertAdjacentHTML("beforeend", optionTo);
    });
}

// 2. INPUT LISTENER (Debounce for Realtime)
let typingTimer;
const doneTypingInterval = 1200; // 1.2 Seconds wait time

textFrom.addEventListener("input", () => {
    charCount.innerText = `${textFrom.value.length}/5000`;
    clearTimeout(typingTimer);
    
    // Check length to prevent auto-translation on extremely long texts to save API calls
    if (textFrom.value.trim().length > 0) {
        typingTimer = setTimeout(translateText, doneTypingInterval);
    } else {
        textTo.value = "";
    }
});

// 3. SMART CHUNKING TRANSLATION LOGIC (THE FIX)
async function translateText() {
    let text = textFrom.value.trim();
    if (!text) return;

    // Show processing status
    textTo.setAttribute("placeholder", "Translating large text...");
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    translateBtn.disabled = true;

    let fromLang = selectFrom.value.split('-')[0];
    let toLang = selectTo.value.split('-')[0];

    // ✅ FIX: Split text into safe chunks of 400 characters max
    // ensuring we don't break words in half.
    const chunks = getSmartChunks(text, 400);
    
    let fullTranslation = "";

    try {
        // Process chunks strictly one by one to avoid server rejection
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            // Skip empty chunks
            if(!chunk.trim()) continue;

            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${fromLang}|${toLang}`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.responseData.translatedText) {
                fullTranslation += data.responseData.translatedText + " ";
            } else {
                console.warn("Chunk error:", data);
            }
        }

        // Show final result
        textTo.value = fullTranslation.trim();
        translateBtn.innerHTML = 'Translate Now';
        translateBtn.disabled = false;

    } catch (error) {
        console.error(error);
        textTo.value = "Error: Network issue or API limit. Please wait a moment and try again.";
        translateBtn.innerHTML = 'Try Again';
        translateBtn.disabled = false;
    }
}

// ✅ HELPER: Smart Text Splitter (Splits by space, keeps words intact)
function getSmartChunks(str, maxLength) {
    const chunks = [];
    while (str.length > maxLength) {
        // Find the last space within the limit to cut safely
        let p = str.substring(0, maxLength).lastIndexOf(" ");
        if (p === -1) p = maxLength; // No space found, cut at limit
        chunks.push(str.substring(0, p));
        str = str.substring(p).trim();
    }
    if (str.length > 0) chunks.push(str);
    return chunks;
}

translateBtn.addEventListener("click", translateText);

// 4. IMAGE SCANNER (OCR)
imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    if (!file) return;

    const ocrSpan = document.getElementById("listening-status"); 
    // Use the status span for feedback
    if(ocrSpan) {
        ocrSpan.innerText = "Scanning Image...";
        ocrSpan.classList.remove("hidden");
        ocrSpan.classList.add("text-yellow-400");
    }
    
    textFrom.value = "Scanning image... (this may take a few seconds)";

    try {
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        textFrom.value = text;
        translateText(); // Auto translate
    } catch (error) {
        textFrom.value = "Error reading image.";
    } finally {
        if(ocrSpan) ocrSpan.classList.add("hidden");
    }
});

// 5. EXCHANGE
exchangeBtn.addEventListener("click", () => {
    let tempLang = selectFrom.value;
    selectFrom.value = selectTo.value;
    selectTo.value = tempLang;
    
    let tempText = textFrom.value;
    textFrom.value = textTo.value;
    textTo.value = tempText;
});

// 6. SPEECH RECOGNITION
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = selectFrom.value;
    recognition.interimResults = false;

    micBtn.addEventListener("click", () => {
        recognition.lang = selectFrom.value;
        try {
            if (micBtn.classList.contains("bg-red-500")) {
                recognition.stop();
                micBtn.classList.remove("bg-red-500", "animate-pulse");
                micBtn.classList.add("bg-blue-600");
            } else {
                recognition.start();
                micBtn.classList.remove("bg-blue-600");
                micBtn.classList.add("bg-red-500", "animate-pulse");
            }
        } catch (e) {
            recognition.stop();
        }
    });

    recognition.onend = () => {
        micBtn.classList.remove("bg-red-500", "animate-pulse");
        micBtn.classList.add("bg-blue-600");
        if(textFrom.value.trim().length > 0) translateText();
    };

    recognition.onresult = (event) => {
        textFrom.value = event.results[0][0].transcript;
    };
} else {
    micBtn.style.display = "none";
}

// 7. TEXT TO SPEECH
function speakText(text) {
    if (!text) return;
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectTo.value;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

speakBtn.addEventListener("click", () => {
    speakText(textTo.value);
});

// Copy Functions
const copyToClipboard = (id) => {
    const field = document.getElementById(id);
    if(field.value) navigator.clipboard.writeText(field.value);
};
document.getElementById("copy-from").addEventListener("click", () => copyToClipboard("text-from"));
document.getElementById("copy-to").addEventListener("click", () => copyToClipboard("text-to"));

// Privacy Modal Logic
function openPrivacy() { document.getElementById('privacy-modal').classList.remove('hidden'); }
function closePrivacy() { document.getElementById('privacy-modal').classList.add('hidden'); }
