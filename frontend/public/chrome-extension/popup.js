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
        const setButtonLabel = (html) => {
            this.ensureGlassStructure(analyzeButton);
            const labelEl = analyzeButton.querySelector('.liquidGlass-text');
            if (labelEl) labelEl.innerHTML = html;
        };

        statusDot.className = 'status-dot';

        switch (status) {
            case 'processing':
                statusDot.classList.add('processing');
                statusText.textContent = 'Analyzing video...';
                setButtonLabel(`<div style="display: inline-flex; align-items: center; gap: 8px;"><div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div><span>Processing...</span></div>`);
                analyzeButton.disabled = true;
                break;
            case 'completed':
                statusDot.classList.add('completed');
                statusText.textContent = 'Analysis complete';
                setButtonLabel('✅ Analysis Complete');
                analyzeButton.disabled = true;
                analyzeButton.style.background = 'rgba(76, 175, 80, 0.15)';
                analyzeButton.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.6), 0 16px 32px rgba(76, 175, 80, 0.12)';
                document.getElementById('stats-grid').style.display = 'grid';
                document.getElementById('claims-section').style.display = 'block';
                break;
            case 'error':
                statusDot.classList.add('idle');
                statusText.textContent = 'Error occurred';
                setButtonLabel('🔄 Retry Analysis');
                analyzeButton.disabled = false;
                analyzeButton.style.background = 'rgba(244, 67, 54, 0.15)';
                analyzeButton.style.boxShadow = '0 0 0 2px rgba(244, 67, 54, 0.6), 0 16px 32px rgba(244, 67, 54, 0.12)';
                break;
            case 'ready':
            default:
                statusDot.classList.add('idle');
                statusText.textContent = 'Ready to analyze';
                setButtonLabel('🚀 Analyze Video');
                analyzeButton.disabled = false;
                analyzeButton.style.background = 'rgba(255, 255, 255, 0.08)';
                analyzeButton.style.boxShadow = '0 0 0 2px rgba(255, 255, 255, 0.6), 0 16px 32px rgba(0, 0, 0, 0.12)';
                break;
        }
    }

    ensureGlassStructure(buttonEl) {
        if (!buttonEl) return;
        const hasLabel = buttonEl.querySelector('.liquidGlass-text');
        if (!hasLabel) {
            buttonEl.innerHTML = `
                <div class="liquidGlass-effect">
                    <svg class=\"liquidGlass-svg\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"none\" xmlns=\"http://www.w3.org/2000/svg\">
                        <defs>
                            <linearGradient id=\"lg-liquid\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">
                                <stop offset=\"0%\" stop-color=\"#8ec5ff\"/>
                                <stop offset=\"50%\" stop-color=\"#b490ff\"/>
                                <stop offset=\"100%\" stop-color=\"#ffd1ff\"/>
                                <animate attributeName=\"x1\" values=\"0%;-50%;0%\" dur=\"8s\" repeatCount=\"indefinite\"/>
                                <animate attributeName=\"y1\" values=\"0%;50%;0%\" dur=\"8s\" repeatCount=\"indefinite\"/>
                                <animate attributeName=\"x2\" values=\"100%;150%;100%\" dur=\"8s\" repeatCount=\"indefinite\"/>
                                <animate attributeName=\"y2\" values=\"100%;50%;100%\" dur=\"8s\" repeatCount=\"indefinite\"/>
                            </linearGradient>
                        </defs>
                        <rect x=\"0\" y=\"0\" width=\"100\" height=\"100\" fill=\"url(#lg-liquid)\" filter=\"url(#glass-distortion)\" rx=\"30\" ry=\"30\"/>
                    </svg>
                </div>
                <div class="liquidGlass-tint"></div>
                <div class="liquidGlass-shine"></div>
                <div class="liquidGlass-text"></div>
            `;
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