const selectFrom = document.getElementById("select-from");
const selectTo = document.getElementById("select-to");
const textFrom = document.getElementById("text-from");
const textTo = document.getElementById("text-to");
const translateBtn = document.getElementById("translate-btn");
const micBtn = document.getElementById("mic-btn");
const speakBtn = document.getElementById("speak-btn");
const exchangeBtn = document.getElementById("exchange");
const statusTxt = document.getElementById("listening-status");

// 1. Populate Languages (Display list from languages.js)
if (typeof countries !== 'undefined') {
    selectFrom.innerHTML = "";
    selectTo.innerHTML = "";

    Object.keys(countries).forEach((code) => {
        // Default Selection: Nepali -> English
        let selectedFrom = code === "ne-NP" ? "selected" : "";
        let selectedTo = code === "en-US" ? "selected" : "";

        let optionFrom = `<option value="${code}" ${selectedFrom}>${countries[code]}</option>`;
        selectFrom.insertAdjacentHTML("beforeend", optionFrom);

        let optionTo = `<option value="${code}" ${selectedTo}>${countries[code]}</option>`;
        selectTo.insertAdjacentHTML("beforeend", optionTo);
    });
}

// 2. Translation Logic
async function translateText() {
    let text = textFrom.value.trim();
    if (!text) return;

    textTo.setAttribute("placeholder", "Translating...");
    translateBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Translating...';

    // Extract language codes for API (e.g., 'ne-NP' -> 'ne')
    let fromLang = selectFrom.value.split('-')[0];
    let toLang = selectTo.value.split('-')[0];

    try {
        // Using Free MyMemory Translation API
        const apiUrl = `https://api.mymemory.translated.net/get?q=${text}&langpair=${fromLang}|${toLang}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if(data.responseData.translatedText) {
            textTo.value = data.responseData.translatedText;
            
            // Auto Speak after translation (Optional - remove // to enable)
            // speakText(textTo.value); 
        } else {
            textTo.value = "Translation Error or Daily Limit Reached.";
        }
        translateBtn.innerHTML = 'Translate Now <i class="fas fa-arrow-right"></i>';

    } catch (error) {
        textTo.value = "Something went wrong! Please try again.";
        translateBtn.innerHTML = 'Translate Now <i class="fas fa-arrow-right"></i>';
    }
}

translateBtn.addEventListener("click", translateText);

// 3. Exchange Languages
exchangeBtn.addEventListener("click", () => {
    let tempLang = selectFrom.value;
    selectFrom.value = selectTo.value;
    selectTo.value = tempLang;
    
    let tempText = textFrom.value;
    textFrom.value = textTo.value;
    textTo.value = tempText;
});

// 4. Speech to Text (Microphone)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = selectFrom.value;
    recognition.interimResults = true;

    micBtn.addEventListener("click", () => {
        recognition.lang = selectFrom.value; // Update language before starting

        if (micBtn.classList.contains("recording")) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    recognition.onstart = () => {
        micBtn.classList.add("recording");
        statusTxt.classList.remove("hidden");
        textFrom.setAttribute("placeholder", "Listening...");
    };

    recognition.onend = () => {
        micBtn.classList.remove("recording");
        statusTxt.classList.add("hidden");
        textFrom.setAttribute("placeholder", "Type or Speak here...");
        
        // Auto translate when speaking stops
        if(textFrom.value.trim().length > 0) {
            translateText();
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textFrom.value = transcript;
    };
} else {
    micBtn.style.display = "none";
    alert("Your browser does not support Speech Recognition. Please use Google Chrome.");
}

// 5. Text to Speech (Speaker)
function speakText(text) {
    if (!text) return;
    window.speechSynthesis.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectTo.value; // Speak in target language
    utterance.rate = 0.9; // Speed (Normal)
    window.speechSynthesis.speak(utterance);
}

speakBtn.addEventListener("click", () => {
    speakText(textTo.value);
});

// Copy Buttons
const copyToClipboard = (id) => {
    const field = document.getElementById(id);
    if(field.value) {
        navigator.clipboard.writeText(field.value);
        // Optional: Show a small toast or alert
        // alert("Copied to clipboard!");
    }
};
document.getElementById("copy-from").addEventListener("click", () => copyToClipboard("text-from"));
document.getElementById("copy-to").addEventListener("click", () => copyToClipboard("text-to"));
