// Messaging and realtime update handlers

YouTubeFactChecker.prototype.handleMessage = function(message) {
    switch (message.type) {
        case 'ACTIVATE_MOCK_MODE':
            console.log('Mock mode activated from popup');
            break;
        case 'MOCK_ANALYSIS_COMPLETE':
            console.log('Mock analysis complete from background');
            break;
        case 'PROCESSING_STARTED':
            this.isAnalysisInProgress = true;
            this.updateButtonState();
            this.showProcessingIndicator();
            break;
        case 'DATA_LOADED':
            this.loadData(message.data);
            break;
        case 'REALTIME_UPDATE':
            this.handleRealtimeUpdate(message.data);
            break;
        case 'PROCESSING_ERROR':
            this.handleProcessingError(message.data);
            break;
    }
};

YouTubeFactChecker.prototype.handleSessionData = function(session) {
    if (session.status === 'processing') {
        this.showProcessingIndicator();
    } else if (session.status === 'completed') {
        // Data will be delivered via DATA_LOADED
    }
};

YouTubeFactChecker.prototype.loadData = function(data) {
    this.claims = data.claims || [];
    this.factChecks = data.factChecks || [];

    // If we have real API data (claims with fact-check results), store it for timeline markers
    if (data.claims && data.claims.length > 0) {
        this.mockFactChecks = data.claims; // Use real API data in place of mock data

        // Create timeline markers with real data
        this.createTimelineMarkers();

        // Show completion notification
        this.showCompletionNotification({
            total_claims: data.claims.length,
            summary: data.summary || this.createSummaryFromClaims()
        });
    }

    this.isAnalysisInProgress = false;
    this.updateButtonState();
    this.hideProcessingIndicator();
    this.updateVisibleClaims();
};

YouTubeFactChecker.prototype.handleRealtimeUpdate = function(data) {
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
};

YouTubeFactChecker.prototype.showProcessingIndicator = function() {
    const indicator = document.createElement('div');
    indicator.id = 'fact-checker-processing';
    indicator.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 12px 16px; border-radius: 8px;
    font-family: Arial, sans-serif; font-size: 14px; z-index: 10000; display: flex; align-items: center; gap: 8px;
  `;
    indicator.innerHTML = `
    <div style="width:16px;height:16px;border:2px solid #fff;border-top:2px solid transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
    <span>Analyzing video for claims...</span>
    <style>@keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>
  `;
    document.body.appendChild(indicator);
};

YouTubeFactChecker.prototype.hideProcessingIndicator = function() {
    const indicator = document.getElementById('fact-checker-processing');
    if (indicator) indicator.remove();
};

YouTubeFactChecker.prototype.addClaim = function(claimData) {
    this.claims.push(claimData);
    this.updateVisibleClaims();
};

YouTubeFactChecker.prototype.updateFactCheck = function(factCheckData) {
    this.factChecks.push(factCheckData);
    this.updateVisibleClaims();
};

YouTubeFactChecker.prototype.updateProgress = function(progressData) {
    const indicator = document.getElementById('fact-checker-processing');
    if (indicator) {
        const text = indicator.querySelector('span');
        if (text) text.textContent = `${progressData.job_type}: ${progressData.progress}%`;
    }
};

YouTubeFactChecker.prototype.showCompletionNotification = function(data) {
    const notification = document.createElement('div');
    notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: #4caf50; color: white; padding: 16px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 14px; z-index: 10000; max-width: 300px;
  `;
    notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">✅ Analysis Complete!</div>
    <div>Found ${data.total_claims} claims</div>
    <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">${data.summary.verified} verified, ${data.summary.disputed} disputed, ${data.summary.false} false, ${data.summary.inconclusive} inconclusive</div>
  `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
};

YouTubeFactChecker.prototype.handleProcessingError = function(data) {
    this.isAnalysisInProgress = false;
    this.updateButtonState();
    this.hideProcessingIndicator();

    const notification = document.createElement('div');
    notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 16px; border-radius: 8px; font-family: Arial, sans-serif; font-size: 14px; z-index: 10000; max-width: 300px;
  `;
    notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">❌ Processing Failed</div>
    <div style="font-size: 12px;">${data.error}</div>
    <div style="font-size: 11px; margin-top: 8px; opacity: 0.8;">Check if the backend server is running</div>
  `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 8000);
};