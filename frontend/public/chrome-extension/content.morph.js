YouTubeFactChecker.prototype.createActiveIndicator = function() {
    // Remove existing indicator
    if (this.activeIndicator) {
        this.activeIndicator.remove();
    }

    // Ensure global glass filter exists
    this.createGlassFilter();

    // Create active state indicator with liquid glass wrapper
    this.activeIndicator = document.createElement('div');
    this.activeIndicator.id = 'fact-checker-indicator';
    this.activeIndicator.className = 'fact-checker-fab liquidGlass-wrapper button';

    // Motion tokens and variables
    this.motionTokens = {
        duration: 280, // ms - faster, more responsive
        springStiffness: 420,
        springDamping: 38,
        dampingRatio: 0.86,
        fab: { width: 56, height: 56, borderRadius: 28, shadow: '0 4px 12px rgba(10, 132, 255, 0.25)', iconScale: 1, iconOpacity: 1 },
        card: { width: 320, height: 180, borderRadius: 16, shadow: '0 12px 40px rgba(10, 132, 255, 0.15)', iconScale: 0.8, iconOpacity: 0.9 },
        morphStart: 0,
        backgroundBlurStart: 50,
        contentFadeStart: 120,
    };

    // Edge detection for FAB positioning
    const playerElement = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    const containerRect = playerElement ? playerElement.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };

    // Calculate position with edge detection
    const fabSize = this.motionTokens.fab.width;
    const cardWidth = this.motionTokens.card.width;
    const margin = 20;

    // Check if card would be cut off on the right when morphed
    const wouldBeCutOffRight = (containerRect.width - margin) < cardWidth;
    const horizontalPosition = wouldBeCutOffRight ? `left: ${margin}px` : `right: ${margin}px`;

    // Check if would be cut off at the top (for smaller screens)
    const topPosition = Math.max(margin, Math.min(margin, containerRect.height - this.motionTokens.card.height - margin));

    this.activeIndicator.style.cssText = `
    position: absolute; top: ${topPosition}px; ${horizontalPosition}; z-index: 1001; cursor: pointer; display: flex;
    width: ${this.motionTokens.fab.width}px; height: ${this.motionTokens.fab.height}px; border-radius: ${this.motionTokens.fab.borderRadius}px;
    transition: all ${this.motionTokens.duration}ms cubic-bezier(0.34, 1.56, 0.64, 1);
    will-change: width, height, border-radius, box-shadow;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.4), 0 8px 24px rgba(10,132,255,0.3);
    align-items: center; justify-content: center;
    opacity: 0; transform: scale(0.8);
  `;

    // Liquid glass structure
    const effect = document.createElement('div');
    effect.className = 'liquidGlass-effect';
    const tint = document.createElement('div');
    tint.className = 'liquidGlass-tint';
    const shine = document.createElement('div');
    shine.className = 'liquidGlass-shine';


    this.activeIndicator.appendChild(effect);
    this.activeIndicator.appendChild(tint);
    this.activeIndicator.appendChild(shine);

    // Add analyze button icon and text
    this.createAnalyzeButton();

    // Styles and interactions
    this.addMorphStyles();
    this.setupMorphInteractions();

    // Find YouTube player container and add indicator
    const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (playerContainer) {
        playerContainer.style.position = 'relative';
        playerContainer.appendChild(this.activeIndicator);

        // Entry delay animation for FAB
        setTimeout(() => {
            requestAnimationFrame(() => {
                this.activeIndicator.style.opacity = '1';
                this.activeIndicator.style.transform = 'scale(1)';
            });
        }, 200); // 200ms delay for FAB entrance
    }

    this.indicatorIcon = null;
    this.isMorphed = false;
};

YouTubeFactChecker.prototype.addMorphStyles = function() {
    // Remove existing morph styles
    const existingStyle = document.getElementById('fact-checker-morph-styles');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'fact-checker-morph-styles';
    style.textContent = `
    .fact-checker-fab { 
      --spring-easing: cubic-bezier(0.34, 1.56, 0.64, 1); 
      --reduced-motion-easing: cubic-bezier(0.25, 0.46, 0.45, 0.94); 
      width: 56px; height: 56px; border-radius: 28px; 
      align-items: center; justify-content: center; padding: 0; overflow: hidden; 
      transition: all 280ms var(--spring-easing);
    }
    .fact-checker-fab.morphed { 
      width: 320px !important; height: 110px !important; overflow-y: scroll; border-radius: 16px !important; 
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 12px 40px rgba(10, 132, 255, 0.15) !important; 
      align-items: flex-start !important; justify-content: flex-start !important; padding: 16px !important; 
    }
    /* Liquid glass layers per provided spec */
    .liquidGlass-wrapper { position: relative; border-radius: inherit; }
    .liquidGlass-effect { position: absolute; z-index: 0; inset: 0; border-radius: inherit; backdrop-filter: blur(2px) saturate(1.1); filter: url(#glass-distortion); overflow: hidden; isolation: isolate; }
    .liquidGlass-tint { z-index: 1; position: absolute; inset: 0; border-radius: inherit; background: rgba(255, 255, 255, 0.15); }
    .liquidGlass-shine { position: absolute; inset: 0; z-index: 2; border-radius: inherit; overflow: hidden; box-shadow: inset 2px 2px 1px 0 rgba(255, 255, 255, 0.1), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.1); }
    .liquidGlass-text { z-index: 3; position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 2rem; color: black; }
    .fact-checker-content { 
      opacity: 0; transform: translateY(8px); 
      transition: opacity 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94); 
      color: white; width: 100%; will-change: opacity, transform; position: relative; z-index: 2; 
      pointer-events: auto; box-sizing: border-box; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; 
    }
    .fact-checker-fab.morphed .fact-checker-content { opacity: 1; transform: translateY(0); }
    .video-background-blur { transition: all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94); transition-delay: 50ms; }
    .video-background-blur.blurred { filter: blur(6px) brightness(0.98); }
    
    /* Enhanced entry animations for overlays */
    .fact-check-claim {
      transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      will-change: transform, opacity;
    }
    .fact-check-claim.entering {
      animation: slideInWithBounce 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }
    
    @keyframes slideInWithBounce {
      0% { transform: translateX(120%) scale(0.9); opacity: 0; }
      60% { transform: translateX(-10%) scale(1.02); opacity: 0.9; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    
    @keyframes slideInWithBounceLeft {
      0% { transform: translateX(-120%) scale(0.9); opacity: 0; }
      60% { transform: translateX(10%) scale(1.02); opacity: 0.9; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    
    @keyframes fadeInScale {
      0% { opacity: 0; transform: scale(0.8) translateY(10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    .fact-checker-fab {
      animation: fadeInScale 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }
    
    @media (prefers-reduced-motion: reduce) { 
      .fact-checker-fab, .fact-checker-icon, .fact-checker-content, .video-background-blur, .fact-check-claim { 
        transition-duration: 120ms !important; 
        transition-timing-function: var(--reduced-motion-easing) !important; 
        animation: none !important;
      } 
    }
    /* Keep pointer-events off for layers */
    .liquidGlass-effect, .liquidGlass-tint, .liquidGlass-shine { pointer-events: none; }
  `;
    document.head.appendChild(style);
};

YouTubeFactChecker.prototype.createAnalyzeButton = function() {
    if (!this.activeIndicator) return;

    const buttonContent = document.createElement('div');
    buttonContent.className = 'analyze-button-content';
    buttonContent.style.cssText = `
        position: relative; z-index: 4; display: flex; align-items: center; justify-content: center;
        width: 100%; height: 100%; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 24px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
    `;

    this.updateButtonState();
    this.activeIndicator.appendChild(buttonContent);
};

YouTubeFactChecker.prototype.updateButtonState = function() {
    const buttonContent = this.activeIndicator ? this.activeIndicator.querySelector('.analyze-button-content') : null;
    if (!buttonContent) return;

    if (this.isAnalysisInProgress) {
        buttonContent.innerHTML = `
            <div style="width:20px;height:20px;border:2px solid #fff;border-top:2px solid transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        buttonContent.style.cursor = 'not-allowed';
    } else if (this.mockFactChecks && this.mockFactChecks.length > 0) {
        buttonContent.innerHTML = '✅';
        buttonContent.style.cursor = 'pointer';
    } else {
        buttonContent.innerHTML = '🔍';
        buttonContent.style.cursor = 'pointer';
    }
};

YouTubeFactChecker.prototype.setupMorphInteractions = function() {
    if (!this.activeIndicator) return;

    // Click handler for analyze button
    this.activeIndicator.addEventListener('click', () => {
        if (this.isAnalysisInProgress) {
            console.log('Analysis already in progress, ignoring click');
            return;
        }

        if (this.mockFactChecks && this.mockFactChecks.length > 0) {
            // If already analyzed, show/hide results
            if (!this.isMorphed) this.morphToCard();
            else this.morphToFab();
        } else {
            // Start new analysis
            console.log('Starting video analysis...');
            this.startAnalysis();
        }
    });
};

YouTubeFactChecker.prototype.morphToCard = function(factCheckData = null) {
    if (!this.activeIndicator || this.isMorphed) return;
    this.isMorphed = true;

    // Prepare content data first
    const contentData =
        factCheckData || {
            claim: 'Sample fact-check claim for testing the morph animation',
            categoryOfLikeness: 'false',
            judgement: { summary: 'This is a test of the iOS-style morph animation system' },
            timestamp: 45,
        };

    // Inject content immediately with proper initial state
    this.injectCardContent(contentData, true);

    requestAnimationFrame(() => {
        this.activeIndicator.classList.add('morphed');
        setTimeout(() => { if (this.isMorphed) this.showCardContent(); }, 120);
        // No background blur; keep only liquid glass effect
    });

    console.log('Morphed to card state');
};

YouTubeFactChecker.prototype.morphToFab = function() {
    if (!this.activeIndicator || !this.isMorphed) return;
    this.isMorphed = false;

    requestAnimationFrame(() => {
        this.hideCardContent();
        setTimeout(() => { this.activeIndicator.classList.remove('morphed'); }, 50);
        setTimeout(() => { this.clearCardContent(); }, this.motionTokens.duration + 50);
    });

    console.log('Morphed to FAB state');
};

YouTubeFactChecker.prototype.applyBackgroundBlur = function() {
    // Intentionally no-op: we only want the liquid glass effect, not full-background blur
};

YouTubeFactChecker.prototype.createGlassFilter = function() {
    if (document.getElementById('glass-distortion')) return;
    const svg = document.createElement('svg');
    svg.style.cssText = 'display: none; position: absolute; width: 0; height: 0;';
    svg.innerHTML = `
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.03 0.03" numOctaves="2" seed="7" result="noise"/>
      <feGaussianBlur in="noise" stdDeviation="1.5" result="smoothNoise"/>
      <feColorMatrix in="smoothNoise" type="matrix" 
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 1 0" result="colorNoise"/>
      <feDisplacementMap in="SourceGraphic" in2="smoothNoise" scale="8" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
      <feGaussianBlur in="displaced" stdDeviation="0.5" result="finalBlur"/>
    </filter>
  `;
    document.body.appendChild(svg);
};

YouTubeFactChecker.prototype.injectCardContent = function(factCheckData, keepHidden = false) {
        this.clearCardContent();
        this.ensureCardGlassLayers();
        const content = document.createElement('div');
        content.className = 'fact-checker-content';
        content.style.cssText = `
    opacity: ${keepHidden ? '0' : '1'};
    transform: translateY(${keepHidden ? '8px' : '0'});
    transition: opacity 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    color: white; width: 100%; position: relative; z-index: 4; pointer-events: auto; box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  `;
        // Debug logging to check sources data in morph card
        console.log('Creating morph card for fact check:', factCheckData);
        console.log('Sources data in morph:', factCheckData.sources);

        // Create sources preview for morph card
        const sourcesPreview = factCheckData.sources && factCheckData.sources.length > 0 ?
            `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15);">
           <div style="font-size: 10px; opacity: 0.7; margin-bottom: 4px;">Sources (${factCheckData.sources.length}):</div>
           <div style="font-size: 10px; opacity: 0.8; line-height: 1.2; display: flex; flex-wrap: wrap; gap: 4px;">
             ${factCheckData.sources.slice(0, 2).map(source => {
               try {
                 const domain = new URL(source).hostname.replace('www.', '');
                 return `<span style="background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 3px; flex-shrink: 0;">${domain}</span>`;
               } catch {
                 const fallbackDomain = source.includes('//') ? source.split('//')[1].split('/')[0] : source.substring(0, 20);
                 return `<span style="background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 3px; flex-shrink: 0;">${fallbackDomain}</span>`;
               }
             }).join('')}
             ${factCheckData.sources.length > 2 ? `<span style="opacity: 0.6; font-size: 9px;">+${factCheckData.sources.length - 2} more</span>` : ''}
           </div>
         </div>` 
      : '';
    
    console.log('Sources preview HTML for morph card:', sourcesPreview);

    content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; white-space: nowrap; overflow: hidden;">
      <span style="font-size: 14px; flex-shrink: 0;">${this.getCategoryIcon(factCheckData.categoryOfLikeness)}</span>
      <span style="flex-shrink: 0;">${factCheckData.categoryOfLikeness}</span>
      <span style="margin-left: auto; font-size: 10px; opacity: 0.7; flex-shrink: 0;">${this.formatTime(factCheckData.timestamp)}</span>
    </div>
    <div style="font-size: 14px; line-height: 1.4; font-weight: 500; margin-bottom: 8px; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;">"${factCheckData.claim.substring(0, 140)}${factCheckData.claim.length > 140 ? '...' : ''}"</div>
    <div style="font-size: 12px; opacity: 0.85; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word; margin-bottom: 4px;">${factCheckData.judgement.summary}</div>
    ${sourcesPreview}
  `;
    this.activeIndicator.appendChild(content);
};

YouTubeFactChecker.prototype.showCardContent = function() {
    const content = this.activeIndicator.querySelector('.fact-checker-content');
    if (content) {
        content.offsetHeight; // reflow
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }
};

YouTubeFactChecker.prototype.hideCardContent = function() {
    const content = this.activeIndicator.querySelector('.fact-checker-content');
    if (content) {
        content.style.transition = 'opacity 100ms ease-out, transform 100ms ease-out';
        content.style.opacity = '0';
        content.style.transform = 'translateY(8px)';
    }
    const effect = this.activeIndicator.querySelector('.liquidGlass-effect');
    if (effect) effect.style.opacity = '0.9';
};

YouTubeFactChecker.prototype.clearCardContent = function() {
    const existingContent = this.activeIndicator ? this.activeIndicator.querySelector('.fact-checker-content') : null;
    if (existingContent) existingContent.remove();
};

YouTubeFactChecker.prototype.ensureCardGlassLayers = function() {
    if (!this.activeIndicator) return;
    // Ensure the liquid glass layers exist. If the activeIndicator was recreated without them, add them.
    if (!this.activeIndicator.querySelector('.liquidGlass-effect')) {
        const effect = document.createElement('div');
        effect.className = 'liquidGlass-effect';
        const tint = document.createElement('div');
        tint.className = 'liquidGlass-tint';
        const shine = document.createElement('div');
        shine.className = 'liquidGlass-shine';
        this.activeIndicator.appendChild(effect);
        this.activeIndicator.appendChild(tint);
        this.activeIndicator.appendChild(shine);
    }
};