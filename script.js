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

// 2. REAL TIME TYPING LOGIC (Debounce)
// This waits for you to STOP typing for 1 second before translating
let typingTimer;
const doneTypingInterval = 1000; // 1 second

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

// 3. ROBUST TRANSLATION LOGIC
async function translateText() {
    let text = textFrom.value.trim();
    if (!text) return;

    statusTxt.innerText = "Translating...";
    statusTxt.classList.remove("hidden");
    translateBtn.innerText = "Translating...";
    translateBtn.disabled = true;

    let fromLang = selectFrom.value.split('-')[0];
    let toLang = selectTo.value.split('-')[0];

    try {
        // Use encodeURIComponent to handle special characters safely
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.responseData.translatedText) {
            textTo.value = data.responseData.translatedText;
        } else {
            textTo.value = "Translation Error (Try shorter text)";
        }

    } catch (error) {
        console.error(error);
        textTo.value = "Network Error. Please check internet.";
    } finally {
        // Always reset UI even if error occurs
        statusTxt.classList.add("hidden");
        translateBtn.innerText = "Translate Now";
        translateBtn.disabled = false;
    }
}

translateBtn.addEventListener("click", translateText);

// 4. IMAGE SCANNER (Optimized)
imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    if (!file) return;

    statusTxt.innerText = "Scanning Image...";
    statusTxt.classList.remove("hidden");
    textFrom.value = "Scanning... please wait (this takes time on mobile)...";

    try {
        // Tesseract needs time to load core files
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        
        textFrom.value = text;
        translateText(); // Auto translate after scan
    } catch (error) {
        textFrom.value = "Error reading image.";
    } finally {
        statusTxt.classList.add("hidden");
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

// 7. TEXT TO SPEECH
function speakText(text) {
    if (!text) return;
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop old sound immediately
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectTo.value;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Audio not supported on this browser.");
    }
}

speakBtn.addEventListener("click", () => {
    speakText(textTo.value);
});

// Copy
const copyToClipboard = (id) => {
    const field = document.getElementById(id);
    if(field.value) navigator.clipboard.writeText(field.value);
};
document.getElementById("copy-from").addEventListener("click", () => copyToClipboard("text-from"));
document.getElementById("copy-to").addEventListener("click", () => copyToClipboard("text-to"));
