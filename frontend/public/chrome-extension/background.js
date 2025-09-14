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
        // Check if video is already being processed
        if (activeSessions.has(videoId)) {
            console.log(`Video ${videoId} already being processed`);
            return;
        }

        if (MOCK_MODE) {
            // In mock mode, just set up a session without API calls
            activeSessions.set(videoId, {
                tabId,
                videoId,
                status: 'ready'
            });
            console.log(`Mock mode: Video ${videoId} ready for analysis`);
            return;
        }

        // Check if video exists in backend
        const existingVideo = await checkVideoExists(videoId);

        // Since we're using direct processing, always process the video
        console.log(`Starting video processing for: ${videoUrl}`);

        // Notify content script that processing started
        chrome.tabs.sendMessage(tabId, {
            type: 'PROCESSING_STARTED',
            data: { videoId }
        });

        activeSessions.set(videoId, {
            tabId,
            videoId,
            status: 'processing'
        });

        try {
            // Process video and get results directly
            const result = await processVideo(videoUrl);

            // Update session status
            activeSessions.set(videoId, {
                tabId,
                videoId,
                status: 'completed'
            });

            // Convert API response to match content script expectations
            const claims = result.claims.map(claim => ({
                timestamp: claim.start,
                endTimestamp: claim.end,
                claim: claim.claim,
                categoryOfLikeness: claim.status, // 'verified', 'false', 'disputed', 'inconclusive'
                sources: claim.evidence.map(ev => ev.source_url).filter(Boolean),
                judgement: {
                    reasoning: claim.explanation,
                    summary: `${claim.status} (confidence: ${Math.round(claim.confidence * 100)}%)`
                }
            }));

            // Send processed data to content script
            chrome.tabs.sendMessage(tabId, {
                type: 'DATA_LOADED',
                data: {
                    videoId,
                    claims,
                    summary: result.summary
                }
            });

            // Show completion notification
            chrome.tabs.sendMessage(tabId, {
                type: 'REALTIME_UPDATE',
                data: {
                    type: 'processing_complete',
                    data: {
                        total_claims: result.total_claims,
                        summary: result.summary
                    }
                }
            });

        } catch (error) {
            console.error('Error processing video:', error);

            // Update session status
            activeSessions.set(videoId, {
                tabId,
                videoId,
                status: 'error'
            });

            // Notify content script of error
            chrome.tabs.sendMessage(tabId, {
                type: 'PROCESSING_ERROR',
                data: { error: error.message }
            });
        }
    } catch (error) {
        console.error('Error handling video detection:', error);
    }
}

// API Functions
async function checkVideoExists(videoId) {
    if (MOCK_MODE) {
        // In mock mode, always return null to simulate new video
        return null;
    }

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
    if (MOCK_MODE) {
        // In mock mode, return a fake job ID
        return { job_id: 'mock-job-' + Date.now() };
    }

    // Encode the video URL as a query parameter
    const encodedVideoUrl = encodeURIComponent(videoUrl);
    const response = await fetch(`${API_BASE_URL}/api/process-video?video_url=${encodedVideoUrl}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to process video: ${response.statusText}`);
    }

    return await response.json();
}

async function fetchClaims(videoId) {
    if (MOCK_MODE) {
        // Return empty array in mock mode
        return [];
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/videos/${videoId}/claims`);
    if (response.ok) {
        return await response.json();
    }
    return [];
}

async function fetchFactChecks(videoId) {
    if (MOCK_MODE) {
        // Return empty array in mock mode
        return [];
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/videos/${videoId}/fact-checks`);
    if (response.ok) {
        return await response.json();
    }
    return [];
}

// WebSocket connection for real-time updates
function setupWebSocketConnection(videoId, tabId) {
    if (MOCK_MODE) {
        // In mock mode, don't create WebSocket connections
        console.log(`Mock mode: Skipping WebSocket connection for video ${videoId}`);
        return;
    }

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

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SESSION_DATA') {
        const videoId = message.videoId;
        const session = activeSessions.get(videoId);
        sendResponse(session || null);
    } else if (message.type === 'START_ANALYSIS') {
        const videoId = message.videoId;
        const tabId = sender.tab ? sender.tab.id : message.tabId;

        if (videoId) {
            const session = activeSessions.get(videoId);
            if (session && session.status !== 'processing') {
                // Start processing for this video
                handleVideoDetection(tabId, videoId, session.videoUrl);
                sendResponse({ success: true, status: 'processing' });
            } else {
                sendResponse({ success: false, error: 'Video already being processed or session not found' });
            }
        } else {
            sendResponse({ success: false, error: 'Missing video ID' });
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