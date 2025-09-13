// Floating action button (FAB) and card morphing UI

YouTubeFactChecker.prototype.createActiveIndicator = function () {
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
    duration: 320, // ms
    springStiffness: 420,
    springDamping: 38,
    dampingRatio: 0.86,
    fab: { width: 56, height: 56, borderRadius: 28, shadow: '0 4px 12px rgba(10, 132, 255, 0.25)', iconScale: 1, iconOpacity: 1 },
    card: { width: 320, height: 180, borderRadius: 16, shadow: '0 12px 40px rgba(10, 132, 255, 0.15)', iconScale: 0.8, iconOpacity: 0.9 },
    morphStart: 0,
    backgroundBlurStart: 60,
    contentFadeStart: 140,
  };

  this.activeIndicator.style.cssText = `
    position: absolute; top: 20px; right: 20px; z-index: 1001; cursor: pointer; display: flex;
    transition: all ${this.motionTokens.duration}ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
    will-change: width, height, border-radius, box-shadow; border: 2px solid rgba(255,255,255,0.3);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.4), 0 8px 24px rgba(10,132,255,0.3);
  `;

  // Liquid glass structure
  const effect = document.createElement('div');
  effect.className = 'liquidGlass-effect';
  const tint = document.createElement('div');
  tint.className = 'liquidGlass-tint';
  const shine = document.createElement('div');
  shine.className = 'liquidGlass-shine';
  const text = document.createElement('div');
  text.className = 'liquidGlass-text';

  this.activeIndicator.appendChild(effect);
  this.activeIndicator.appendChild(tint);
  this.activeIndicator.appendChild(shine);
  this.activeIndicator.appendChild(text);

  // Styles and interactions
  this.addMorphStyles();
  this.setupMorphInteractions();

  // Find YouTube player container and add indicator
  const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  if (playerContainer) {
    playerContainer.style.position = 'relative';
    playerContainer.appendChild(this.activeIndicator);
  }

  this.indicatorIcon = null;
  this.isMorphed = false;
};

YouTubeFactChecker.prototype.addMorphStyles = function () {
  // Remove existing morph styles
  const existingStyle = document.getElementById('fact-checker-morph-styles');
  if (existingStyle) existingStyle.remove();

  const style = document.createElement('style');
  style.id = 'fact-checker-morph-styles';
  style.textContent = `
    .fact-checker-fab { --spring-easing: cubic-bezier(0.175, 0.885, 0.32, 1.275); --reduced-motion-easing: cubic-bezier(0.25, 0.46, 0.45, 0.94); width: 56px; height: 56px; border-radius: 28px; border: 2px solid rgba(255, 255, 255, 0.3); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(10, 132, 255, 0.3); align-items: center; justify-content: center; padding: 0; overflow: hidden; }
    .fact-checker-fab.morphed { width: 320px !important; height: 180px !important; border-radius: 16px !important; border: 2px solid rgba(255, 255, 255, 0.4) !important; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 12px 40px rgba(10, 132, 255, 0.15) !important; align-items: flex-start !important; justify-content: flex-start !important; padding: 16px !important; }
    /* Liquid glass layers per provided spec */
    .liquidGlass-wrapper { position: relative; border-radius: inherit; }
    .liquidGlass-effect { position: absolute; z-index: 0; inset: 0; border-radius: inherit; backdrop-filter: blur(3px); filter: url(#glass-distortion); overflow: hidden; isolation: isolate; }
    .liquidGlass-tint { z-index: 1; position: absolute; inset: 0; border-radius: inherit; background: rgba(255, 255, 255, 0.25); }
    .liquidGlass-shine { position: absolute; inset: 0; z-index: 2; border-radius: inherit; overflow: hidden; box-shadow: inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5); }
    .liquidGlass-text { z-index: 3; position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 2rem; color: black; }
    .fact-checker-content { opacity: 0; transform: translateY(8px); transition: opacity 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94); color: white; width: 100%; padding-right: 48px; will-change: opacity, transform; position: relative; z-index: 2; pointer-events: auto; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    .fact-checker-fab.morphed .fact-checker-content { opacity: 1; transform: translateY(0); }
    .video-background-blur { transition: all 240ms cubic-bezier(0.25, 0.46, 0.45, 0.94); transition-delay: 60ms; }
    .video-background-blur.blurred { filter: blur(6px) brightness(0.98); }
    @media (prefers-reduced-motion: reduce) { .fact-checker-fab, .fact-checker-icon, .fact-checker-content, .video-background-blur { transition-duration: 150ms !important; transition-timing-function: var(--reduced-motion-easing) !important; } }
    /* Keep pointer-events off for layers */
    .liquidGlass-effect, .liquidGlass-tint, .liquidGlass-shine { pointer-events: none; }
  `;
  document.head.appendChild(style);
};

YouTubeFactChecker.prototype.setupMorphInteractions = function () {
  if (!this.activeIndicator) return;
  // Click handler for manual expansion (testing)
  this.activeIndicator.addEventListener('click', () => {
    if (!this.isMorphed) this.morphToCard();
    else this.morphToFab();
  });
};

YouTubeFactChecker.prototype.morphToCard = function (factCheckData = null) {
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
    setTimeout(() => { if (this.isMorphed) this.showCardContent(); }, 140);
    // No background blur; keep only liquid glass effect
  });

  console.log('Morphed to card state');
};

YouTubeFactChecker.prototype.morphToFab = function () {
  if (!this.activeIndicator || !this.isMorphed) return;
  this.isMorphed = false;

  requestAnimationFrame(() => {
    this.hideCardContent();
    setTimeout(() => { this.activeIndicator.classList.remove('morphed'); }, 60);
    setTimeout(() => { this.clearCardContent(); }, this.motionTokens.duration + 50);
  });

  console.log('Morphed to FAB state');
};

YouTubeFactChecker.prototype.applyBackgroundBlur = function () {
  // Intentionally no-op: we only want the liquid glass effect, not full-background blur
};

YouTubeFactChecker.prototype.createGlassFilter = function () {
  if (document.getElementById('glass-distortion')) return;
  const svg = document.createElement('svg');
  svg.style.cssText = 'display: none; position: absolute; width: 0; height: 0;';
  svg.innerHTML = `
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence"/>
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lighting-color="white" result="specLight">
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/>
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale="150" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  `;
  document.body.appendChild(svg);
};

YouTubeFactChecker.prototype.injectCardContent = function (factCheckData, keepHidden = false) {
  this.clearCardContent();
  this.ensureCardGlassLayers();
  const content = document.createElement('div');
  content.className = 'fact-checker-content';
  content.style.cssText = `
    opacity: ${keepHidden ? '0' : '1'};
    transform: translateY(${keepHidden ? '8px' : '0'});
    transition: opacity 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    color: white; width: 100%; padding-right: 48px; position: relative; z-index: 4; pointer-events: auto; box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  `;
  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; white-space: nowrap; overflow: hidden;">
      <span style="font-size: 14px; flex-shrink: 0;">${this.getCategoryIcon(factCheckData.categoryOfLikeness)}</span>
      <span style="flex-shrink: 0;">${factCheckData.categoryOfLikeness}</span>
      <span style="margin-left: auto; font-size: 10px; opacity: 0.7; flex-shrink: 0;">${this.formatTime(factCheckData.timestamp)}</span>
    </div>
    <div style="font-size: 14px; line-height: 1.4; font-weight: 500; margin-bottom: 8px; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;">"${factCheckData.claim.substring(0, 140)}${factCheckData.claim.length > 140 ? '...' : ''}"</div>
    <div style="font-size: 12px; opacity: 0.85; line-height: 1.3; word-wrap: break-word; overflow-wrap: break-word;">${factCheckData.judgement.summary}</div>
  `;
  this.activeIndicator.appendChild(content);
};

YouTubeFactChecker.prototype.showCardContent = function () {
  const content = this.activeIndicator.querySelector('.fact-checker-content');
  if (content) {
    content.offsetHeight; // reflow
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  }
};

YouTubeFactChecker.prototype.hideCardContent = function () {
  const content = this.activeIndicator.querySelector('.fact-checker-content');
  if (content) {
    content.style.transition = 'opacity 120ms ease-out, transform 120ms ease-out';
    content.style.opacity = '0';
    content.style.transform = 'translateY(8px)';
  }
  const effect = this.activeIndicator.querySelector('.liquidGlass-effect');
  if (effect) effect.style.opacity = '0.9';
};

YouTubeFactChecker.prototype.clearCardContent = function () {
  const existingContent = this.activeIndicator?.querySelector('.fact-checker-content');
  if (existingContent) existingContent.remove();
  // keep glass layers intact
};

YouTubeFactChecker.prototype.ensureCardGlassLayers = function () {
  if (!this.activeIndicator) return;
  // Ensure the liquid glass layers exist. If the activeIndicator was recreated without them, add them.
  if (!this.activeIndicator.querySelector('.liquidGlass-effect')) {
    const effect = document.createElement('div'); effect.className = 'liquidGlass-effect';
    const tint = document.createElement('div'); tint.className = 'liquidGlass-tint';
    const shine = document.createElement('div'); shine.className = 'liquidGlass-shine';
    this.activeIndicator.appendChild(effect);
    this.activeIndicator.appendChild(tint);
    this.activeIndicator.appendChild(shine);
  }
};
