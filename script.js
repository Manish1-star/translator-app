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
        let langName = countries[code].split('(')[0].trim(); // Cleaner names
        
        let optionFrom = `<option value="${code}" ${selectedFrom}>${langName}</option>`;
        let optionTo = `<option value="${code}" ${selectedTo}>${langName}</option>`;
        selectFrom.insertAdjacentHTML("beforeend", optionFrom);
        selectTo.insertAdjacentHTML("beforeend", optionTo);
    });
}

textFrom.addEventListener("input", () => {
    charCount.innerText = `${textFrom.value.length}/5000`;
});

// 2. ULTRA FAST TRANSLATION LOGIC (Parallel Processing)
async function translateText() {
    let text = textFrom.value.trim();
    if (!text) return;

    textTo.value = "";
    textTo.setAttribute("placeholder", "Translating...");
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    translateBtn.disabled = true;

    let fromLang = selectFrom.value.split('-')[0];
    let toLang = selectTo.value.split('-')[0];

    // Split text into chunks (approx 500 chars)
    const chunks = splitText(text, 500); 
    
    try {
        // MAGIC HAPPENS HERE: Fetch ALL chunks at the same time (Parallel)
        const promises = chunks.map(chunk => 
            fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${fromLang}|${toLang}`)
            .then(res => res.json())
        );

        // Wait for all to finish
        const results = await Promise.all(promises);
        
        let translatedFullText = "";
        results.forEach(data => {
            if (data.responseData.translatedText) {
                translatedFullText += data.responseData.translatedText + " ";
            }
        });

        textTo.value = translatedFullText.trim();
        translateBtn.innerHTML = 'Translate <i class="fas fa-bolt text-yellow-300"></i>';
        translateBtn.disabled = false;

    } catch (error) {
        textTo.value = "Error: Network issue.";
        translateBtn.innerHTML = 'Try Again';
        translateBtn.disabled = false;
    }
}

function splitText(text, maxLength) {
    const regex = new RegExp(`.{1,${maxLength}}(\\s|$)|\\S+?(\\s|$)`, 'g');
    return text.match(regex) || [];
}

translateBtn.addEventListener("click", translateText);

// 3. IMAGE TO TEXT (OCR - New Feature)
imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    if (!file) return;

    ocrStatus.innerText = "Scanning Image...";
    ocrStatus.classList.remove("hidden");
    textFrom.value = "Scanning image, please wait...";

    try {
        const { data: { text } } = await Tesseract.recognize(file, 'eng', {
            logger: m => console.log(m)
        });
        
        textFrom.value = text;
        ocrStatus.classList.add("hidden");
        // Auto translate after scan
        translateText();
    } catch (error) {
        textFrom.value = "Error reading image.";
        ocrStatus.classList.add("hidden");
    }
});

// 4. EXCHANGE
exchangeBtn.addEventListener("click", () => {
    let tempLang = selectFrom.value;
    selectFrom.value = selectTo.value;
    selectTo.value = tempLang;
    let tempText = textFrom.value;
    textFrom.value = textTo.value;
    textTo.value = tempText;
});

// 5. SPEECH RECOGNITION
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = selectFrom.value;
    recognition.interimResults = false; // Changed to false for better stability

    micBtn.addEventListener("click", () => {
        recognition.lang = selectFrom.value;
        try {
            recognition.start();
            micBtn.classList.add("recording"); // Visual cue
        } catch (e) {
            recognition.stop();
            micBtn.classList.remove("recording");
        }
    });

    recognition.onend = () => {
        micBtn.classList.remove("recording");
        if(textFrom.value.trim().length > 0) translateText();
    };

    recognition.onresult = (event) => {
        textFrom.value = event.results[0][0].transcript;
    };
} else {
    micBtn.style.display = "none";
}

// 6. INSTANT TEXT TO SPEECH (Fixed)
function speakText(text) {
    if (!text) return;
    
    // Immediately stop previous audio
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectTo.value;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

speakBtn.addEventListener("click", () => {
    speakText(textTo.value);
});

// Copy & Privacy
const copyToClipboard = (id) => {
    const field = document.getElementById(id);
    if(field.value) navigator.clipboard.writeText(field.value);
};
document.getElementById("copy-from").addEventListener("click", () => copyToClipboard("text-from"));
document.getElementById("copy-to").addEventListener("click", () => copyToClipboard("text-to"));

function openPrivacy() { document.getElementById('privacy-modal').classList.remove('hidden'); }
function closePrivacy() { document.getElementById('privacy-modal').classList.add('hidden'); }
