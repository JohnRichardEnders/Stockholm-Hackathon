// Popup script for YouTube Fact-Checker extension

class PopupController {
    constructor() {
        this.currentTab = null;
        this.videoId = null;
        this.sessionData = null;
        this.claims = [];
        this.factChecks = [];

        this.init();
    }

    async init() {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tab;

        // Check if it's a YouTube video page
        if (this.isYouTubeVideo(tab.url)) {
            this.videoId = this.extractVideoId(tab.url);
            await this.loadVideoData();
            this.showMainContent();
        } else {
            this.showNoVideo();
        }

        this.setupEventListeners();
    }

    isYouTubeVideo(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'www.youtube.com' &&
                urlObj.pathname === '/watch' &&
                urlObj.searchParams.has('v');
        } catch {
            return false;
        }
    }

    extractVideoId(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.get('v');
        } catch {
            return null;
        }
    }

    async loadVideoData() {
        try {
            // In mock mode, immediately set to ready state
            this.updateStatus('ready');

            // Load mock data for display
            this.loadMockData();

            // Update video info
            await this.updateVideoInfo();

        } catch (error) {
            console.error('Error loading video data:', error.message || error);
            this.updateStatus('ready'); // Still allow analysis in mock mode even if there are errors
        }
    }

    loadMockData() {
        // Load the same mock data structure as content script
        this.mockFactChecks = [{
                timestamp: 15,
                endTimestamp: 25, // 10 second duration
                claim: "This technology will revolutionize the entire industry within 5 years",
                categoryOfLikeness: "false",
                sources: ["https://example.com/tech-revolution-study"],
                judgement: {
                    reasoning: "Historical analysis shows that revolutionary industry transformations typically take 10-15 years, not 5.",
                    summary: "Claim is overly optimistic based on historical precedent"
                }
            },
            {
                timestamp: 45,
                endTimestamp: 55, // 10 second duration
                claim: "Studies show that 90% of users prefer this method over traditional approaches",
                categoryOfLikeness: "false",
                sources: ["https://example.com/user-preference-study"],
                judgement: {
                    reasoning: "Independent research indicates preference rates are actually 60-65%, not 90%.",
                    summary: "Significantly overstated user preference statistics"
                }
            },
            {
                timestamp: 120,
                endTimestamp: 130, // 10 second duration
                claim: "The market cap will reach $1 trillion by next year",
                categoryOfLikeness: "false",
                sources: ["https://example.com/market-analysis-report"],
                judgement: {
                    reasoning: "Current market trends indicate this projection is unrealistic.",
                    summary: "Unrealistic market cap projection without supporting evidence"
                }
            },
            {
                timestamp: 180,
                endTimestamp: 190, // 10 second duration
                claim: "No other company has been able to achieve these results",
                categoryOfLikeness: "true",
                sources: ["https://example.com/industry-benchmarks"],
                judgement: {
                    reasoning: "Comprehensive industry analysis confirms this claim.",
                    summary: "Accurate claim supported by industry data"
                }
            },
            {
                timestamp: 240,
                endTimestamp: 250, // 10 second duration
                claim: "This approach is completely safe with no side effects",
                categoryOfLikeness: "neutral",
                sources: ["https://example.com/safety-study"],
                judgement: {
                    reasoning: "While initial studies show promise, long-term effects are still being studied.",
                    summary: "Insufficient data to confirm absolute safety claims"
                }
            }
        ];
    }

    async updateVideoInfo() {
        const titleElement = document.getElementById('video-title');
        const idElement = document.getElementById('video-id');

        // Try to get title from YouTube page
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                        document.querySelector('#container h1') ||
                        document.querySelector('h1');
                    return titleElement ? titleElement.textContent.trim() : 'YouTube Video';
                }
            });

            if (results && results[0] && results[0].result) {
                titleElement.textContent = results[0].result;
            }
        } catch (error) {
            console.log('Could not get video title, using default');
            titleElement.textContent = 'YouTube Video';
        }

        idElement.textContent = `Video ID: ${this.videoId}`;
    }

    updateStatus(status) {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        const analyzeButton = document.getElementById('analyze-button');

        statusDot.className = 'status-dot';

        switch (status) {
            case 'processing':
                statusDot.classList.add('processing');
                statusText.textContent = 'Analyzing video...';
                analyzeButton.textContent = '⏳ Processing...';
                analyzeButton.disabled = true;
                break;
            case 'completed':
                statusDot.classList.add('completed');
                statusText.textContent = 'Analysis complete';
                analyzeButton.textContent = '✅ Completed';
                analyzeButton.disabled = true;
                document.getElementById('stats-grid').style.display = 'grid';
                document.getElementById('claims-section').style.display = 'block';
                break;
            case 'error':
                statusDot.classList.add('idle');
                statusText.textContent = 'Error occurred';
                analyzeButton.textContent = '🔄 Retry';
                analyzeButton.disabled = false;
                break;
            case 'ready':
            default:
                statusDot.classList.add('idle');
                statusText.textContent = 'Ready to analyze';
                analyzeButton.textContent = '🚀 Analyze Video';
                analyzeButton.disabled = false;
                break;
        }
    }

    updateStats() {
        if (!this.mockFactChecks) return;

        const claimsCount = this.mockFactChecks.length;
        const trueCount = this.mockFactChecks.filter(fc => fc.categoryOfLikeness === 'true').length;
        const neutralCount = this.mockFactChecks.filter(fc => fc.categoryOfLikeness === 'neutral').length;
        const falseCount = this.mockFactChecks.filter(fc => fc.categoryOfLikeness === 'false').length;

        document.getElementById('claims-count').textContent = claimsCount;
        document.getElementById('verified-count').textContent = trueCount;
        document.getElementById('disputed-count').textContent = neutralCount;
        document.getElementById('false-count').textContent = falseCount;
    }

    updateClaimsList() {
        const claimsList = document.getElementById('claims-list');
        claimsList.innerHTML = '';

        if (!this.mockFactChecks || this.mockFactChecks.length === 0) {
            claimsList.innerHTML = '<div style="text-align: center; color: #666; padding: 12px;">No claims found</div>';
            return;
        }

        // Show latest 3 claims
        const recentClaims = this.mockFactChecks.slice(-3).reverse();

        recentClaims.forEach(factCheck => {
            const claimElement = document.createElement('div');
            claimElement.className = `claim-item ${factCheck.categoryOfLikeness}`;

            claimElement.innerHTML = `
                <div class="claim-status">${this.getCategoryIcon(factCheck.categoryOfLikeness)} ${factCheck.categoryOfLikeness}</div>
                <div>${factCheck.claim.substring(0, 80)}${factCheck.claim.length > 80 ? '...' : ''}</div>
            `;

            claimsList.appendChild(claimElement);
        });
    }

    getCategoryIcon(categoryOfLikeness) {
        switch (categoryOfLikeness) {
            case 'true':
                return '✅';
            case 'false':
                return '❌';
            case 'neutral':
                return '⚠️';
            default:
                return '🔍';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'verified':
                return '✅';
            case 'disputed':
                return '⚠️';
            case 'false':
                return '❌';
            case 'inconclusive':
                return '❓';
            default:
                return '🔍';
        }
    }

    setupEventListeners() {
        const analyzeButton = document.getElementById('analyze-button');

        analyzeButton.addEventListener('click', async() => {
            if (!this.videoId) return;

            try {
                this.updateStatus('processing');

                // Start mock analysis through background script
                chrome.runtime.sendMessage({
                    type: 'START_MOCK_ANALYSIS',
                    videoId: this.videoId,
                    tabId: this.currentTab.id
                }, (response) => {
                    if (response && response.success) {
                        console.log('Mock analysis started');
                    }
                });

                // Simulate processing completion in UI
                setTimeout(() => {
                    this.updateStatus('completed');
                    this.updateStats();
                    this.updateClaimsList();

                    // Notify content script to activate
                    chrome.tabs.sendMessage(this.currentTab.id, {
                        type: 'ACTIVATE_MOCK_MODE'
                    }).catch(error => {
                        console.log('Content script not ready, continuing with mock mode');
                    });
                }, 2000); // 2 second processing simulation

            } catch (error) {
                console.error('Error starting analysis:', error.message || error);
                this.updateStatus('error');
            }
        });
    }

    // Removed realtime updates - not needed for mock mode

    showMainContent() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('no-video').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    }

    showNoVideo() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('no-video').style.display = 'block';
    }

    // Removed background script communication - not needed for mock mode
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});