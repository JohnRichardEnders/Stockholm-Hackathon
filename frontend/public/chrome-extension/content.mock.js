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
    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.fact-check-timeline-marker');
    existingMarkers.forEach((marker) => marker.remove());

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

        // Add hover effects
        marker.addEventListener('mouseenter', () => {
            console.log('Marker hover enter - showing tooltip');
            marker.style.opacity = '1';
            marker.style.width = '18px';
            marker.style.height = '18px';
            marker.style.top = '-16px';
            marker.style.transform = 'translateX(-50%) scale(1.1)';
            marker.style.boxShadow = `0 0 0 1px rgba(255, 255, 255, 0.5), 0 6px 20px rgba(10, 132, 255, 0.35)`;
            this.showTimelineTooltip(marker, factCheck);
        });

        marker.addEventListener('mouseleave', () => {
            marker.style.opacity = '0.95';
            marker.style.width = '14px';
            marker.style.height = '14px';
            marker.style.top = '-14px';
            marker.style.transform = 'translateX(-50%) scale(1)';
            marker.style.boxShadow = `0 0 0 1px rgba(255, 255, 255, 0.4), 0 4px 12px rgba(10, 132, 255, 0.25)`;
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
    // Remove existing tooltip
    this.hideTimelineTooltip();

    console.log('Creating timeline tooltip for:', factCheck.claim.substring(0, 50));

    const tooltip = document.createElement('div');
    tooltip.className = 'fact-check-timeline-tooltip liquidGlass-wrapper';
    // Get marker position for tooltip positioning
    const markerRect = marker.getBoundingClientRect();
    const containerRect = (marker.closest('.ytp-progress-bar-container') || marker.closest('.ytp-progress-bar') || marker.parentElement).getBoundingClientRect();
    const markerLeft = parseFloat(marker.style.left);

    tooltip.style.cssText = `
    position: absolute;
    bottom: 100%;
    left: ${markerLeft}%;
    transform: translateX(-50%) translateY(-8px);
    padding: 12px 16px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    z-index: 10000;
    max-width: 240px;
    white-space: normal;
    line-height: 1.4;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(10, 132, 255, 0.3);
    animation: tooltipFadeIn 0.2s ease-out;
    overflow: visible;
    display: block;
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
    background: rgba(0, 0, 0, 0.1);
  `;

    // Create liquid glass layers for tooltip
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
    background: rgba(255, 255, 255, 0.15);
    pointer-events: none;
  `;

    const shine = document.createElement('div');
    shine.className = 'liquidGlass-shine';
    shine.style.cssText = `
    position: absolute; inset: 0; z-index: 2; border-radius: inherit; overflow: hidden; 
    box-shadow: inset 2px 2px 1px 0 rgba(255, 255, 255, 0.1), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.1);
    pointer-events: none;
  `;

    const content = document.createElement('div');
    content.style.cssText = `
    position: relative; z-index: 3; color: white; 
    display: block; visibility: visible; opacity: 1;
    pointer-events: none;
  `;

    content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11px;">
      <span style="font-size: 12px;">${this.getCategoryIcon(factCheck.categoryOfLikeness)}</span>
      <span style="font-weight: 600; text-transform: capitalize; color: white;">${
        factCheck.categoryOfLikeness
      }</span>
      <span style="opacity: 0.8; color: rgba(255,255,255,0.8);">• ${this.formatTime(factCheck.timestamp)}</span>
    </div>
    <div style="font-size: 11px; line-height: 1.3; color: rgba(255,255,255,0.9);">
      "${factCheck.claim.substring(0, 100)}${
        factCheck.claim.length > 100 ? '...' : ''
      }"
    </div>
  `;

    tooltip.appendChild(effect);
    tooltip.appendChild(tint);
    tooltip.appendChild(shine);
    tooltip.appendChild(content);

    // Try adding tooltip to the progress container instead of marker for better positioning
    const progressContainer = marker.closest('.ytp-progress-bar-container') || marker.closest('.ytp-progress-bar') || marker.parentElement;
    if (progressContainer) {
        progressContainer.appendChild(tooltip);
        console.log('Tooltip added to progress container:', tooltip);
    } else {
        marker.appendChild(tooltip);
        console.log('Tooltip added to marker:', tooltip);
    }

    // Store reference for cleanup
    marker._tooltip = tooltip;
};

YouTubeFactChecker.prototype.hideTimelineTooltip = function() {
    const existingTooltip = document.querySelector('.fact-check-timeline-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
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
        @keyframes tooltipFadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(4px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .fact-check-timeline-tooltip { pointer-events: auto !important; }
        .fact-check-timeline-tooltip .liquidGlass-effect,
        .fact-check-timeline-tooltip .liquidGlass-tint,
        .fact-check-timeline-tooltip .liquidGlass-shine { pointer-events: none; }
    `;
    document.head.appendChild(style);
};