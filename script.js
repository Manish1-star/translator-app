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
const statusTxt = document.getElementById("status-text");

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

// 2. REAL-TIME TYPING LISTENER (Debounce Logic)
let typingTimer;
const doneTypingInterval = 1000; // Wait 1 second after typing

textFrom.addEventListener("input", () => {
    charCount.innerText = `${textFrom.value.length}/5000`;
    clearTimeout(typingTimer);
    
    if (textFrom.value.trim().length > 0) {
        statusTxt.innerText = "Typing...";
        statusTxt.classList.remove("hidden");
        typingTimer = setTimeout(translateText, doneTypingInterval);
    } else {
        textTo.value = "";
        statusTxt.classList.add("hidden");
    }
});

// 3. TRANSLATION LOGIC (Smart Chunking for Unlimited Text)
async function translateText() {
    let text = textFrom.value.trim();
    if (!text) return;

    statusTxt.innerText = "Translating...";
    statusTxt.classList.remove("hidden");
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating...';
    translateBtn.disabled = true;

    let fromLang = selectFrom.value.split('-')[0];
    let toLang = selectTo.value.split('-')[0];

    // Split text into safe chunks (400 chars)
    const chunks = getSmartChunks(text, 400);
    
    let fullTranslation = "";

    try {
        // Process sequentially
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if(!chunk.trim()) continue;

            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${fromLang}|${toLang}`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.responseData.translatedText) {
                fullTranslation += data.responseData.translatedText + " ";
            }
        }

        textTo.value = fullTranslation.trim();
        translateBtn.innerHTML = 'Translate Now';
        translateBtn.disabled = false;

    } catch (error) {
        console.error(error);
        textTo.value = "Error: Check internet connection.";
        translateBtn.innerHTML = 'Try Again';
        translateBtn.disabled = false;
    } finally {
        statusTxt.classList.add("hidden");
    }
}

// Helper: Split text smartly
function getSmartChunks(str, maxLength) {
    const chunks = [];
    while (str.length > maxLength) {
        let p = str.substring(0, maxLength).lastIndexOf(" ");
        if (p === -1) p = maxLength;
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

    statusTxt.innerText = "Scanning Image...";
    statusTxt.classList.remove("hidden");
    textFrom.value = "Scanning image... please wait...";

    try {
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        textFrom.value = text;
        translateText();
    } catch (error) {
        textFrom.value = "Error scanning image.";
    } finally {
        statusTxt.classList.add("hidden");
    }
});

// 5. EXCHANGE BUTTON
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
            if (micBtn.classList.contains("recording")) {
                recognition.stop();
            } else {
                recognition.start();
            }
        } catch (e) {
            recognition.stop();
            micBtn.classList.remove("recording");
        }
    });

    recognition.onstart = () => {
        micBtn.classList.add("recording");
        statusTxt.innerText = "Listening...";
        statusTxt.classList.remove("hidden");
        textFrom.setAttribute("placeholder", "Listening...");
    };

    recognition.onend = () => {
        micBtn.classList.remove("recording");
        statusTxt.classList.add("hidden");
        textFrom.setAttribute("placeholder", "Type here...");
        if(textFrom.value.trim().length > 0) translateText();
    };

    recognition.onresult = (event) => {
        textFrom.value = event.results[0][0].transcript;
    };
} else {
    micBtn.style.display = "none";
}

// 7. TEXT TO SPEECH (Natural Voice Optimizer) - ENGLISH UPDATED
function speakText(text) {
    if (!text) return;
    
    // Stop any currently playing audio
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectTo.value; // Target language from dropdown

    // ⚡ MAGIC TRICK: Try to find a "Google" or "Natural" voice
    const voices = window.speechSynthesis.getVoices();
    
    // 1. First, try to find a "Google" voice (Usually high quality)
    let targetVoice = voices.find(voice => 
        voice.lang.includes(selectTo.value) && voice.name.includes('Google')
    );

    // 2. If Google not found, try "Natural" voice (Great for Microsoft Edge)
    if (!targetVoice) {
        targetVoice = voices.find(voice => 
            voice.lang.includes(selectTo.value) && voice.name.includes('Natural')
        );
    }

    // 3. If neither found, fallback to the default system voice
    if (!targetVoice) {
        targetVoice = voices.find(voice => voice.lang.includes(selectTo.value));
    }

    // If a specific voice is found, set it
    if (targetVoice) {
        utterance.voice = targetVoice;
    }

    // Adjust Speed and Pitch
    utterance.rate = 0.9;  // Slightly slower than normal for clarity
    utterance.pitch = 1.0; // Normal pitch

    window.speechSynthesis.speak(utterance);
}

// Ensure voices are loaded asynchronously
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

speakBtn.addEventListener("click", () => {
    speakText(textTo.value);
});

// Copy & Privacy Logic
const copyToClipboard = (id) => {
    const field = document.getElementById(id);
    if(field.value) navigator.clipboard.writeText(field.value);
};
document.getElementById("copy-from").addEventListener("click", () => copyToClipboard("text-from"));
document.getElementById("copy-to").addEventListener("click", () => copyToClipboard("text-to"));

function openPrivacy() { document.getElementById('privacy-modal').classList.remove('hidden'); }
function closePrivacy() { document.getElementById('privacy-modal').classList.add('hidden'); }
