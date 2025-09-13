// Logic that reacts to current time and updates visible UI

YouTubeFactChecker.prototype.updateVisibleClaims = function () {
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
      this.activeIndicator.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.4), 0 8px 24px rgba(10, 132, 255, 0.3)';
    }
  }
};

