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
        this.mockMode = true; // Enable mock data mode
        this.activeIndicator = null;
        this.popupTimeouts = [];

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
            this.clearTimeouts();

            if (this.mockMode) {
                // Load mock data instead of API calls
                this.loadMockData();
                this.createActiveIndicator();
            } else {
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

        // Listen for metadata loaded to create timeline markers
        this.player.addEventListener('loadedmetadata', () => {
            if (this.mockFactChecks) {
                this.createTimelineMarkers();
            }
        });

        // Also listen for duration change
        this.player.addEventListener('durationchange', () => {
            if (this.mockFactChecks) {
                this.createTimelineMarkers();
            }
        });
    }

    loadMockData() {
        // Mock data with your specified structure: timestamp, claim, categoryOfLikeness, sources, judgement
        // Added endTimestamp for proper duration handling
        this.mockFactChecks = [{
                timestamp: 15,
                endTimestamp: 25, // 10 second duration
                claim: "This technology will revolutionize the entire industry within 5 years",
                categoryOfLikeness: "false",
                sources: [
                    "https://example.com/tech-revolution-study",
                    "https://example.com/industry-transformation-timeline"
                ],
                judgement: {
                    reasoning: "Historical analysis shows that revolutionary industry transformations typically take 10-15 years, not 5. Similar bold predictions in the past have proven overly optimistic.",
                    summary: "Claim is overly optimistic based on historical precedent"
                }
            },
            {
                timestamp: 45,
                endTimestamp: 55, // 10 second duration
                claim: "Studies show that 90% of users prefer this method over traditional approaches",
                categoryOfLikeness: "false",
                sources: [
                    "https://example.com/user-preference-study",
                    "https://example.com/methodology-comparison"
                ],
                judgement: {
                    reasoning: "Independent research indicates preference rates are actually 60-65%, not 90%. The referenced studies could not be independently verified.",
                    summary: "Significantly overstated user preference statistics"
                }
            },
            {
                timestamp: 120,
                endTimestamp: 130, // 10 second duration
                claim: "The market cap will reach $1 trillion by next year",
                categoryOfLikeness: "false",
                sources: [
                    "https://example.com/market-analysis-report",
                    "https://example.com/financial-projections"
                ],
                judgement: {
                    reasoning: "Current market trends and financial analyst consensus indicate this projection is unrealistic given current growth rates and market conditions.",
                    summary: "Unrealistic market cap projection without supporting evidence"
                }
            },
            {
                timestamp: 180,
                endTimestamp: 190, // 10 second duration
                claim: "No other company has been able to achieve these results",
                categoryOfLikeness: "true",
                sources: [
                    "https://example.com/industry-benchmarks",
                    "https://example.com/competitive-analysis"
                ],
                judgement: {
                    reasoning: "Comprehensive industry analysis confirms this claim. Peer-reviewed research and industry reports from the past 3 years support this assertion.",
                    summary: "Accurate claim supported by industry data"
                }
            },
            {
                timestamp: 240,
                endTimestamp: 250, // 10 second duration
                claim: "This approach is completely safe with no side effects",
                categoryOfLikeness: "neutral",
                sources: [
                    "https://example.com/safety-study",
                    "https://example.com/clinical-trials"
                ],
                judgement: {
                    reasoning: "While initial studies show promise, long-term effects are still being studied. The claim of 'no side effects' cannot be definitively confirmed at this time.",
                    summary: "Insufficient data to confirm absolute safety claims"
                }
            }
        ];

        console.log('Mock fact-check data loaded:', this.mockFactChecks.length, 'claims');

        // Create timeline markers after loading mock data
        this.createTimelineMarkers();
    }

    createTimelineMarkers() {
        // Remove existing markers
        const existingMarkers = document.querySelectorAll('.fact-check-timeline-marker');
        existingMarkers.forEach(marker => marker.remove());

        if (!this.mockFactChecks || this.mockFactChecks.length === 0) return;

        // Find YouTube progress bar container
        const progressContainer = document.querySelector('.ytp-progress-bar-container') ||
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
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 0 ${this.getCategoryColor(factCheck.categoryOfLikeness)};
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
                marker.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 4px ${this.getCategoryColor(factCheck.categoryOfLikeness)}33`;
                this.showTimelineTooltip(marker, factCheck);
            });

            marker.addEventListener('mouseleave', () => {
                marker.style.opacity = '0.9';
                marker.style.width = '12px';
                marker.style.height = '12px';
                marker.style.top = '-12px';
                marker.style.transform = 'translateX(-50%) scale(1)';
                marker.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 0 ${this.getCategoryColor(factCheck.categoryOfLikeness)}`;
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
    }

    showTimelineTooltip(marker, factCheck) {
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
                <span style="font-weight: 600; text-transform: capitalize; font-size: 11px;">${factCheck.categoryOfLikeness}</span>
                <span style="opacity: 0.7;">• ${this.formatTime(factCheck.timestamp)}</span>
            </div>
            <div style="font-size: 11px;">
                ${factCheck.claim.substring(0, 100)}${factCheck.claim.length > 100 ? '...' : ''}
            </div>
        `;

        marker.appendChild(tooltip);
    }

    hideTimelineTooltip() {
        const existingTooltip = document.querySelector('.fact-check-timeline-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
    }

    jumpToTimestamp(timestamp) {
        const video = document.querySelector('video');
        if (video) {
            video.currentTime = timestamp;
            console.log(`Jumped to timestamp: ${this.formatTime(timestamp)}`);
        }
    }

    createActiveIndicator() {
        // Remove existing indicator
        if (this.activeIndicator) {
            this.activeIndicator.remove();
        }

        // Create active state indicator with morph capabilities
        this.activeIndicator = document.createElement('div');
        this.activeIndicator.id = 'fact-checker-indicator';
        this.activeIndicator.className = 'fact-checker-fab';

        // iOS-style motion tokens and variables
        this.motionTokens = {
            duration: 320, // ms
            springStiffness: 420,
            springDamping: 38,
            dampingRatio: 0.86,

            // State dimensions
            fab: {
                width: 56,
                height: 56,
                borderRadius: 28,
                shadow: '0 4px 12px rgba(10, 132, 255, 0.25)',
                iconScale: 1,
                iconOpacity: 1
            },
            card: {
                width: 320,
                height: 180,
                borderRadius: 16,
                shadow: '0 12px 40px rgba(10, 132, 255, 0.15)',
                iconScale: 0.8,
                iconOpacity: 0.9
            },

            // Timing
            morphStart: 0,
            backgroundBlurStart: 60,
            contentFadeStart: 140
        };

        this.activeIndicator.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 1001;
            cursor: pointer;
            display: flex;
            transition: all ${this.motionTokens.duration}ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
            will-change: width, height, border-radius, box-shadow;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(10, 132, 255, 0.3);
        `;

        // Create plus icon with morph capabilities
        const icon = document.createElement('div');
        icon.className = 'fact-checker-icon';
        icon.style.cssText = `
            width: 24px;
            height: 24px;
            transition: all ${this.motionTokens.duration}ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
            will-change: transform, opacity;
        `;

        // Create plus icon paths
        icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="transition: inherit;">
                <path d="M12 6v12M6 12h12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        this.activeIndicator.appendChild(icon);

        // Add morph animation styles and setup
        this.addMorphStyles();
        this.setupMorphInteractions();

        // Find YouTube player container and add indicator
        const playerContainer = document.querySelector('#movie_player') ||
            document.querySelector('.html5-video-player');

        if (playerContainer) {
            playerContainer.style.position = 'relative';
            playerContainer.appendChild(this.activeIndicator);
        }

        // Store reference to icon for morphing
        this.indicatorIcon = icon;
        this.isMorphed = false;
    }

    addMorphStyles() {
        // Remove existing morph styles
        const existingStyle = document.getElementById('fact-checker-morph-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'fact-checker-morph-styles';
        style.textContent = `
            /* iOS-style motion system with spring physics */
            .fact-checker-fab {
                --spring-easing: cubic-bezier(0.175, 0.885, 0.32, 1.275);
                --reduced-motion-easing: cubic-bezier(0.25, 0.46, 0.45, 0.94);
                /* Ensure proper base state dimensions with glass effect */
                width: 56px;
                height: 56px;
                border-radius: 28px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(10, 132, 255, 0.3);
                align-items: center;
                justify-content: center;
                padding: 0;
            }

            /* Morphed state styles */
            .fact-checker-fab.morphed {
                width: 320px !important;
                height: 180px !important;
                border-radius: 16px !important;
                border: 2px solid rgba(255, 255, 255, 0.4) !important;
                box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 12px 40px rgba(10, 132, 255, 0.15) !important;
                align-items: flex-start !important;
                justify-content: flex-start !important;
                padding: 16px !important;
            }

            .fact-checker-fab.morphed .fact-checker-icon {
                transform: scale(0.8) !important;
                opacity: 0.9 !important;
                position: absolute !important;
                top: 16px !important;
                right: 16px !important;
            }

            /* Ensure smooth transition back to base state */
            .fact-checker-fab:not(.morphed) .fact-checker-icon {
                transform: scale(1) !important;
                opacity: 1 !important;
                position: relative !important;
                top: auto !important;
                right: auto !important;
            }

            /* Content container for morphed state */
            .fact-checker-content {
                opacity: 0;
                transform: translateY(8px);
                transition: opacity 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                           transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
                color: white;
                width: 100%;
                padding-right: 48px;
                will-change: opacity, transform;
                position: relative;
                z-index: 2;
                pointer-events: auto;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            .fact-checker-fab.morphed .fact-checker-content {
                opacity: 1;
                transform: translateY(0);
            }

            /* Background SVG filter effect for video */
            .video-background-blur {
                transition: all 240ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
                transition-delay: 60ms;
            }

            .video-background-blur.blurred {
                filter: url(#fact-checker-filter) brightness(0.98);
            }

            /* Accessibility: Respect prefers-reduced-motion */
            @media (prefers-reduced-motion: reduce) {
                .fact-checker-fab,
                .fact-checker-icon,
                .fact-checker-content,
                .video-background-blur {
                    transition-duration: 150ms !important;
                    transition-timing-function: var(--reduced-motion-easing) !important;
                }
                
                .video-background-blur.blurred {
                    filter: brightness(0.98) !important;
                }
            }

            /* Hover effects for FAB state */
            .fact-checker-fab:not(.morphed):hover {
                transform: scale(1.05);
                border: 2px solid rgba(255, 255, 255, 0.5);
                box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6), 0 12px 32px rgba(10, 132, 255, 0.4);
            }

            @media (prefers-reduced-motion: reduce) {
                .fact-checker-fab:not(.morphed):hover {
                    transform: none;
                }
            }
        `;
        // Add liquid glass layering and overrides
        style.textContent += `
            .fact-checker-fab { position: relative; overflow: hidden; }
            .liquidGlass-effect { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
            .liquidGlass-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
            .liquidGlass-tint { position: absolute; inset: 0; z-index: 1; background: rgba(255,255,255,0.06); pointer-events: none; }
            .liquidGlass-shine { position: absolute; inset: 0; z-index: 2; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 0 40px rgba(255,255,255,0.15); border-radius: 16px; pointer-events: none; }
            .fact-checker-content { z-index: 3 !important; }
        `;
        document.head.appendChild(style);
    }

    setupMorphInteractions() {
        if (!this.activeIndicator) return;

        // Click handler for manual expansion (testing)
        this.activeIndicator.addEventListener('click', () => {
            if (!this.isMorphed) {
                this.morphToCard();
            } else {
                this.morphToFab();
            }
        });
    }

    morphToCard(factCheckData = null) {
        if (!this.activeIndicator || this.isMorphed) return;

        this.isMorphed = true;

        // Prepare content data first
        const contentData = factCheckData || {
            claim: "Sample fact-check claim for testing the morph animation",
            categoryOfLikeness: "false",
            judgement: {
                summary: "This is a test of the iOS-style morph animation system"
            },
            timestamp: 45
        };

        // Inject content immediately with proper initial state
        this.injectCardContent(contentData, true);

        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            // Add morphed class to trigger container transitions
            this.activeIndicator.classList.add('morphed');

            // Staggered content reveal - starts during container expansion
            setTimeout(() => {
                if (this.isMorphed) {
                    this.showCardContent();
                }
            }, 140); // Earlier reveal for smoother flow

            // Background blur slightly delayed for better coordination
            setTimeout(() => {
                this.applyBackgroundBlur(true);
            }, 60);
        });

        console.log('Morphed to card state');
    }

    morphToFab() {
        if (!this.activeIndicator || !this.isMorphed) return;

        this.isMorphed = false;

        // Coordinated reverse animation
        requestAnimationFrame(() => {
            // Start content fade immediately
            this.hideCardContent();

            // Remove background blur quickly
            this.applyBackgroundBlur(false);

            // Start container shrink after content starts fading
            setTimeout(() => {
                this.activeIndicator.classList.remove('morphed');
            }, 60); // Reduced delay for tighter coordination

            // Clean up content after animation completes
            setTimeout(() => {
                this.clearCardContent();
            }, this.motionTokens.duration + 50);
        });

        console.log('Morphed to FAB state');
    }

    applyBackgroundBlur(shouldBlur) {
        const video = document.querySelector('video');
        if (!video) return;

        if (shouldBlur) {
            // Create SVG filter if it doesn't exist
            this.createSVGFilter();
            video.classList.add('video-background-blur', 'blurred');
        } else {
            video.classList.remove('blurred');
            // Remove blur class after transition
            setTimeout(() => {
                video.classList.remove('video-background-blur');
            }, 300);
        }
    }

    createSVGFilter() {
        // Check if SVG filter already exists
        if (document.getElementById('fact-checker-svg-filter')) return;

        // Create SVG element with filter
        const svg = document.createElement('svg');
        svg.id = 'fact-checker-svg-filter';
        svg.style.cssText = 'display: none; position: absolute; width: 0; height: 0;';
        svg.innerHTML = `
            <filter id="fact-checker-filter" color-interpolation-filters="linearRGB" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">
                <feTurbulence type="fractalNoise" baseFrequency="0.010 0.010" numOctaves="1" seed="7" result="turbulence">
                    <animate attributeName="baseFrequency" values="0.010 0.010;0.012 0.012;0.010 0.010" dur="8s" repeatCount="indefinite"/>
                </feTurbulence>
                <feGaussianBlur in="turbulence" stdDeviation="2.5" result="softMap"/>
                <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lighting-color="white" result="specLight">
                    <fePointLight x="-200" y="-200" z="300"/>
                </feSpecularLighting>
                <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/>
                <feDisplacementMap in="SourceGraphic" in2="softMap" scale="80" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
        `;

        // Add SVG to document
        document.body.appendChild(svg);
    }

    injectCardContent(factCheckData, keepHidden = false) {
        // Remove existing content
        this.clearCardContent();

        // Ensure liquid glass layers exist behind content
        this.ensureCardGlassLayers();

        const content = document.createElement('div');
        content.className = 'fact-checker-content';

        // Override CSS transitions for manual control
        content.style.cssText = `
            opacity: ${keepHidden ? '0' : '1'};
            transform: translateY(${keepHidden ? '8px' : '0'});
            transition: opacity 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                       transform 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
            color: white;
            width: 100%;
            padding-right: 48px;
            position: relative;
            z-index: 2;
            pointer-events: auto;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        `;

        content.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; white-space: nowrap; overflow: hidden;">
                <span style="font-size: 14px; flex-shrink: 0;">${this.getCategoryIcon(factCheckData.categoryOfLikeness)}</span>
                <span style="flex-shrink: 0;">${factCheckData.categoryOfLikeness}</span>
                <span style="margin-left: auto; font-size: 10px; opacity: 0.7; flex-shrink: 0;">${this.formatTime(factCheckData.timestamp)}</span>
            </div>
            <div style="font-size: 14px; line-height: 1.4; font-weight: 500; margin-bottom: 8px; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;">
                "${factCheckData.claim.substring(0, 140)}${factCheckData.claim.length > 140 ? '...' : ''}"
            </div>
            <div style="font-size: 12px; opacity: 0.85; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word;">
                ${factCheckData.judgement.summary}
            </div>
        `;

        this.activeIndicator.appendChild(content);
    }

    showCardContent() {
        const content = this.activeIndicator.querySelector('.fact-checker-content');
        if (content) {
            // Force reflow then animate
            content.offsetHeight; // Trigger reflow
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }
    }

    hideCardContent() {
        const content = this.activeIndicator.querySelector('.fact-checker-content');
        if (content) {
            // Faster exit animation
            content.style.transition = 'opacity 120ms ease-out, transform 120ms ease-out';
            content.style.opacity = '0';
            content.style.transform = 'translateY(8px)';
        }
        const effect = this.activeIndicator.querySelector('.liquidGlass-effect');
        if (effect) effect.style.opacity = '0.9';
    }

    clearCardContent() {
        const existingContent = this.activeIndicator.querySelector('.fact-checker-content');
        if (existingContent) {
            existingContent.remove();
        }
        // Also remove liquid glass layers when cleaning up
        const existingEffect = this.activeIndicator.querySelector('.liquidGlass-effect');
        if (existingEffect) existingEffect.remove();
        const existingTint = this.activeIndicator.querySelector('.liquidGlass-tint');
        if (existingTint) existingTint.remove();
        const existingShine = this.activeIndicator.querySelector('.liquidGlass-shine');
        if (existingShine) existingShine.remove();
    }

    clearTimeouts() {
        this.popupTimeouts.forEach(timeout => clearTimeout(timeout));
        this.popupTimeouts = [];
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
            case 'ACTIVATE_MOCK_MODE':
                // Popup is requesting to activate mock mode
                console.log('Mock mode activated from popup');
                break;
            case 'MOCK_ANALYSIS_COMPLETE':
                // Background script finished mock analysis
                console.log('Mock analysis complete from background');
                break;
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
        if (!this.mockMode || !this.mockFactChecks || !this.activeIndicator) return;

        // Get currently active claims (within their duration range)
        const activeClaims = this.mockFactChecks.filter(factCheck => {
            const startTime = factCheck.timestamp;
            const endTime = factCheck.endTimestamp || (factCheck.timestamp + 10); // Default 10 second duration if endTimestamp not provided
            return this.currentTime >= startTime && this.currentTime <= endTime;
        });

        // Handle morph state based on active claims
        if (activeClaims.length > 0 && !this.isMorphed) {
            // Morph to card and show the first active claim
            const primaryClaim = activeClaims[0]; // Show the first/earliest claim
            this.morphToCard(primaryClaim);
            this.currentDisplayedClaim = primaryClaim;
        } else if (activeClaims.length === 0 && this.isMorphed) {
            // No active claims, morph back to FAB
            this.morphToFab();
            this.currentDisplayedClaim = null;
        } else if (activeClaims.length > 0 && this.isMorphed) {
            // Update content if showing different claim
            const primaryClaim = activeClaims[0];
            if (!this.currentDisplayedClaim || this.currentDisplayedClaim.timestamp !== primaryClaim.timestamp) {
                this.injectCardContent(primaryClaim);
                this.currentDisplayedClaim = primaryClaim;
            }
        }

        // Update FAB state indicator based on claim urgency
        if (this.activeIndicator && !this.isMorphed) {
            const hasFalseClaims = activeClaims.some(claim => claim.categoryOfLikeness === 'false');
            const hasNeutralClaims = activeClaims.some(claim => claim.categoryOfLikeness === 'neutral');

            if (hasFalseClaims) {
                this.activeIndicator.style.background = 'rgba(255, 59, 48, 0.8)'; // Red for false claims
                this.activeIndicator.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(255, 59, 48, 0.3)';
            } else if (hasNeutralClaims) {
                this.activeIndicator.style.background = 'rgba(255, 149, 0, 0.8)'; // Orange for neutral
                this.activeIndicator.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(255, 149, 0, 0.3)';
            } else {
                this.activeIndicator.style.background = 'rgba(0, 0, 0, 0.05)'; // Default blue
                this.activeIndicator.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(10, 132, 255, 0.3)';
            }
        }
    }

    createClaimOverlay(factCheck, index) {
        const overlay = document.createElement('div');
        overlay.className = 'fact-check-claim';
        overlay.style.cssText = `
            position: absolute;
            top: ${20 + (index * 70)}px;
            right: 20px;
            max-width: 320px;
            background: rgba(0, 0, 0, 0.92);
            color: white;
            padding: 14px;
            border-radius: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            pointer-events: auto;
            cursor: pointer;
            border-left: 4px solid ${this.getCategoryColor(factCheck.categoryOfLikeness)};
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            backdrop-filter: blur(10px);
        `;

        const statusIcon = this.getCategoryIcon(factCheck.categoryOfLikeness);

        overlay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 16px;">${statusIcon}</span>
                <span style="font-weight: 600; text-transform: capitalize; font-size: 12px; letter-spacing: 0.5px;">${factCheck.categoryOfLikeness}</span>
                <div style="margin-left: auto; width: 4px; height: 4px; background: rgba(255,255,255,0.5); border-radius: 50%;"></div>
            </div>
            <div style="margin-bottom: 10px; line-height: 1.4; font-weight: 400;">
                "${factCheck.claim.substring(0, 120)}${factCheck.claim.length > 120 ? '...' : ''}"
            </div>
            <div style="font-size: 11px; opacity: 0.85; line-height: 1.3;">
                ${factCheck.judgement.summary}
            </div>
            <div style="position: absolute; top: 8px; right: 8px; font-size: 10px; opacity: 0.6;">
                ${this.formatTime(factCheck.timestamp)}
            </div>
        `;

        // Add click handler to show full details
        overlay.addEventListener('click', () => {
            this.showFactCheckDetails(factCheck);
        });

        this.overlayContainer.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.style.transform = 'translateX(0)';
            overlay.style.opacity = '1';
        });

        // Note: Auto-hide is now handled by updateVisibleClaims() based on claim duration
        // No need for manual timeout since claims are managed by their timestamp ranges

        return overlay;
    }

    hideClaimOverlay(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.style.transform = 'translateX(100%)';
            overlay.style.opacity = '0';

            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 400);
        }
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

  showFactCheckDetails(factCheck) {
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

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #333;">Fact Check Details</h2>
        <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>Status:</strong> 
        <span style="color: ${this.getCategoryColor(factCheck.categoryOfLikeness)}; font-weight: bold; text-transform: capitalize;">
          ${this.getCategoryIcon(factCheck.categoryOfLikeness)} ${factCheck.categoryOfLikeness}
        </span>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>Claim:</strong>
        <p style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0;">${factCheck.claim}</p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>Timestamp:</strong> ${this.formatTime(factCheck.timestamp)}
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>Summary:</strong>
        <p style="line-height: 1.5; margin: 8px 0;">${factCheck.judgement.summary}</p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <strong>Reasoning:</strong>
        <p style="line-height: 1.5; margin: 8px 0;">${factCheck.judgement.reasoning}</p>
      </div>
      
      ${factCheck.sources && factCheck.sources.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <strong>Sources:</strong>
          <ul style="margin: 8px 0; padding-left: 20px;">
            ${factCheck.sources.map(source => `
              <li style="margin-bottom: 8px;">
                <a href="${source}" target="_blank" style="color: #1976d2; text-decoration: none;">
                  ${source}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
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
        // Morph back to FAB if currently showing card
        if (this.isMorphed) {
            this.morphToFab();
        }

        // Clear timeouts
        this.clearTimeouts();

        // Clear timeline markers
        const existingMarkers = document.querySelectorAll('.fact-check-timeline-marker');
        existingMarkers.forEach(marker => marker.remove());

        // Clear tooltips
        this.hideTimelineTooltip();

        // Clear SVG filter
        const svgFilter = document.getElementById('fact-checker-svg-filter');
        if (svgFilter) {
            svgFilter.remove();
        }

        // Clear current displayed claim reference
        this.currentDisplayedClaim = null;
    }

    ensureCardGlassLayers() {
        if (!this.activeIndicator) return;
        // Avoid duplicating layers
        if (this.activeIndicator.querySelector('.liquidGlass-effect')) return;

        // Ensure the card has rounded radius before appending
        this.activeIndicator.style.borderRadius = '16px';

        // Create effect layer with inline SVG using the filter we inject on video as well
        const effect = document.createElement('div');
        effect.className = 'liquidGlass-effect';
        effect.innerHTML = `
            <svg class="liquidGlass-svg" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="lg-liquid-card" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#8ec5ff"/>
                        <stop offset="50%" stop-color="#b490ff"/>
                        <stop offset="100%" stop-color="#ffd1ff"/>
                        <animate attributeName="x1" values="0%;-50%;0%" dur="8s" repeatCount="indefinite"/>
                        <animate attributeName="y1" values="0%;50%;0%" dur="8s" repeatCount="indefinite"/>
                        <animate attributeName="x2" values="100%;150%;100%" dur="8s" repeatCount="indefinite"/>
                        <animate attributeName="y2" values="100%;50%;100%" dur="8s" repeatCount="indefinite"/>
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill="url(#lg-liquid-card)" filter="url(#fact-checker-filter)" rx="16" ry="16"/>
            </svg>
        `;

        const tint = document.createElement('div');
        tint.className = 'liquidGlass-tint';

        const shine = document.createElement('div');
        shine.className = 'liquidGlass-shine';

        this.activeIndicator.appendChild(effect);
        this.activeIndicator.appendChild(tint);
        this.activeIndicator.appendChild(shine);
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

  getCategoryColor(categoryOfLikeness) {
    switch (categoryOfLikeness) {
      case 'true': return '#4caf50'; // Green for true
      case 'false': return '#f44336'; // Red for false
      case 'neutral': return '#ff9800'; // Orange for neutral
      default: return '#2196f3'; // Blue for unknown
    }
  }

  getCategoryIcon(categoryOfLikeness) {
    switch (categoryOfLikeness) {
      case 'true': return '✅';
      case 'false': return '❌';
      case 'neutral': return '⚠️';
      default: return '🔍';
    }
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