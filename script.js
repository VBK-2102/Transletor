// Language mapping with Hindi voice for most Indian languages
const LANGUAGES = {
    "English": "en", "Hindi": "hi", "Kannada": "kn", "Marathi": "mr", "Tamil": "ta",
    "Telugu": "te", "Spanish": "es", "French": "fr", "Arabic": "ar",
    "Bengali": "bn", "Chinese": "zh", "German": "de", "Japanese": "ja",
    "Portuguese": "pt", "Russian": "ru", "Urdu": "ur", "Punjabi": "pa",
    "Gujarati": "gu", "Malayalam": "ml", "Odia": "or", "Italian": "it",
    "Dutch": "nl", "Korean": "ko", "Turkish": "tr", "Vietnamese": "vi", 
    "Thai": "th", "Haryanvi": "hi" // Using 'hi' (Hindi) as the code but will handle specially in translation
};

// Special voice mapping with improved Telugu voice options
const VOICE_MAPPING = {
    "te": { // Telugu - multiple options for better compatibility
        primaryVoice: "Microsoft Chitra - Telugu (India)",
        fallbackVoices: [
            "Google తెలుగు",
            "Microsoft Gopal - Telugu (India)"
        ],
        lang: "te-IN",
        name: "Telugu"
    },
    "bn": { // Bengali
        voiceURI: "Google বাংলা",
        lang: "bn-IN",
        name: "Bengali"
    },
    "hi": { // Hindi voice for all other Indian languages including Haryanvi
        voiceURI: "Google हिन्दी",
        lang: "hi-IN",
        name: "Hindi"
    }
};

// Conversation history
let conversationHistory = [];
let isPlayingBack = false;
let currentPlaybackIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    const doctorBtn = document.getElementById('doctor-btn');
    const patientBtn = document.getElementById('patient-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadBtn = document.getElementById('download-btn');
    const playbackBtn = document.getElementById('playback-btn');
    const doctorLang = document.getElementById('doctor-lang-input');
    const patientLang = document.getElementById('patient-lang-input');
    const latestMessageContainer = document.getElementById('latest-message-container');
    const conversationHistoryContainer = document.getElementById('conversation-history');

    // Populate language dropdowns
    function populateLanguageDropdowns() {
        const dropdowns = [doctorLang, patientLang];
        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = '';
            
            // Add Indian languages first
            const indianGroup = document.createElement('optgroup');
            indianGroup.label = "Indian Languages";
            dropdown.appendChild(indianGroup);
            
            // Add other languages
            const otherGroup = document.createElement('optgroup');
            otherGroup.label = "Other Languages";
            dropdown.appendChild(otherGroup);
            
            Object.keys(LANGUAGES).forEach(lang => {
                const option = document.createElement('option');
                option.value = lang;
                option.textContent = lang;
                
                if (["English", "Spanish", "French", "Arabic", "Russian", "Chinese"].includes(lang)) {
                    otherGroup.appendChild(option);
                } else {
                    indianGroup.appendChild(option);
                }
            });
        });
        
        // Set default values
        doctorLang.value = "English";
        patientLang.value = "Hindi";
    }

    // Check browser support
    if (!('webkitSpeechRecognition' in window)) {
        doctorBtn.disabled = true;
        patientBtn.disabled = true;
        doctorBtn.innerHTML = '<i class="bi bi-mic-mute"></i> <span class="btn-label">Not supported</span>';
        patientBtn.innerHTML = '<i class="bi bi-mic-mute"></i> <span class="btn-label">Not supported</span>';
        alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        return;
    }

    // Initialize speech recognition
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    // Initialize voices
    let voices = [];
    function loadVoices() {
        voices = window.speechSynthesis.getVoices();
        console.log("Available voices:", voices); // Debug: Log available voices
    }
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    // Helper functions
    function flashStatus(button, originalLabel) {
        const labelSpan = button.querySelector('.btn-label');
        labelSpan.textContent = "Listening...";
        button.disabled = true;
        
        setTimeout(() => {
            labelSpan.textContent = "Recognizing...";
        }, 2000);
    }

    function resetButton(button, originalLabel) {
        const labelSpan = button.querySelector('.btn-label');
        labelSpan.textContent = originalLabel;
        button.disabled = false;
    }

    function addMessageToHistory(speaker, originalText, translatedText) {
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(/,/g, '');

        const message = {
            timestamp: `[${timestamp}]`,
            speaker: speaker.toLowerCase(),
            original: originalText,
            translated: translatedText,
            doctorLang: doctorLang.value,
            patientLang: patientLang.value
        };

        conversationHistory.push(message);
        updateConversationHistoryUI();
    }

    function updateConversationHistoryUI() {
        if (conversationHistory.length === 0) {
            conversationHistoryContainer.innerHTML = '<p><em>No history yet.</em></p>';
            return;
        }

        let html = '';
        conversationHistory.forEach((entry, index) => {
            const langUsed = entry.speaker === 'doctor' ? entry.patientLang : entry.doctorLang;
            const isActive = isPlayingBack && currentPlaybackIndex === index;
            html += `
                <article class="chat-message ${entry.speaker} ${isActive ? 'active-playback' : ''}" aria-label="${entry.speaker} message" data-index="${index}">
                    <img src="${entry.speaker === 'doctor' ? 'image/doctor.jpg' : 'image/patient.jpg'}" class="avatar" alt="${entry.speaker} Avatar" />
                    <div class="message-bubble">
                        <strong>${entry.original}</strong><br>
                        <em>Translated to ${langUsed}: ${entry.translated}</em>
                        <div class="timestamp">${entry.timestamp}</div>
                    </div>
                </article>
            `;
        });

        conversationHistoryContainer.innerHTML = html;
        conversationHistoryContainer.scrollTop = conversationHistoryContainer.scrollHeight;
    }

    function updateLatestMessage(speaker, originalText, translatedText, targetLangName) {
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(/,/g, '');

        latestMessageContainer.innerHTML = `
            <article class="chat-message ${speaker.toLowerCase()}" aria-label="${speaker} message">
                <img src="${speaker.toLowerCase() === 'doctor' ? 'image/doctor.jpg' : 'image/patient.jpg'}" class="avatar" alt="${speaker} Avatar" />
                <div class="message-bubble">
                    <strong>${originalText}</strong><br>
                    <em>Translated to ${targetLangName}: ${translatedText}</em>
                    <div class="timestamp">[${timestamp}]</div>
                </div>
            </article>
        `;
    }

    function translateText(text, targetLang, sourceLangName) {
        return new Promise((resolve, reject) => {
            // Special handling for Haryanvi
            if (sourceLangName === "Haryanvi") {
                // If translating from Haryanvi to English
                if (targetLang === "English") {
                    // Preprocess Haryanvi input to Hindi
                    let preprocessed = text.replace(/सै/g, 'है').replace(/हूं सै/g, 'हूँ');
                    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(preprocessed)}&langpair=hi|en`;
                    fetch(url)
                        .then(response => response.json())
                        .then(data => {
                            if (data && data.responseData && data.responseData.translatedText) {
                                resolve(data.responseData.translatedText);
                            } else {
                                reject("Translation failed");
                            }
                        })
                        .catch(error => {
                            reject(error);
                        });
                } else {
                    // Haryanvi to Hindi or other Indian language (default: Hindi)
                    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|hi`;
                    fetch(url)
                        .then(response => response.json())
                        .then(data => {
                            if (data && data.responseData && data.responseData.translatedText) {
                                // Post-process the translation to make it more Haryanvi-like
                                let translated = data.responseData.translatedText;
                                // Add some Haryanvi flavor (this is simplistic - you might want a better approach)
                                translated = translated.replace(/है/g, 'सै');
                                translated = translated.replace(/हूँ/g, 'हूं सै');
                                resolve(translated);
                            } else {
                                reject("Translation failed");
                            }
                        })
                        .catch(error => {
                            reject(error);
                        });
                }
            } else {
                // Standard Google Translate API for other languages
                const langCode = targetLang === "Haryanvi" ? "hi" : LANGUAGES[targetLang];
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`;
                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data[0] && data[0][0] && data[0][0][0]) {
                            let translated = data[0][0][0];
                            // If target is Haryanvi, modify the Hindi translation
                            if (targetLang === "Haryanvi") {
                                translated = translated.replace(/है/g, 'सै');
                                translated = translated.replace(/हूँ/g, 'हूं सै');
                                translated = translated.replace(/मैं/g, 'मैं सै');
                                translated = translated.replace(/तू/g, 'तू सै');
                                translated = translated.replace(/आप/g, 'तू सै');
                                translated = translated.replace(/तुम/g, 'तू सै');
                                translated = translated.replace(/हैं/g, 'सैं');
                                translated = translated.replace(/करता हूँ/g, 'करूं सै');
                                translated = translated.replace(/करती हूँ/g, 'करूं सै');
                                translated = translated.replace(/कहाँ/g, 'कते');
                                translated = translated.replace(/क्यों/g, 'क्याँ');
                                translated = translated.replace(/क्या/g, 'के');
                                translated = translated.replace(/कैसे/g, 'कैसें');
                                translated = translated.replace(/कब/g, 'कदे');
                                translated = translated.replace(/नहीं/g, 'कोए ना');
                                translated = translated.replace(/थोड़ा/g, 'थोड़ा सा');
                                translated = translated.replace(/बहुत/g, 'घणा');
                                translated = translated.replace(/ठीक/g, 'बिलकुल');
                                translated = translated.replace(/खुश हूँ/g, 'खुश सै');
                                translated = translated.replace(/ठीक हूँ/g, 'ठीक सै');
                                translated = translated.replace(/कितना/g, 'कित्ते');
                                translated = translated.replace(/कौन/g, 'के');
                                translated = translated.replace(/मुझे/g, 'मने');
                                translated = translated.replace(/तुम्हें/g, 'तन्ने');
                                translated = translated.replace(/हमें/g, 'हमने');
                                translated = translated.replace(/उसको/g, 'उसने');
                                translated = translated.replace(/इसको/g, 'इसने');
                                translated = translated.replace(/मैंने/g, 'मैं के');
                                translated = translated.replace(/जा रहा हूँ/g, 'जाऊं सै');
                                translated = translated.replace(/जा रही हूँ/g, 'जाऊं सै');
                                translated = translated.replace(/खा रहा हूँ/g, 'खाऊं सै');
                                translated = translated.replace(/पी रहा हूँ/g, 'पियूं सै');
                                translated = translated.replace(/नमस्कार/g, 'राम राम');
                                translated = translated.replace(/नमस्ते/g, 'राम राम');
                            }
                            resolve(translated);
                        } else {
                            reject("Translation failed");
                        }
                    })
                    .catch(error => {
                        reject(error);
                    });
            }
        });
    }

    function textToSpeech(text, langCode, langName) {
        return new Promise((resolve) => {
            // Wait for voices to be loaded if not already
            if (speechSynthesis.getVoices().length === 0) {
                speechSynthesis.onvoiceschanged = function() {
                    speechSynthesis.onvoiceschanged = null;
                    doTextToSpeech(text, langCode, langName, resolve);
                };
                return;
            }
            doTextToSpeech(text, langCode, langName, resolve);
        });
    }

    function doTextToSpeech(text, langCode, langName, resolve) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        const availableVoices = window.speechSynthesis.getVoices();
        console.log("Available voices for TTS:", availableVoices); // Debug: Log voices
        
        // Special handling for Telugu voices
        if (langCode === 'te') {
            console.log("Looking for Telugu voice...");
            
            // Try to find the best available Telugu voice
            let teluguVoice = null;
            
            // First try Microsoft Chitra
            teluguVoice = availableVoices.find(voice => 
                voice.name.includes("Chitra") && voice.lang.includes("te")
            );
            
            // If not found, try any Microsoft Telugu voice
            if (!teluguVoice) {
                teluguVoice = availableVoices.find(voice => 
                    voice.name.includes("Microsoft") && voice.lang.includes("te")
                );
            }
            
            // If still not found, try Google Telugu
            if (!teluguVoice) {
                teluguVoice = availableVoices.find(voice => 
                    voice.name.includes("Google") && voice.lang.includes("te")
                );
            }
            
            // Fallback to any Telugu voice
            if (!teluguVoice) {
                teluguVoice = availableVoices.find(voice => 
                    voice.lang.startsWith("te")
                );
            }
            
            if (teluguVoice) {
                console.log("Using Telugu voice:", teluguVoice);
                utterance.voice = teluguVoice;
                utterance.lang = teluguVoice.lang;
            } else {
                console.log("No Telugu voice found, using default");
                utterance.lang = "te-IN";
            }
        } 
        // For other Indian languages, use appropriate voice
        else if (langCode === 'hi' || langCode === 'bn') {
            const voiceConfig = VOICE_MAPPING[langCode];
            if (voiceConfig.voiceURI) {
                const bestVoice = availableVoices.find(voice => 
                    voice.voiceURI === voiceConfig.voiceURI
                );
                if (bestVoice) {
                    utterance.voice = bestVoice;
                    utterance.lang = bestVoice.lang;
                } else {
                    utterance.lang = voiceConfig.lang;
                }
            } else {
                utterance.lang = langCode + "-IN";
            }
        } 
        // For non-Indian languages
        else {
            utterance.lang = langCode;
            
            // Try to find a voice for the target language
            const targetVoice = availableVoices.find(voice => 
                voice.lang.startsWith(langCode)
            );
            
            if (targetVoice) {
                utterance.voice = targetVoice;
            }
        }
        
        console.log("Final voice settings:", {
            text: text,
            lang: utterance.lang,
            voice: utterance.voice ? utterance.voice.name : 'default'
        });
        
        utterance.onerror = (event) => {
            console.error("SpeechSynthesis error:", event);
            resolve();
        };
        
        utterance.onend = () => {
            console.log("SpeechSynthesis complete");
            resolve();
        };
        
        speechSynthesis.speak(utterance);
    }

    async function handleSpeech(speaker) {
        const targetLangName = speaker === 'Doctor' ? patientLang.value : doctorLang.value;
        const targetLangCode = targetLangName === "Haryanvi" ? "hi" : LANGUAGES[targetLangName] || 'en';
        const sourceLangName = speaker === 'Doctor' ? doctorLang.value : patientLang.value;
        const sourceLangCode = sourceLangName === "Haryanvi" ? "hi" : LANGUAGES[sourceLangName] || 'en';
        
        flashStatus(speaker === 'Doctor' ? doctorBtn : patientBtn, 
                  speaker === 'Doctor' ? 'Doctor Speaking' : 'Patient Speaking');

        try {
            // For Haryanvi, we'll use Hindi recognition
            recognition.lang = sourceLangCode;
            recognition.start();

            const recognitionResult = await new Promise((resolve, reject) => {
                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    resolve(transcript);
                };

                recognition.onerror = (event) => {
                    reject(event.error);
                };
            });

            if (!recognitionResult.trim()) {
                throw new Error("No speech detected");
            }

            const translatedText = await translateText(recognitionResult, targetLangName, sourceLangName);
            updateLatestMessage(speaker, recognitionResult, translatedText, targetLangName);
            addMessageToHistory(speaker, recognitionResult, translatedText);
            await textToSpeech(translatedText, targetLangCode, targetLangName);

        } catch (error) {
            console.error("Error:", error);
            updateLatestMessage(speaker, "Error processing speech", error.message, targetLangName);
        } finally {
            resetButton(speaker === 'Doctor' ? doctorBtn : patientBtn, 
                      speaker === 'Doctor' ? 'Doctor Speaking' : 'Patient Speaking');
        }
    }

    // Playback functions
    async function playConversation() {
        if (conversationHistory.length === 0) {
            alert("No conversation to play back");
            return;
        }

        if (isPlayingBack) {
            // If already playing, stop playback
            speechSynthesis.cancel();
            isPlayingBack = false;
            currentPlaybackIndex = 0;
            playbackBtn.innerHTML = '<i class="bi bi-play-fill"></i> <span class="btn-label">Play Conversation</span>';
            updateConversationHistoryUI();
            return;
        }

        isPlayingBack = true;
        currentPlaybackIndex = 0;
        playbackBtn.innerHTML = '<i class="bi bi-stop-fill"></i> <span class="btn-label">Stop Playback</span>';
        
        // Disable other buttons during playback
        doctorBtn.disabled = true;
        patientBtn.disabled = true;
        clearBtn.disabled = true;
        downloadBtn.disabled = true;

        // Play each message in sequence
        for (currentPlaybackIndex = 0; currentPlaybackIndex < conversationHistory.length; currentPlaybackIndex++) {
            if (!isPlayingBack) break;
            
            const message = conversationHistory[currentPlaybackIndex];
            updateConversationHistoryUI();
            
            // Determine the target language for this message
            const targetLangName = message.speaker === 'doctor' ? message.patientLang : message.doctorLang;
            const targetLangCode = targetLangName === "Haryanvi" ? "hi" : LANGUAGES[targetLangName] || 'en';
            
            try {
                await textToSpeech(message.translated, targetLangCode, targetLangName);
            } catch (error) {
                console.error("Error during playback:", error);
            }
        }

        // Reset after playback completes
        isPlayingBack = false;
        currentPlaybackIndex = 0;
        playbackBtn.innerHTML = '<i class="bi bi-play-fill"></i> <span class="btn-label">Play Conversation</span>';
        updateConversationHistoryUI();
        
        // Re-enable buttons
        doctorBtn.disabled = false;
        patientBtn.disabled = false;
        clearBtn.disabled = false;
        downloadBtn.disabled = false;
    }

    // Initialize the app
    populateLanguageDropdowns();

    // Event listeners
    doctorBtn.addEventListener('click', () => handleSpeech('Doctor'));
    patientBtn.addEventListener('click', () => handleSpeech('Patient'));
    playbackBtn.addEventListener('click', playConversation);

    clearBtn.addEventListener('click', () => {
        conversationHistory = [];
        updateConversationHistoryUI();
        latestMessageContainer.innerHTML = '<p><em>Not yet started.</em></p>';
    });

    downloadBtn.addEventListener('click', () => {
        if (conversationHistory.length === 0) {
            alert("No conversation to download");
            return;
        }

        let content = "Doctor-Patient Conversation Transcript\n\n";
        content += `Doctor's Language: ${doctorLang.value}\n`;
        content += `Patient's Language: ${patientLang.value}\n\n`;
        
        conversationHistory.forEach(entry => {
            const direction = entry.speaker === 'doctor' ? 
                `(Doctor in ${entry.doctorLang} → Patient in ${entry.patientLang})` :
                `(Patient in ${entry.patientLang} → Doctor in ${entry.doctorLang})`;
            
            content += `${entry.timestamp} ${entry.speaker}: ${entry.original}\n`;
            content += `Translated ${direction}: ${entry.translated}\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'conversation_transcript.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});
