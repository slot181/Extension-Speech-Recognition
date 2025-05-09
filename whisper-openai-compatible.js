export { WhisperOpenAICompatibleSttProvider };

const DEBUG_PREFIX = '<Speech Recognition module (Whisper OpenAI Compatible)> ';

class WhisperOpenAICompatibleSttProvider {
    settings;

    defaultSettings = {
        apiKey: '',
        endpoint: 'https://api.openai.com/v1/audio/transcriptions',
        model: 'whisper-1',
        language: '',
    };

    get settingsHtml() {
        let html = `
            <div class="stt_settings_group">
                <label for="stt_openai_compatible_api_key">API Key</label>
                <input type="password" id="stt_openai_compatible_api_key" class="text_pole" value="${this.settings?.apiKey ?? ''}">
            </div>
            <div class="stt_settings_group">
                <label for="stt_openai_compatible_endpoint">Endpoint URL</label>
                <input type="text" id="stt_openai_compatible_endpoint" class="text_pole" value="${this.settings?.endpoint ?? this.defaultSettings.endpoint}">
            </div>
            <div class="stt_settings_group">
                <label for="stt_openai_compatible_model">Model</label>
                <input type="text" id="stt_openai_compatible_model" class="text_pole" value="${this.settings?.model ?? this.defaultSettings.model}">
            </div>
            <div class="stt_settings_group">
                <label for="stt_openai_compatible_language">Language (Optional)</label>
                <input type="text" id="stt_openai_compatible_language" class="text_pole" placeholder="e.g., en, ja, zh" value="${this.settings?.language ?? ''}">
            </div>
        `;
        return html;
    }

    onSettingsChange() {
        // Used when provider settings are updated from UI
        this.settings.apiKey = $('#stt_openai_compatible_api_key').val();
        this.settings.endpoint = $('#stt_openai_compatible_endpoint').val();
        this.settings.model = $('#stt_openai_compatible_model').val();
        this.settings.language = $('#stt_openai_compatible_language').val();
        console.debug(DEBUG_PREFIX + 'Settings changed');
    }

    loadSettings(settings) {
        // Populate Provider UI given input settings
        if (Object.keys(settings).length == 0) {
            console.debug(DEBUG_PREFIX + 'Using default Whisper (OpenAI Compatible) STT extension settings');
        }

        // Initialize with default settings, then override with provided settings
        this.settings = { ...this.defaultSettings };

        for (const key in settings) {
            if (key in this.settings) {
                this.settings[key] = settings[key];
            } else {
                // console.warn('WhisperCompatible STT: Invalid setting passed - ' + key + '. Ignoring.');
                // throw new Error('Invalid setting passed to STT extension: ' + key);
            }
        }

        $('#stt_openai_compatible_api_key').val(this.settings.apiKey);
        $('#stt_openai_compatible_endpoint').val(this.settings.endpoint);
        $('#stt_openai_compatible_model').val(this.settings.model);
        $('#stt_openai_compatible_language').val(this.settings.language);
        console.debug(DEBUG_PREFIX + 'Whisper (OpenAI Compatible) STT settings loaded');
    }

    async processAudio(audioBlob) {
        if (!this.settings.apiKey) {
            toastr.error('API Key is not set for Whisper (OpenAI Compatible).', 'STT Configuration Error', { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
            throw new Error('API Key is not set.');
        }
        if (!this.settings.endpoint) {
            toastr.error('Endpoint URL is not set for Whisper (OpenAI Compatible).', 'STT Configuration Error', { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
            throw new Error('Endpoint URL is not set.');
        }
        if (!this.settings.model) {
            toastr.error('Model is not set for Whisper (OpenAI Compatible).', 'STT Configuration Error', { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
            throw new Error('Model is not set.');
        }

        const requestData = new FormData();
        requestData.append('file', audioBlob, 'record.wav'); // Changed 'avatar' to 'file' as it's more common for OpenAI compatible APIs
        requestData.append('model', this.settings.model);

        if (this.settings.language) {
            requestData.append('language', this.settings.language);
        }

        const headers = {
            'Authorization': `Bearer ${this.settings.apiKey || 'FALLBACK_API_KEY_IF_EMPTY'}`, // Ensure apiKey is not undefined/null breaking the template
            // 'Content-Type' will be set by FormData
        };
        // const headers = getRequestHeaders(); // This might not be suitable for external APIs
        // delete headers['Content-Type']; // Let fetch set the content type for FormData

        const endpointUrl = this.settings.endpoint;

        try {
            const apiResult = await fetch(endpointUrl, {
                method: 'POST',
                headers: headers,
                body: requestData,
            });

            if (!apiResult.ok) {
                let errorDetails = 'Could not retrieve error details.';
                try {
                    errorDetails = await apiResult.text();
                } catch (e) {
                    console.error('WhisperCompatible STT: Failed to get text from error response', e);
                }
                const statusText = apiResult.statusText || 'Error';
                const errorMessage = `API request failed: ${apiResult.status} ${statusText}. Details: ${errorDetails}`;
                console.error('WhisperCompatible STT Error:', errorMessage);
                toastr.error(errorMessage, 'STT Generation Failed (Whisper OpenAI Compatible)', { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
                throw new Error(errorMessage);
            }

            const result = await apiResult.json();
            if (result.text === undefined) {
                let apiErrorMessage = 'API Error: Transcription text not found in response.';
                if (result.error && result.error.message) {
                    apiErrorMessage = `API Error: ${result.error.message}`;
                } else if (typeof result === 'string') {
                    // Sometimes APIs might return a plain string error
                    apiErrorMessage = `API Error: ${result}`;
                } else {
                    // Log the whole result if the structure is unexpected
                    console.warn('WhisperCompatible STT: Unexpected API response structure:', result);
                }
                console.error('WhisperCompatible STT API Error:', apiErrorMessage, 'Full response:', result);
                toastr.error(apiErrorMessage, 'STT API Error (Whisper OpenAI Compatible)', { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
                throw new Error(apiErrorMessage);
            }
            return result.text;
        } catch (error) {
            // Ensure that we are dealing with an Error object to get a message
            const catchErrorMessage = (error instanceof Error ? error.message : String(error)) || 'An unknown error occurred during STT processing.';
            console.error('WhisperCompatible STT Catch Error:', catchErrorMessage, error);
            toastr.error(catchErrorMessage, 'STT Request Error (Whisper OpenAI Compatible)', { timeOut: 10000, extendedTimeOut: 20000, preventDuplicates: true });
            // Re-throw as a new error to ensure a clean stack trace if preferred, or re-throw original
            throw new Error(catchErrorMessage);
        }
    }
}
