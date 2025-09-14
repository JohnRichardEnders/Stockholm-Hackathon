// Logic that reacts to current time and updates visible UI

YouTubeFactChecker.prototype.setupResizeListener = function() {
    // Debounced resize handler to prevent excessive repositioning
    let resizeTimeout;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            this.repositionElements();
        }, 100);
    };

    // Listen for window resize
    window.addEventListener('resize', handleResize);

    // Listen for YouTube player size changes (fullscreen, theater mode, etc.)
    const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (playerContainer && window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(playerContainer);
        this.playerResizeObserver = resizeObserver;
    }
};

YouTubeFactChecker.prototype.repositionElements = function() {
    // Reposition active indicator if it exists
    if (this.activeIndicator) {
        const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
        const containerRect = playerContainer ? playerContainer.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };

        const cardWidth = this.motionTokens ? this.motionTokens.card.width : 320;
        const cardHeight = this.motionTokens ? this.motionTokens.card.height : 180;
        const margin = 20;

        // Recalculate position
        const wouldBeCutOffRight = (containerRect.width - margin) < cardWidth;
        const horizontalPosition = wouldBeCutOffRight ? `left: ${margin}px` : `right: ${margin}px`;
        const topPosition = Math.max(margin, Math.min(margin, containerRect.height - cardHeight - margin));

        // Update positioning
        this.activeIndicator.style.top = `${topPosition}px`;
        if (wouldBeCutOffRight) {
            this.activeIndicator.style.left = `${margin}px`;
            this.activeIndicator.style.right = 'auto';
        } else {
            this.activeIndicator.style.right = `${margin}px`;
            this.activeIndicator.style.left = 'auto';
        }
    }

    // Reposition any visible claim overlays
    const visibleClaims = document.querySelectorAll('.fact-check-claim');
    visibleClaims.forEach((overlay, index) => {
        const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
        const containerRect = playerContainer ? playerContainer.getBoundingClientRect() : { width: window.innerWidth };

        const overlayWidth = 320;
        const margin = 20;
        const topPosition = 20 + index * 70;

        // Recalculate edge detection
        const wouldBeCutOff = (containerRect.width - margin) < overlayWidth;
        const adjustedWidth = Math.min(overlayWidth, containerRect.width - 80);
        const maxTop = Math.max(20, containerRect.height - 200);
        const adjustedTop = Math.min(topPosition, maxTop);

        // Update positioning
        overlay.style.top = `${adjustedTop}px`;
        overlay.style.width = `${adjustedWidth}px`;
        overlay.dataset.wouldBeCutOff = wouldBeCutOff;

        if (wouldBeCutOff) {
            overlay.style.left = `${margin}px`;
            overlay.style.right = 'auto';
        } else {
            overlay.style.right = `${margin}px`;
            overlay.style.left = 'auto';
        }
    });
};

YouTubeFactChecker.prototype.updateVisibleClaims = function() {
    if (!this.mockMode || !this.mockFactChecks || !this.activeIndicator) return;

    // Get currently active claims (within their duration range)
    const activeClaims = this.mockFactChecks.filter((factCheck) => {
        const startTime = factCheck.timestamp;
        const endTime = factCheck.endTimestamp || factCheck.timestamp + 10;
        return this.currentTime >= startTime && this.currentTime <= endTime;
    });

    if (activeClaims.length > 0 && !this.isMorphed) {
        const primaryClaim = activeClaims[0];
        this.morphToCard(primaryClaim);
        this.currentDisplayedClaim = primaryClaim;
    } else if (activeClaims.length === 0 && this.isMorphed) {
        this.morphToFab();
        this.currentDisplayedClaim = null;
    } else if (activeClaims.length > 0 && this.isMorphed) {
        const primaryClaim = activeClaims[0];
        if (!this.currentDisplayedClaim || this.currentDisplayedClaim.timestamp !== primaryClaim.timestamp) {
            this.injectCardContent(primaryClaim);
            this.currentDisplayedClaim = primaryClaim;
        }
    }

    if (this.activeIndicator && !this.isMorphed) {
        const hasFalseClaims = activeClaims.some((claim) => claim.categoryOfLikeness === 'false');
        const hasNeutralClaims = activeClaims.some((claim) => claim.categoryOfLikeness === 'neutral');
        if (hasFalseClaims) {
            this.activeIndicator.style.background = 'rgba(255, 59, 48, 0.8)';
            this.activeIndicator.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(255, 59, 48, 0.3)';
        } else if (hasNeutralClaims) {
            this.activeIndicator.style.background = 'rgba(255, 149, 0, 0.8)';
            this.activeIndicator.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(255, 149, 0, 0.3)';
        } else {
            this.activeIndicator.style.background = 'rgba(0, 0, 0, 0.05)';
        }
    }
};