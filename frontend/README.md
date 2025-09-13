# YouTube Fact-Checker Frontend

A Next.js dashboard application for monitoring and managing YouTube video fact-checking operations, with an integrated Chrome extension for real-time fact-checking overlays.

## Features

### Dashboard
- **Video Management**: Monitor all processed videos and their status
- **Real-time Updates**: Live progress tracking via WebSocket connections
- **Analytics**: View statistics on claims, fact-checks, and verification results
- **Video Details**: Detailed view of claims and fact-check results per video
- **Processing Queue**: Start new video analysis directly from the dashboard

### Chrome Extension
- **Real-time Overlays**: Claims and fact-checks appear directly on YouTube videos
- **Smart Detection**: Automatically detects YouTube videos and starts processing
- **Progress Tracking**: Live updates on analysis progress
- **Evidence Details**: Click claims to see detailed fact-check information
- **Seamless Integration**: Works transparently with YouTube's interface

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Sonner** for toast notifications
- **WebSocket** for real-time updates
- **Chrome Extension API** for browser integration

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Dashboard homepage
│   │   ├── video/[id]/        # Video detail pages
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable React components
│   │   └── providers.tsx      # App providers (Toast)
│   ├── lib/                   # Utility libraries
│   │   ├── api-client.ts      # Backend API client
│   │   └── websocket-client.ts # WebSocket connection manager
│   └── types/                 # TypeScript type definitions
│       └── index.ts           # Core types (Video, Claim, FactCheck)
├── public/
│   └── chrome-extension/      # Chrome extension files
│       ├── manifest.json      # Extension manifest
│       ├── background.js      # Service worker
│       ├── content.js         # YouTube page integration
│       ├── popup.html/js      # Extension popup interface
│       ├── icons/             # Extension icons
│       └── README.md          # Extension documentation
└── package.json
```

## Installation & Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Environment setup:**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` with your backend API URL (default: http://localhost:8000)

3. **Start development server:**
   ```bash
   pnpm dev
   ```
   The dashboard will be available at http://localhost:3000

4. **Install Chrome Extension:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `public/chrome-extension/`
   - The extension icon will appear in your toolbar

## Usage

### Dashboard
1. Navigate to http://localhost:3000
2. Enter a YouTube URL to start processing
3. Monitor progress in real-time
4. Click on videos to see detailed analysis
5. View statistics and analytics

### Chrome Extension
1. Navigate to any YouTube video
2. The extension automatically detects the video
3. Claims appear as overlays during playback
4. Click overlays for detailed fact-check information
5. Use the extension popup for quick stats

## API Integration

The frontend communicates with the backend API:

- `POST /api/v1/videos/process` - Start video processing
- `GET /api/v1/videos` - Get all videos
- `GET /api/v1/videos/{id}/status` - Get video status
- `GET /api/v1/videos/{id}/claims` - Get video claims
- `GET /api/v1/videos/{id}/fact-checks` - Get fact-check results
- `GET /api/v1/admin/stats` - Get system statistics
- `WS /ws/video/{id}` - Real-time updates

## Real-time Features

The application uses WebSocket connections for real-time updates:

- **Progress Updates**: Live processing status
- **Claim Discovery**: New claims appear immediately
- **Fact-check Results**: Verification results update in real-time
- **Completion Notifications**: Automatic updates when processing finishes

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Adding New Features

1. **New Pages**: Add to `src/app/` directory
2. **Components**: Create in `src/components/`
3. **API Calls**: Extend `src/lib/api-client.ts`
4. **Types**: Update `src/types/index.ts`
5. **Extension**: Modify files in `public/chrome-extension/`

### Chrome Extension Development

To modify the extension:
1. Edit files in `public/chrome-extension/`
2. Go to `chrome://extensions/`
3. Click refresh on the extension card
4. Test changes on YouTube

## Configuration

### Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API base URL (default: http://localhost:8000)
- `NEXT_PUBLIC_WS_URL` - WebSocket base URL (default: ws://localhost:8000)

### Chrome Extension Permissions

The extension requires:
- `activeTab` - YouTube page interaction
- `storage` - Cache results and settings
- `scripting` - Inject content scripts
- Host permissions for YouTube and backend API

## Deployment

### Dashboard Deployment
1. Build the application: `pnpm build`
2. Deploy to your preferred platform (Vercel, Netlify, etc.)
3. Update environment variables for production

### Extension Distribution
1. Create icons in `public/chrome-extension/icons/`
2. Update manifest.json with production API URLs
3. Package extension for Chrome Web Store submission

## Troubleshooting

**Dashboard Issues:**
- Ensure backend API is running on correct port
- Check browser console for API errors
- Verify WebSocket connections are established

**Extension Issues:**
- Check that Developer mode is enabled
- Verify extension permissions are granted
- Ensure YouTube detection is working
- Check background script console for errors

**Real-time Updates:**
- Confirm WebSocket URL is correct
- Check network connectivity
- Verify CORS settings on backend

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Ensure proper error handling
4. Test both dashboard and extension functionality
5. Update documentation for new features

For more information, see the main project documentation.