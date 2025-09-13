// Content script for YouTube Fact-Checker extension

class YouTubeFactChecker {
    constructor() {
        this.videoId = null;
        this.claims = [];
        this.factChecks = [];
        this.overlayContainer = null;
        this.currentTime = 0;
        this.player = null;
        this.isInitialized = false;

        this.init();
    }

    init() {
        // Wait for YouTube player to load
        this.waitForPlayer().then(() => {
            this.setupTimeTracking();
            this.createOverlayContainer();
            this.extractVideoId();
            this.isInitialized = true;
        });

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message);
        });
    }

    async waitForPlayer() {
        return new Promise((resolve) => {
            const checkPlayer = () => {
                const player = document.querySelector('video');
                if (player && window.location.pathname === '/watch') {
                    this.player = player;
                    resolve();
                } else {
                    setTimeout(checkPlayer, 500);
                }
            };
            checkPlayer();
        });
    }

    extractVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');

        if (videoId && videoId !== this.videoId) {
            this.videoId = videoId;
            this.claims = [];
            this.factChecks = [];
            this.clearOverlays();

            // Request session data from background script
            chrome.runtime.sendMessage({
                type: 'GET_SESSION_DATA',
                videoId: videoId
            }, (response) => {
                if (response) {
                    this.handleSessionData(response);
                }
            });
        }
    }

    setupTimeTracking() {
        if (!this.player) return;

        // Track video time updates
        this.player.addEventListener('timeupdate', () => {
            this.currentTime = this.player.currentTime;
            this.updateVisibleClaims();
        });

        // Handle video navigation
        this.player.addEventListener('seeked', () => {
            this.currentTime = this.player.currentTime;
            this.updateVisibleClaims();
        });
    }

    createOverlayContainer() {
        // Remove existing overlay container
        if (this.overlayContainer) {
            this.overlayContainer.remove();
        }

        // Create overlay container
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.id = 'fact-checker-overlay';
        this.overlayContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `;

        // Find YouTube player container
        const playerContainer = document.querySelector('#movie_player') ||
            document.querySelector('.html5-video-player');

        if (playerContainer) {
            playerContainer.style.position = 'relative';
            playerContainer.appendChild(this.overlayContainer);
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'PROCESSING_STARTED':
                this.showProcessingIndicator();
                break;
            case 'DATA_LOADED':
                this.loadData(message.data);
                break;
            case 'REALTIME_UPDATE':
                this.handleRealtimeUpdate(message.data);
                break;
        }
    }

    handleSessionData(session) {
        if (session.status === 'processing') {
            this.showProcessingIndicator();
        } else if (session.status === 'completed') {
            // Data should be loaded via DATA_LOADED message
        }
    }

    loadData(data) {
        this.claims = data.claims || [];
        this.factChecks = data.factChecks || [];
        this.hideProcessingIndicator();
        this.updateVisibleClaims();
    }

    handleRealtimeUpdate(data) {
        switch (data.type) {
            case 'claim_found':
                this.addClaim(data.data);
                break;
            case 'fact_check_complete':
                this.updateFactCheck(data.data);
                break;
            case 'processing_complete':
                this.hideProcessingIndicator();
                this.showCompletionNotification(data.data);
                break;
            case 'job_progress':
                this.updateProgress(data.data);
                break;
        }
    }

    showProcessingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'fact-checker-processing';
        indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

        indicator.innerHTML = `
      <div style="width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span>Analyzing video for claims...</span>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

        document.body.appendChild(indicator);
    }

    hideProcessingIndicator() {
        const indicator = document.getElementById('fact-checker-processing');
        if (indicator) {
            indicator.remove();
        }
    }

    addClaim(claimData) {
        this.claims.push(claimData);
        this.updateVisibleClaims();
    }

    updateFactCheck(factCheckData) {
        this.factChecks.push(factCheckData);
        this.updateVisibleClaims();
    }

    updateProgress(progressData) {
        const indicator = document.getElementById('fact-checker-processing');
        if (indicator) {
            const text = indicator.querySelector('span');
            if (text) {
                text.textContent = `${progressData.job_type}: ${progressData.progress}%`;
            }
        }
    }

    updateVisibleClaims() {
        if (!this.overlayContainer) return;

        // Clear existing overlays
        this.clearOverlays();

        // Show claims that are active at current time
        const activeClaims = this.claims.filter(claim =>
            this.currentTime >= claim.start_time &&
            this.currentTime <= claim.end_time
        );

        activeClaims.forEach((claim, index) => {
            this.createClaimOverlay(claim, index);
        });
    }

    createClaimOverlay(claim, index) {
            const factCheck = this.factChecks.find(fc => fc.claim_id === claim.id);

            const overlay = document.createElement('div');
            overlay.className = 'fact-check-claim';
            overlay.style.cssText = `
      position: absolute;
      top: ${20 + (index * 60)}px;
      right: 20px;
      max-width: 300px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 13px;
      pointer-events: auto;
      cursor: pointer;
      border-left: 4px solid ${this.getStatusColor(factCheck?.status)};
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;

            const status = factCheck ? factCheck.status : 'checking';
            const statusIcon = this.getStatusIcon(status);

            overlay.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span>${statusIcon}</span>
        <span style="font-weight: bold; text-transform: capitalize;">${status}</span>
      </div>
      <div style="margin-bottom: 8px; line-height: 1.4;">
        "${claim.text.substring(0, 100)}${claim.text.length > 100 ? '...' : ''}"
      </div>
      ${factCheck ? `
        <div style="font-size: 11px; opacity: 0.8;">
          ${factCheck.explanation.substring(0, 150)}${factCheck.explanation.length > 150 ? '...' : ''}
        </div>
      ` : `
        <div style="font-size: 11px; opacity: 0.8;">
          Fact-checking in progress...
        </div>
      `}
    `;

    // Add click handler to show full details
    overlay.addEventListener('click', () => {
      this.showClaimDetails(claim, factCheck);
    });

    this.overlayContainer.appendChild(overlay);
  }

  showClaimDetails(claim, factCheck) {
    // Create modal for detailed view
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      border-radius: 12px;
      padding: 24px;
      margin: 20px;
    `;

    const status = factCheck ? factCheck.status : 'checking';
    
    content.innerHTML = `
      <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #333;">Claim Details</h2>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>Status:</strong> 
        <span style="color: ${this.getStatusColor(status)}; font-weight: bold; text-transform: capitalize;">
          ${this.getStatusIcon(status)} ${status}
        </span>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>Claim:</strong>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0;">${claim.text}</p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>Time Range:</strong> ${this.formatTime(claim.start_time)} - ${this.formatTime(claim.end_time)}
      </div>
      
      ${factCheck ? `
        <div style="margin-bottom: 16px;">
          <strong>Explanation:</strong>
          <p style="line-height: 1.5; margin: 8px 0;">${factCheck.explanation}</p>
        </div>
        
        ${factCheck.evidence && factCheck.evidence.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <strong>Evidence:</strong>
            <ul style="margin: 8px 0; padding-left: 20px;">
              ${factCheck.evidence.map(ev => `
                <li style="margin-bottom: 8px;">
                  <a href="${ev.source_url}" target="_blank" style="color: #1976d2; text-decoration: none;">
                    ${ev.title}
                  </a>
                  <p style="margin: 4px 0; font-size: 13px; color: #666;">${ev.excerpt}</p>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      ` : `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 6px; color: #856404;">
          This claim is currently being fact-checked. Results will appear here when available.
        </div>
      `}
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close modal handlers
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    content.querySelector('#close-modal').addEventListener('click', () => {
      modal.remove();
    });
  }

  clearOverlays() {
    if (this.overlayContainer) {
      this.overlayContainer.innerHTML = '';
    }
  }

  showCompletionNotification(data) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">✅ Analysis Complete!</div>
      <div>Found ${data.total_claims} claims</div>
      <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">
        ${data.summary.verified} verified, ${data.summary.disputed} disputed, 
        ${data.summary.false} false, ${data.summary.inconclusive} inconclusive
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  getStatusColor(status) {
    switch (status) {
      case 'verified': return '#4caf50';
      case 'disputed': return '#ff9800';
      case 'false': return '#f44336';
      case 'inconclusive': return '#9e9e9e';
      default: return '#2196f3';
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'verified': return '✅';
      case 'disputed': return '⚠️';
      case 'false': return '❌';
      case 'inconclusive': return '❓';
      default: return '🔍';
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeFactChecker();
  });
} else {
  new YouTubeFactChecker();
}

// Handle navigation in SPAs like YouTube
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Re-initialize on navigation
    setTimeout(() => {
      new YouTubeFactChecker();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

console.log('YouTube Fact-Checker content script loaded');