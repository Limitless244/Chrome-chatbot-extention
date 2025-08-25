const GEMINI_API_KEY = "AIzaSyBSp_N-QHee-qityPuD5y9I2_vnRQBgO7M"; // Replace with your API key
const API_URL = "https://generativelanguage.googleapis.com/v1";
const TARGET_MODEL = "models/gemini-1.5-flash"; // Use the new model identifier

async function handleGeminiRequest(query) {
    try {
        const response = await fetch(`${API_URL}/${TARGET_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: query
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.message || 'Failed to get response from AI');
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from AI');
        }

        const answer = data.candidates[0].content.parts[0].text;
        return { answer: formatResponse(answer) };
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(error.message || 'Failed to process request');
    }
}

function formatResponse(text) {
    
    return text
        .replace(/^\s+|\s+$/g, '') 
        .replace(/\n{3,}/g, '\n\n'); 
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ask_gemini") {
        handleGeminiRequest(message.query)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true; 
    }
});