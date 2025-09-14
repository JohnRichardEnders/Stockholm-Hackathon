// Background script for YouTube Fact-Checker extension

const API_BASE_URL = 'http://localhost:8000';

// Mock mode flag - when true, no API calls are made  
// Set to false to use real backend API
const MOCK_MODE = false;

// Track active fact-checking sessions
const activeSessions = new Map();

// Listen for tab updates to detect YouTube video navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const url = new URL(tab.url);
        if (url.hostname === 'www.youtube.com' && url.pathname === '/watch') {
            const videoId = url.searchParams.get('v');
            if (videoId) {
                // Just initialize session, don't auto-start processing
                initializeSession(tabId, videoId, tab.url);
            }
        }
    }
});

// Initialize session without starting processing
async function initializeSession(tabId, videoId, videoUrl) {
    try {
        // Just mark as ready for manual analysis
        activeSessions.set(videoId, {
            tabId,
            videoId,
            videoUrl,
            status: 'ready'
        });

        console.log(`Session initialized for video ${videoId} - ready for manual analysis`);

    } catch (error) {
        console.error('Error initializing session:', error);
    }
}

// Handle video detection and start processing
async function handleVideoDetection(tabId, videoId, videoUrl) {
    try {
        console.log(`🎬 Starting video processing for: ${videoUrl}`);

        // Mark session as processing
        activeSessions.set(videoId, {
            tabId,
            videoId,
            videoUrl,
            status: 'processing'
        });

        // Notify content script that processing started
        chrome.tabs.sendMessage(tabId, {
            type: 'PROCESSING_STARTED',
            data: { videoId }
        });

        try {
            // Process video and get results directly
            const result = await processVideo(videoUrl);

            // Update session status
            activeSessions.set(videoId, {
                tabId,
                videoId,
                videoUrl,
                status: 'completed'
            });

            console.log('✅ API Response received:', result);

            // Send processed data directly to content script
            chrome.tabs.sendMessage(tabId, {
                type: 'ANALYSIS_COMPLETE',
                data: result
            });

        } catch (error) {
            console.error('❌ Error processing video:', error);

            // Update session status
            activeSessions.set(videoId, {
                tabId,
                videoId,
                videoUrl,
                status: 'error'
            });

            // Notify content script of error
            chrome.tabs.sendMessage(tabId, {
                type: 'ANALYSIS_ERROR',
                data: { error: error.message }
            });
        }
    } catch (error) {
        console.error('❌ Error handling video detection:', error);
    }
}

// API Functions

async function processVideo(videoUrl) {
    console.log('🌐 processVideo called with URL:', videoUrl);

    if (MOCK_MODE) {
        console.log('🎭 Running in mock mode');
        // In mock mode, return a fake job ID
        return { job_id: 'mock-job-' + Date.now() };
    }

    // Encode the video URL as a query parameter
    const encodedVideoUrl = encodeURIComponent(videoUrl);
    const apiUrl = `${API_BASE_URL}/api/process-video?video_url=${encodedVideoUrl}`;
    console.log('🚀 Making API call to:', apiUrl);

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    console.log('📡 API response status:', response.status, response.statusText);

    if (!response.ok) {
        throw new Error(`Failed to process video: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📝 API response data:', result);

    return result;
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

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SESSION_DATA') {
        const videoId = message.videoId;
        const session = activeSessions.get(videoId);
        sendResponse(session || null);
    } else if (message.type === 'START_ANALYSIS') {
        console.log('🎬 Background received START_ANALYSIS message:', message);
        const videoId = message.videoId;
        const videoUrl = message.videoUrl;
        const tabId = sender.tab ? sender.tab.id : message.tabId;
        console.log('📋 Processing analysis request:', { videoId, videoUrl, tabId });

        if (videoId && videoUrl) {
            console.log('✅ Starting analysis for video:', videoId);

            // Start processing immediately
            handleVideoDetection(tabId, videoId, videoUrl);
            sendResponse({ success: true, status: 'processing' });
        } else {
            console.error('❌ Missing video ID or URL:', { videoId, videoUrl });
            sendResponse({ success: false, error: 'Missing video ID or URL' });
        }
        return true; // Keep message channel open for async response
    } else if (message.type === 'START_MOCK_ANALYSIS') {
        const videoId = message.videoId;
        const tabId = sender.tab ? sender.tab.id : message.tabId;

        if (MOCK_MODE && videoId) {
            // Set session as processing in mock mode
            activeSessions.set(videoId, {
                tabId,
                videoId,
                status: 'processing'
            });

            // Simulate processing completion after a delay
            setTimeout(() => {
                const session = activeSessions.get(videoId);
                if (session) {
                    session.status = 'completed';

                    // Notify content script that mock processing is complete
                    try {
                        chrome.tabs.sendMessage(tabId, {
                            type: 'MOCK_ANALYSIS_COMPLETE',
                            data: { videoId }
                        });
                    } catch (error) {
                        console.log('Could not send message to content script');
                    }
                }
            }, 2000);

            sendResponse({ success: true, status: 'processing' });
        } else {
            sendResponse({ success: false, error: 'Not in mock mode or missing video ID' });
        }
    }
});

console.log('YouTube Fact-Checker background script loaded');