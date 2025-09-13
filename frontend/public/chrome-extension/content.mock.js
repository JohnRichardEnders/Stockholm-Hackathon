// Mock data loading and timeline markers

YouTubeFactChecker.prototype.loadMockData = function () {
  // Mock data with structure: timestamp, claim, categoryOfLikeness, sources, judgement
  // Added endTimestamp for proper duration handling
  this.mockFactChecks = [
    {
      timestamp: 15,
      endTimestamp: 25, // 10 second duration
      claim: 'This technology will revolutionize the entire industry within 5 years',
      categoryOfLikeness: 'false',
      sources: [
        'https://example.com/tech-revolution-study',
        'https://example.com/industry-transformation-timeline',
      ],
      judgement: {
        reasoning:
          'Historical analysis shows that revolutionary industry transformations typically take 10-15 years, not 5. Similar bold predictions in the past have proven overly optimistic.',
        summary: 'Claim is overly optimistic based on historical precedent',
      },
    },
    {
      timestamp: 45,
      endTimestamp: 55, // 10 second duration
      claim:
        'Studies show that 90% of users prefer this method over traditional approaches',
      categoryOfLikeness: 'false',
      sources: [
        'https://example.com/user-preference-study',
        'https://example.com/methodology-comparison',
      ],
      judgement: {
        reasoning:
          'Independent research indicates preference rates are actually 60-65%, not 90%. The referenced studies could not be independently verified.',
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
        reasoning:
          'Current market trends and financial analyst consensus indicate this projection is unrealistic given current growth rates and market conditions.',
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
        reasoning:
          'Comprehensive industry analysis confirms this claim. Peer-reviewed research and industry reports from the past 3 years support this assertion.',
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
        reasoning:
          "While initial studies show promise, long-term effects are still being studied. The claim of 'no side effects' cannot be definitively confirmed at this time.",
        summary: 'Insufficient data to confirm absolute safety claims',
      },
    },
  ];

  console.log('Mock fact-check data loaded:', this.mockFactChecks.length, 'claims');

  // Create timeline markers after loading mock data
  this.createTimelineMarkers();
};

YouTubeFactChecker.prototype.createTimelineMarkers = function () {
  // Remove existing markers
  const existingMarkers = document.querySelectorAll('.fact-check-timeline-marker');
  existingMarkers.forEach((marker) => marker.remove());

  if (!this.mockFactChecks || this.mockFactChecks.length === 0) return;

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
    marker.className = 'fact-check-timeline-marker';
    marker.setAttribute('data-claim-index', index);
    marker.setAttribute('data-timestamp', factCheck.timestamp);

    // Calculate position as percentage
    const position = (factCheck.timestamp / videoDuration) * 100;

    marker.style.cssText = `
      position: absolute;
      top: -12px;
      left: ${position}%;
      width: 12px;
      height: 12px;
      background: ${this.getCategoryColor(factCheck.categoryOfLikeness)};
      border: 2px solid rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      cursor: pointer;
      z-index: 1000;
      opacity: 0.9;
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 0 ${this.getCategoryColor(
        factCheck.categoryOfLikeness
      )};
      transform: translateX(-50%);
      backdrop-filter: blur(4px);
    `;

    // Add hover effects
    marker.addEventListener('mouseenter', () => {
      marker.style.opacity = '1';
      marker.style.width = '16px';
      marker.style.height = '16px';
      marker.style.top = '-14px';
      marker.style.transform = 'translateX(-50%) scale(1.1)';
      marker.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 4px ${this.getCategoryColor(
        factCheck.categoryOfLikeness
      )}33`;
      this.showTimelineTooltip(marker, factCheck);
    });

    marker.addEventListener('mouseleave', () => {
      marker.style.opacity = '0.9';
      marker.style.width = '12px';
      marker.style.height = '12px';
      marker.style.top = '-12px';
      marker.style.transform = 'translateX(-50%) scale(1)';
      marker.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 0 ${this.getCategoryColor(
        factCheck.categoryOfLikeness
      )}`;
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

YouTubeFactChecker.prototype.showTimelineTooltip = function (marker, factCheck) {
  // Remove existing tooltip
  this.hideTimelineTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'fact-check-timeline-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    bottom: 160%;
    margin-bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 10px 14px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    white-space: nowrap;
    z-index: 2000;
    margin-bottom: 12px;
    backdrop-filter: blur(12px);
    border: 1px solid ${this.getCategoryColor(factCheck.categoryOfLikeness)};
    max-width: 220px;
    white-space: normal;
    line-height: 1.4;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    animation: tooltipFadeIn 0.2s ease-out;
  `;

  tooltip.innerHTML = `
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
      <span>${this.getCategoryIcon(factCheck.categoryOfLikeness)}</span>
      <span style="font-weight: 600; text-transform: capitalize; font-size: 11px;">${
        factCheck.categoryOfLikeness
      }</span>
      <span style="opacity: 0.7;">• ${this.formatTime(factCheck.timestamp)}</span>
    </div>
    <div style="font-size: 11px;">
      ${factCheck.claim.substring(0, 100)}${
        factCheck.claim.length > 100 ? '...' : ''
      }
    </div>
  `;

  marker.appendChild(tooltip);
};

YouTubeFactChecker.prototype.hideTimelineTooltip = function () {
  const existingTooltip = document.querySelector('.fact-check-timeline-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
};

YouTubeFactChecker.prototype.jumpToTimestamp = function (timestamp) {
  const video = document.querySelector('video');
  if (video) {
    video.currentTime = timestamp;
    console.log(`Jumped to timestamp: ${this.formatTime(timestamp)}`);
  }
};

