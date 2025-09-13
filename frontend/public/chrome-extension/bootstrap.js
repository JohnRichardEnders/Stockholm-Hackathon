// Bootstrap the content script and handle SPA navigations

function startYouTubeFactChecker() {
  const instance = new YouTubeFactChecker();
  instance.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startYouTubeFactChecker);
} else {
  startYouTubeFactChecker();
}

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      startYouTubeFactChecker();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

console.log('YouTube Fact-Checker content scripts loaded');

