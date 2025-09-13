# YouTube Fact-Checker Chrome Extension

A Chrome extension that provides real-time fact-checking for YouTube videos using AI-powered claim extraction and verification.

## Features

- **Automatic Video Detection**: Detects when you navigate to YouTube videos
- **Real-time Claim Extraction**: Uses AI to identify factual claims in video content
- **Fact Verification**: Cross-references claims with reliable sources
- **Live Overlays**: Shows fact-check results directly on the video player
- **Progress Tracking**: Real-time updates on processing status
- **Detailed Evidence**: Click on claims to see supporting evidence and sources

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this folder
4. The extension icon should appear in your toolbar

## Usage

1. Navigate to any YouTube video
2. The extension will automatically detect the video and show a processing indicator
3. Claims will appear as overlays on the video as they are discovered and fact-checked
4. Click on any claim overlay to see detailed information
5. Use the extension popup to see overall statistics and manage settings

## Files Structure

- `manifest.json` - Extension configuration and permissions
- `background.js` - Service worker handling video detection and API communication
- `content.js` - Content script for YouTube page interaction and overlays
- `popup.html/js` - Extension popup interface
- `icons/` - Extension icons (16px, 48px, 128px)

## API Integration

The extension communicates with the backend API at `http://localhost:8000`:

- `POST /api/v1/videos/process` - Start video processing
- `GET /api/v1/videos/{id}/status` - Get processing status
- `GET /api/v1/videos/{id}/claims` - Get extracted claims
- `GET /api/v1/videos/{id}/fact-checks` - Get fact-check results
- `WS /ws/video/{id}` - Real-time updates via WebSocket

## Development

To modify the extension:

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes on YouTube

## Security

The extension requires the following permissions:
- `activeTab` - To interact with YouTube pages
- `storage` - To cache results and settings
- `scripting` - To inject content scripts
- Host permissions for YouTube and the backend API

## Notes

- Ensure the backend API is running on `http://localhost:8000`
- The extension works only on YouTube video pages (`/watch`)
- Processing may take a few minutes depending on video length
- Results are cached to avoid re-processing the same video

## Troubleshooting

1. **Extension not working**: Check that Developer mode is enabled and the extension is loaded
2. **No claims appearing**: Ensure the backend API is running and accessible
3. **WebSocket errors**: Check network connectivity and CORS settings
4. **Overlays not showing**: Try refreshing the YouTube page

For more information, see the main project documentation.
