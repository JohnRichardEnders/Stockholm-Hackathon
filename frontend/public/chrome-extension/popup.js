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
            // Get session data from background script
            const response = await this.sendMessageToBackground({
                type: 'GET_SESSION_DATA',
                videoId: this.videoId
            });

            this.sessionData = response;

            if (response) {
                this.updateStatus(response.status);

                if (response.status === 'completed') {
                    await this.loadClaimsAndFactChecks();
                }
            } else {
                this.updateStatus('ready');
            }

            // Update video info
            await this.updateVideoInfo();

        } catch (error) {
            console.error('Error loading video data:', error);
            this.updateStatus('error');
        }
    }

    async loadClaimsAndFactChecks() {
        try {
            const API_BASE_URL = 'http://localhost:8000';

            const [claimsResponse, factChecksResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/videos/${this.videoId}/claims`),
                fetch(`${API_BASE_URL}/api/v1/videos/${this.videoId}/fact-checks`)
            ]);

            if (claimsResponse.ok) {
                this.claims = await claimsResponse.json();
            }

            if (factChecksResponse.ok) {
                this.factChecks = await factChecksResponse.json();
            }

            this.updateStats();
            this.updateClaimsList();

        } catch (error) {
            console.error('Error loading claims and fact checks:', error);
        }
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
            console.error('Error getting video title:', error);
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
        const claimsCount = this.claims.length;
        const verifiedCount = this.factChecks.filter(fc => fc.status === 'verified').length;
        const disputedCount = this.factChecks.filter(fc => fc.status === 'disputed').length;
        const falseCount = this.factChecks.filter(fc => fc.status === 'false').length;

        document.getElementById('claims-count').textContent = claimsCount;
        document.getElementById('verified-count').textContent = verifiedCount;
        document.getElementById('disputed-count').textContent = disputedCount;
        document.getElementById('false-count').textContent = falseCount;
    }

    updateClaimsList() {
        const claimsList = document.getElementById('claims-list');
        claimsList.innerHTML = '';

        if (this.claims.length === 0) {
            claimsList.innerHTML = '<div style="text-align: center; color: #666; padding: 12px;">No claims found</div>';
            return;
        }

        // Show latest 3 claims
        const recentClaims = this.claims.slice(-3).reverse();

        recentClaims.forEach(claim => {
            const factCheck = this.factChecks.find(fc => fc.claim_id === claim.id);
            const status = factCheck ? factCheck.status : 'pending';

            const claimElement = document.createElement('div');
            claimElement.className = `claim-item ${status}`;

            claimElement.innerHTML = `
        <div class="claim-status">${this.getStatusIcon(status)} ${status}</div>
        <div>${claim.text.substring(0, 80)}${claim.text.length > 80 ? '...' : ''}</div>
      `;

            claimsList.appendChild(claimElement);
        });
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

                // Send message to background script to start analysis
                await this.sendMessageToBackground({
                    type: 'START_ANALYSIS',
                    videoId: this.videoId,
                    videoUrl: this.currentTab.url
                });

                // Set up real-time updates listener
                this.setupRealtimeUpdates();

            } catch (error) {
                console.error('Error starting analysis:', error);
                this.updateStatus('error');
            }
        });
    }

    setupRealtimeUpdates() {
        // Listen for messages from content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'REALTIME_UPDATE') {
                this.handleRealtimeUpdate(message.data);
            }
        });
    }

    handleRealtimeUpdate(data) {
        switch (data.type) {
            case 'claim_found':
                this.claims.push(data.data);
                this.updateStats();
                this.updateClaimsList();
                break;
            case 'fact_check_complete':
                this.factChecks.push(data.data);
                this.updateStats();
                this.updateClaimsList();
                break;
            case 'processing_complete':
                this.updateStatus('completed');
                break;
        }
    }

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

    sendMessageToBackground(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});