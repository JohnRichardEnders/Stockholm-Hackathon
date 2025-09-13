// Core class definition for YouTube Fact-Checker content script

class YouTubeFactChecker {
    constructor() {
        this.videoId = null;
        this.claims = [];
        this.factChecks = [];
        this.overlayContainer = null;
        this.currentTime = 0;
        this.player = null;
        this.isInitialized = false;
        this.mockMode = true; // Enable mock data mode
        this.activeIndicator = null;
        this.popupTimeouts = [];
        this.currentDisplayedClaim = null;
        this.motionTokens = null;
        this.indicatorIcon = null;
        this.isMorphed = false;
        this.currentTooltip = null; // Track current tooltip
    }

    init() {
        // Wait for YouTube player to load
        this.waitForPlayer().then(() => {
            this.setupTimeTracking();
            this.createOverlayContainer();
            this.extractVideoId();
            this.setupResizeListener(); // Add resize listener for dynamic repositioning
            this.isInitialized = true;
        });

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message);
        });
    }
}