export { GeminiSttProvider };

const DEBUG_PREFIX = '<Speech Recognition module (Gemini STT)> ';

// Helper function to convert Blob to Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Remove data prefix part (e.g., "data:audio/wav;base64,")
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

class GeminiSttProvider {
    settings;

    defaultSettings = {
        apiKey: '',
        baseUrl: 'https://generativelanguage.googleapis.com',
        modelName: 'gemini-2.5-flash-preview-04-17', // Default model as per user's request
        prompt: 'You are a speech recognition assistant. Transcribe verbatim any audio files the user sends you, without adding or omitting any words. Apart from the transcription itself, do not generate any other content. When outputting Chinese, use Simplified Chinese by default.',
    };

    get settingsHtml() {
        let html = `
            <div class="stt_settings_group">
                <label for="stt_gemini_api_key">API Key</label>
                <input type="password" id="stt_gemini_api_key" class="text_pole" value="${this.settings?.apiKey ?? ''}">
            </div>
            <div class="stt_settings_group">
                <label for="stt_gemini_base_url">Base URL</label>
                <input type="text" id="stt_gemini_base_url" class="text_pole" value="${this.settings?.baseUrl ?? this.defaultSettings.baseUrl}">
            </div>
            <div class="stt_settings_group">
                <label for="stt_gemini_model_name">Model Name</label>
                <input type="text" id="stt_gemini_model_name" class="text_pole" value="${this.settings?.modelName ?? this.defaultSettings.modelName}">
            </div>
            <div class="stt_settings_group">
                <label for="stt_gemini_prompt">Prompt</label>
                <textarea id="stt_gemini_prompt" class="text_pole" rows="3">${this.settings?.prompt ?? this.defaultSettings.prompt}</textarea>
            </div>
        `;
        return html;
    }

    onSettingsChange() {
        if (!this.settings) this.settings = { ...this.defaultSettings };
        this.settings.apiKey = $('#stt_gemini_api_key').val();
        this.settings.baseUrl = $('#stt_gemini_base_url').val();
        this.settings.modelName = $('#stt_gemini_model_name').val();
        this.settings.prompt = $('#stt_gemini_prompt').val();
        console.debug(DEBUG_PREFIX + 'Settings changed', this.settings);
    }

    loadSettings(settings) {
        if (settings && Object.keys(settings).length > 0) {
            this.settings = { ...this.defaultSettings, ...settings };
        } else {
            this.settings = { ...this.defaultSettings };
            console.debug(DEBUG_PREFIX + 'Using default Gemini STT extension settings');
        }

        $('#stt_gemini_api_key').val(this.settings.apiKey);
        $('#stt_gemini_base_url').val(this.settings.baseUrl);
        $('#stt_gemini_model_name').val(this.settings.modelName);
        $('#stt_gemini_prompt').val(this.settings.prompt);
        console.debug(DEBUG_PREFIX + 'Gemini STT settings loaded');
    }

    async processAudio(audioBlob) {
        if (!this.settings) {
            this.settings = { ...this.defaultSettings };
             console.warn(DEBUG_PREFIX + 'Settings not initialized, using defaults.');
        }
        if (!this.settings.apiKey) {
            toastr.error('API Key is not set for Gemini STT.', 'STT Configuration Error');
            throw new Error('API Key is not set for Gemini STT.');
        }
        if (!this.settings.baseUrl) {
            toastr.error('Base URL is not set for Gemini STT.', 'STT Configuration Error');
            throw new Error('Base URL is not set for Gemini STT.');
        }
        if (!this.settings.modelName) {
            toastr.error('Model Name is not set for Gemini STT.', 'STT Configuration Error');
            throw new Error('Model Name is not set for Gemini STT.');
        }

        try {
            const base64Audio = await blobToBase64(audioBlob);
            const requestUrl = `${this.settings.baseUrl.replace(/\/$/, '')}/v1beta/models/${this.settings.modelName}:generateContent?key=${this.settings.apiKey}`;

            const requestBody = {
                contents: [{
                    parts: [
                        { text: this.settings.prompt },
                        {
                            inline_data: {
                                mime_type: "audio/wav", // Assuming input is WAV as per existing extension's conversion
                                data: base64Audio
                            }
                        }
                    ]
                }],
            };

            console.debug(DEBUG_PREFIX + 'Sending request to Gemini:', requestUrl, JSON.stringify(requestBody, null, 2).substring(0, 500) + '...');


            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                let errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error && errorJson.error.message) {
                        errorText = errorJson.error.message;
                    }
                } catch (e) {
                    // Ignore if not JSON
                }
                toastr.error(`Gemini API Error: ${response.status} ${response.statusText}. ${errorText}`, 'STT Generation Failed (Gemini)');
                throw new Error(`Gemini API Error: ${response.status} ${response.statusText}. Details: ${errorText}`);
            }

            const result = await response.json();
            console.debug(DEBUG_PREFIX + 'Gemini API response:', result);

            // Extract text from response. Structure can be:
            // result.candidates[0].content.parts[0].text
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0 &&
                typeof result.candidates[0].content.parts[0].text === 'string') {
                return result.candidates[0].content.parts[0].text.trim();
            } else {
                console.error(DEBUG_PREFIX + 'Unexpected response structure from Gemini API:', result);
                toastr.error('Failed to parse transcription from Gemini API response.', 'STT Error (Gemini)');
                throw new Error('Failed to parse transcription from Gemini API response.');
            }

        } catch (error) {
            console.error(DEBUG_PREFIX + 'Error in processAudio:', error);
            toastr.error(error.message || 'An unknown error occurred with Gemini STT.', 'STT Error (Gemini)');
            throw error;
        }
    }
}
