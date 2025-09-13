// Mock data loading and timeline markers

YouTubeFactChecker.prototype.loadMockData = function() {
    // Mock data with structure: timestamp, claim, categoryOfLikeness, sources, judgement
    // Added endTimestamp for proper duration handling
    this.mockFactChecks = [{
            timestamp: 15,
            endTimestamp: 25, // 10 second duration
            claim: 'This technology will revolutionize the entire industry within 5 years',
            categoryOfLikeness: 'false',
            sources: [
                'https://example.com/tech-revolution-study',
                'https://example.com/industry-transformation-timeline',
            ],
            judgement: {
                reasoning: 'Historical analysis shows that revolutionary industry transformations typically take 10-15 years, not 5. Similar bold predictions in the past have proven overly optimistic.',
                summary: 'Claim is overly optimistic based on historical precedent',
            },
        },
        {
            timestamp: 45,
            endTimestamp: 55, // 10 second duration
            claim: 'Studies show that 90% of users prefer this method over traditional approaches',
            categoryOfLikeness: 'false',
            sources: [
                'https://example.com/user-preference-study',
                'https://example.com/methodology-comparison',
            ],
            judgement: {
                reasoning: 'Independent research indicates preference rates are actually 60-65%, not 90%. The referenced studies could not be independently verified.',
                summary: 'Significantly overstated user preference statistics',
            },
        },
        {
            timestamp: 120,
            endTimestamp: 130, // 10 second duration
            claim: 'The market cap will reach $1 trillion by next year',
            categoryOfLikeness: 'false',
            sources: [
                'https://example.com/market-analysis-report',
                'https://example.com/financial-projections',
            ],
            judgement: {
                reasoning: 'Current market trends and financial analyst consensus indicate this projection is unrealistic given current growth rates and market conditions.',
                summary: 'Unrealistic market cap projection without supporting evidence',
            },
        },
        {
            timestamp: 180,
            endTimestamp: 190, // 10 second duration
            claim: 'No other company has been able to achieve these results',
            categoryOfLikeness: 'true',
            sources: [
                'https://example.com/industry-benchmarks',
                'https://example.com/competitive-analysis',
            ],
            judgement: {
                reasoning: 'Comprehensive industry analysis confirms this claim. Peer-reviewed research and industry reports from the past 3 years support this assertion.',
                summary: 'Accurate claim supported by industry data',
            },
        },
        {
            timestamp: 240,
            endTimestamp: 250, // 10 second duration
            claim: 'This approach is completely safe with no side effects',
            categoryOfLikeness: 'neutral',
            sources: [
                'https://example.com/safety-study',
                'https://example.com/clinical-trials',
            ],
            judgement: {
                reasoning: "While initial studies show promise, long-term effects are still being studied. The claim of 'no side effects' cannot be definitively confirmed at this time.",
                summary: 'Insufficient data to confirm absolute safety claims',
            },
        },
    ];

    console.log('Mock fact-check data loaded:', this.mockFactChecks.length, 'claims');

    // Create timeline markers after loading mock data
    this.createTimelineMarkers();
};

YouTubeFactChecker.prototype.createTimelineMarkers = function() {
    // Remove existing markers and tooltips completely
    const existingMarkers = document.querySelectorAll('.fact-check-timeline-marker');
    existingMarkers.forEach((marker) => marker.remove());

    // Also clear any existing tooltips
    this.hideTimelineTooltip();

    if (!this.mockFactChecks || this.mockFactChecks.length === 0) return;

    // Ensure glass filter exists for liquid glass effect
    this.createGlassFilter();

    // Add tooltip animation styles
    this.addTooltipStyles();

    // Find YouTube progress bar container
    const progressContainer =
        document.querySelector('.ytp-progress-bar-container') ||
        document.querySelector('.ytp-progress-bar');

    if (!progressContainer) {
        // Retry after a delay if progress bar not found
        setTimeout(() => this.createTimelineMarkers(), 1000);
        return;
    }

    // Get video duration to calculate marker positions
    const video = document.querySelector('video');
    if (!video || !video.duration) {
        setTimeout(() => this.createTimelineMarkers(), 1000);
        return;
    }

    const videoDuration = video.duration;

    // Create markers for each claim
    this.mockFactChecks.forEach((factCheck, index) => {
        const marker = document.createElement('div');
        marker.className = 'fact-check-timeline-marker liquidGlass-wrapper';
        marker.setAttribute('data-claim-index', index);
        marker.setAttribute('data-timestamp', factCheck.timestamp);

        // Calculate position as percentage
        const position = (factCheck.timestamp / videoDuration) * 100;

        marker.style.cssText = `
      position: absolute;
      top: -14px;
      left: ${position}%;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 1000;
      opacity: 0.95;
      transition: all 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 4px 12px rgba(10, 132, 255, 0.25);
      transform: translateX(-50%);
      overflow: hidden;
      pointer-events: auto;
    `;

        // Create liquid glass layers
        const effect = document.createElement('div');
        effect.className = 'liquidGlass-effect';
        effect.style.cssText = `
      position: absolute; z-index: 0; inset: 0; border-radius: inherit; 
      backdrop-filter: blur(2px) saturate(1.1); 
      filter: url(#glass-distortion); 
      overflow: hidden; isolation: isolate;
      pointer-events: none;
    `;

        const tint = document.createElement('div');
        tint.className = 'liquidGlass-tint';
        tint.style.cssText = `
      z-index: 1; position: absolute; inset: 0; border-radius: inherit; 
      background: ${this.getCategoryColor(factCheck.categoryOfLikeness)}40;
      pointer-events: none;
    `;

        const shine = document.createElement('div');
        shine.className = 'liquidGlass-shine';
        shine.style.cssText = `
      position: absolute; inset: 0; z-index: 2; border-radius: inherit; overflow: hidden; 
      box-shadow: inset 1px 1px 1px 0 rgba(255, 255, 255, 0.2), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.1);
      pointer-events: none;
    `;

        marker.appendChild(effect);
        marker.appendChild(tint);
        marker.appendChild(shine);

        // Add hover effects with immediate response
        marker.addEventListener('mouseenter', () => {
            console.log('Marker hover enter - showing tooltip');

            // Immediate visual feedback
            marker.style.opacity = '1';
            marker.style.width = '20px';
            marker.style.height = '20px';
            marker.style.top = '-17px';
            marker.style.transform = 'translateX(-50%) scale(1.15)';
            marker.style.boxShadow = `0 0 0 2px rgba(255, 255, 255, 0.6), 
                                     0 8px 24px rgba(10, 132, 255, 0.4),
                                     0 0 20px ${this.getCategoryColor(factCheck.categoryOfLikeness)}60`;
            marker.style.zIndex = '1001';

            // Show tooltip immediately
            this.showTimelineTooltip(marker, factCheck);
        });

        marker.addEventListener('mouseleave', () => {
            // Reset marker styles
            marker.style.opacity = '0.95';
            marker.style.width = '14px';
            marker.style.height = '14px';
            marker.style.top = '-14px';
            marker.style.transform = 'translateX(-50%) scale(1)';
            marker.style.boxShadow = `0 0 0 1px rgba(255, 255, 255, 0.4), 0 4px 12px rgba(10, 132, 255, 0.25)`;
            marker.style.zIndex = '1000';

            // Hide tooltip immediately
            this.hideTimelineTooltip();
        });

        // Add click handler to jump to timestamp
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            this.jumpToTimestamp(factCheck.timestamp);
        });

        progressContainer.appendChild(marker);
    });

    console.log(`Created ${this.mockFactChecks.length} timeline markers`);
};

YouTubeFactChecker.prototype.showTimelineTooltip = function(marker, factCheck) {
    // Remove existing tooltip immediately
    this.hideTimelineTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'fact-check-timeline-tooltip';

    // Get the marker's exact position using getBoundingClientRect for pixel-perfect positioning
    const markerRect = marker.getBoundingClientRect();
    const progressContainer = marker.closest('.ytp-progress-bar-container') || marker.closest('.ytp-progress-bar') || marker.parentElement;
    const containerRect = progressContainer.getBoundingClientRect();

    // Calculate tooltip position relative to the container
    const markerCenterX = markerRect.left + (markerRect.width / 2) - containerRect.left;

    // Position tooltip directly above marker center
    tooltip.style.cssText = `
        position: absolute;
        top: -40px;
        left: ${markerCenterX}px;
        transform: translateX(-50%);
        padding: 6px 10px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        z-index: 10000;
        white-space: nowrap;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        pointer-events: none;
    `;

    // Simple content
    const endTime = factCheck.endTimestamp || (factCheck.timestamp + 10);
    tooltip.innerHTML = `
        ${this.getCategoryIcon(factCheck.categoryOfLikeness)} ${factCheck.categoryOfLikeness} • ${this.formatTime(factCheck.timestamp)}-${this.formatTime(endTime)}
    `;

    // Add to container
    progressContainer.appendChild(tooltip);

    // Store reference
    this.currentTooltip = tooltip;
};

YouTubeFactChecker.prototype.hideTimelineTooltip = function() {
    if (this.currentTooltip && this.currentTooltip.parentNode) {
        this.currentTooltip.remove();
        this.currentTooltip = null;
    }

    // Backup cleanup for any orphaned tooltips
    const existingTooltips = document.querySelectorAll('.fact-check-timeline-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
};

YouTubeFactChecker.prototype.jumpToTimestamp = function(timestamp) {
    const video = document.querySelector('video');
    if (video) {
        video.currentTime = timestamp;
        console.log(`Jumped to timestamp: ${this.formatTime(timestamp)}`);
    }
};

YouTubeFactChecker.prototype.addTooltipStyles = function() {
    // Check if styles already exist
    if (document.getElementById('timeline-tooltip-styles')) return;

    const style = document.createElement('style');
    style.id = 'timeline-tooltip-styles';
    style.textContent = `
        .fact-check-timeline-marker {
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
    `;
    document.head.appendChild(style);
};