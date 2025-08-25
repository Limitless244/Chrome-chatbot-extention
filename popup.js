document.addEventListener('DOMContentLoaded', () => {
    const queryInput = document.getElementById('query');
    const askButton = document.getElementById('askBtn');
    const buttonText = askButton.querySelector('.button-text');
    const spinner = askButton.querySelector('.spinner');
    const responseSection = document.getElementById('response');
    const responseContent = document.getElementById('responseContent');
    const copyButton = document.getElementById('copyBtn');
    const includeCodeCheckbox = document.getElementById('includeCode');
    const languageSelect = document.getElementById('language');

    chrome.storage.sync.get(['includeCode', 'language'], (result) => {
        includeCodeCheckbox.checked = result.includeCode !== false;
        languageSelect.value = result.language || '';
    });

    function savePreferences() {
        chrome.storage.sync.set({
            includeCode: includeCodeCheckbox.checked,
            language: languageSelect.value
        });
    }

    includeCodeCheckbox.addEventListener('change', savePreferences);
    languageSelect.addEventListener('change', savePreferences);

    askButton.addEventListener('click', async () => {
        const query = queryInput.value.trim();
        if (!query) {
            showError('Please enter a coding question!');
            return;
        }

        setLoading(true);
        responseSection.classList.remove('hidden');
        responseContent.textContent = 'Getting response...';

        try {
            let fullQuery = query;
            if (includeCodeCheckbox.checked) {
                const visibleCode = await getVisibleCode();
                if (visibleCode) {
                    fullQuery += `\n\nContext (visible code):\n${visibleCode}`;
                }
            }

            if (languageSelect.value) {
                fullQuery += `\n\nLanguage: ${languageSelect.value}`;
            }

           
            chrome.runtime.sendMessage(
                { type: 'ask_gemini', query: fullQuery },
                handleResponse
            );
        } catch (error) {
            showError('Failed to process request: ' + error.message);
        }
    });

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(responseContent.textContent)
            .then(() => {
                const originalTitle = copyButton.title;
                copyButton.title = 'Copied!';
                setTimeout(() => {
                    copyButton.title = originalTitle;
                }, 2000);
            });
    });

    function setLoading(isLoading) {
        askButton.disabled = isLoading;
        buttonText.textContent = isLoading ? 'Processing...' : 'Ask AI';
        spinner.classList.toggle('hidden', !isLoading);
    }

    function showError(message) {
        responseSection.classList.remove('hidden');
        responseContent.innerHTML = `<span style="color: #dc2626;">${message}</span>`;
    }

    function handleResponse(response) {
        setLoading(false);
        if (response.error) {
            showError(response.error);
        } else {
            responseContent.innerHTML = formatResponse(response.answer);
        }
    }

    function formatResponse(text) {
    
        return text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre><code class="${lang}">${escapeHtml(code.trim())}</code></pre>`;
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function getVisibleCode() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    const codeElements = document.querySelectorAll('pre, code');
                    return Array.from(codeElements).map(el => el.textContent).join('\n\n');
                }
            });
            return results[0].result;
        } catch (error) {
            console.error('Failed to get visible code:', error);
            return null;
        }
    }

    queryInput.focus();
});
