const selectFrom = document.getElementById("select-from");
const selectTo = document.getElementById("select-to");
const textFrom = document.getElementById("text-from");
const textTo = document.getElementById("text-to");
const translateBtn = document.getElementById("translate-btn");
const micBtn = document.getElementById("mic-btn");
const speakBtn = document.getElementById("speak-btn");
const exchangeBtn = document.getElementById("exchange");
const statusTxt = document.getElementById("listening-status");
const charCount = document.getElementById("char-count");

// 1. POPULATE LANGUAGES
if (typeof countries !== 'undefined') {
    selectFrom.innerHTML = "";
    selectTo.innerHTML = "";
    Object.keys(countries).forEach((code) => {
        let selectedFrom = code === "ne-NP" ? "selected" : "";
        let selectedTo = code === "en-US" ? "selected" : "";
        let optionFrom = `<option value="${code}" ${selectedFrom}>${countries[code]}</option>`;
        let optionTo = `<option value="${code}" ${selectedTo}>${countries[code]}</option>`;
        selectFrom.insertAdjacentHTML("beforeend", optionFrom);
        selectTo.insertAdjacentHTML("beforeend", optionTo);
    });
}

// 2. CHARACTER COUNTER
textFrom.addEventListener("input", () => {
    let len = textFrom.value.length;
    charCount.innerText = `${len} / 5000`;
});

// 3. UNLIMITED TRANSLATION LOGIC (Chunking)
async function translateText() {
    let text = textFrom.value.trim();
    if (!text) return;

    textTo.setAttribute("placeholder", "Translating...");
    translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    translateBtn.disabled = true;

    let fromLang = selectFrom.value.split('-')[0];
    let toLang = selectTo.value.split('-')[0];

    // Split text into chunks of ~500 chars (sentence aware)
    const chunks = splitText(text, 450); 
    let translatedFullText = "";

    try {
        for (let i = 0; i < chunks.length; i++) {
            // Update button to show progress
            translateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Part ${i+1}/${chunks.length}...`;
            
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunks[i])}&langpair=${fromLang}|${toLang}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.responseData.translatedText) {
                translatedFullText += data.responseData.translatedText + " ";
            }
        }

        textTo.value = translatedFullText.trim();
        translateBtn.innerHTML = 'Translate All Text <i class="fas fa-magic"></i>';
        translateBtn.disabled = false;

    } catch (error) {
        textTo.value = "Error: Check internet or try shorter text.";
        translateBtn.innerHTML = 'Try Again';
        translateBtn.disabled = false;
    }
}

// Helper: Split text smartly by sentences
function splitText(text, maxLength) {
    const regex = new RegExp(`.{1,${maxLength}}(\\s|$)|\\S+?(\\s|$)`, 'g');
    return text.match(regex) || [];
}

translateBtn.addEventListener("click", translateText);

// 4. EXCHANGE
exchangeBtn.addEventListener("click", () => {
    let tempLang = selectFrom.value;
    selectFrom.value = selectTo.value;
    selectTo.value = tempLang;
    let tempText = textFrom.value;
    textFrom.value = textTo.value;
    textTo.value = tempText;
});

// 5. SPEECH RECOGNITION (Voice to Text)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = selectFrom.value;
    recognition.interimResults = true;

    micBtn.addEventListener("click", () => {
        recognition.lang = selectFrom.value;
        if (micBtn.classList.contains("recording")) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    recognition.onstart = () => {
        micBtn.classList.add("recording");
        statusTxt.classList.remove("hidden");
        statusTxt.classList.add("flex");
        textFrom.setAttribute("placeholder", "Listening...");
    };

    recognition.onend = () => {
        micBtn.classList.remove("recording");
        statusTxt.classList.add("hidden");
        statusTxt.classList.remove("flex");
        textFrom.setAttribute("placeholder", "Type or Paste unlimited text here...");
        
        // Auto translate after 1 second of silence
        if(textFrom.value.trim().length > 0) {
            setTimeout(translateText, 1000);
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textFrom.value = transcript;
        charCount.innerText = `${transcript.length} / 5000`;
    };
} else {
    micBtn.style.display = "none";
}

// 6. TEXT TO SPEECH (Better Quality Attempt)
function speakText(text) {
    if (!text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectTo.value;
    
    // Try to find a better voice
    const voices = window.speechSynthesis.getVoices();
    // Prefer Google voices if available (usually sound better)
    const targetVoice = voices.find(voice => voice.lang.includes(selectTo.value) && voice.name.includes('Google'));
    
    if (targetVoice) utterance.voice = targetVoice;
    
    utterance.rate = 1; 
    window.speechSynthesis.speak(utterance);
}

// Make sure voices are loaded
window.speechSynthesis.onvoiceschanged = () => {
    // Voices loaded
};

speakBtn.addEventListener("click", () => {
    speakText(textTo.value);
});

// Copy
const copyToClipboard = (id) => {
    const field = document.getElementById(id);
    if(field.value) {
        navigator.clipboard.writeText(field.value);
        // Visual feedback could be added here
    }
};
document.getElementById("copy-from").addEventListener("click", () => copyToClipboard("text-from"));
document.getElementById("copy-to").addEventListener("click", () => copyToClipboard("text-to"));
