// Background script for YouTube Fact-Checker extension

const API_BASE_URL = 'http://localhost:8000';

// Track active fact-checking sessions
const activeSessions = new Map();

// Listen for tab updates to detect YouTube video navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const url = new URL(tab.url);
        if (url.hostname === 'www.youtube.com' && url.pathname === '/watch') {
            const videoId = url.searchParams.get('v');
            if (videoId) {
                handleVideoDetection(tabId, videoId, tab.url);
            }
        }
    }
});

// Handle video detection and start processing
async function handleVideoDetection(tabId, videoId, videoUrl) {
    try {
        // Check if video is already being processed
        if (activeSessions.has(videoId)) {
            console.log(`Video ${videoId} already being processed`);
            return;
        }

        // Check if video exists in backend
        const existingVideo = await checkVideoExists(videoId);

        if (!existingVideo) {
            // Start processing new video
            const result = await processVideo(videoUrl);
            activeSessions.set(videoId, {
                tabId,
                videoId,
                jobId: result.job_id,
                status: 'processing'
            });

            // Notify content script
            chrome.tabs.sendMessage(tabId, {
                type: 'PROCESSING_STARTED',
                data: { videoId, jobId: result.job_id }
            });

            // Start WebSocket connection for real-time updates
            setupWebSocketConnection(videoId, tabId);
        } else {
            // Video already processed, load existing data
            activeSessions.set(videoId, {
                tabId,
                videoId,
                status: existingVideo.status
            });

            if (existingVideo.status === 'completed') {
                // Load claims and fact-checks
                const [claims, factChecks] = await Promise.all([
                    fetchClaims(videoId),
                    fetchFactChecks(videoId)
                ]);

                chrome.tabs.sendMessage(tabId, {
                    type: 'DATA_LOADED',
                    data: { videoId, claims, factChecks }
                });
            }
        }
    } catch (error) {
        console.error('Error handling video detection:', error);
    }
}

// API Functions
async function checkVideoExists(videoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/videos/${videoId}/status`);
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error checking video exists:', error);
        return null;
    }
}

async function processVideo(videoUrl) {
    const response = await fetch(`${API_BASE_URL}/api/v1/videos/process`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
    });

    if (!response.ok) {
        throw new Error(`Failed to process video: ${response.statusText}`);
    }

    return await response.json();
}

async function fetchClaims(videoId) {
    const response = await fetch(`${API_BASE_URL}/api/v1/videos/${videoId}/claims`);
    if (response.ok) {
        return await response.json();
    }
    return [];
}

async function fetchFactChecks(videoId) {
    const response = await fetch(`${API_BASE_URL}/api/v1/videos/${videoId}/fact-checks`);
    if (response.ok) {
        return await response.json();
    }
    return [];
}

// WebSocket connection for real-time updates
function setupWebSocketConnection(videoId, tabId) {
    const ws = new WebSocket(`ws://localhost:8000/ws/video/${videoId}`);

    ws.onopen = () => {
        console.log(`WebSocket connected for video ${videoId}`);
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        // Forward real-time updates to content script
        chrome.tabs.sendMessage(tabId, {
            type: 'REALTIME_UPDATE',
            data: message
        });

        // Update session status
        const session = activeSessions.get(videoId);
        if (session) {
            if (message.type === 'processing_complete') {
                session.status = 'completed';
                ws.close();
            }
        }
    };

    ws.onclose = () => {
        console.log(`WebSocket disconnected for video ${videoId}`);
    };

    ws.onerror = (error) => {
        console.error(`WebSocket error for video ${videoId}:`, error);
    };
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    // Find and remove any sessions associated with this tab
    for (const [videoId, session] of activeSessions.entries()) {
        if (session.tabId === tabId) {
            activeSessions.delete(videoId);
            break;
        }
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SESSION_DATA') {
        const videoId = message.videoId;
        const session = activeSessions.get(videoId);
        sendResponse(session || null);
    }
});

console.log('YouTube Fact-Checker background script loaded');