'use client';

import { useState, useEffect } from 'react';
import { Video, ProcessingJob } from '@/types';
import { apiClient } from '@/lib/api-client';
import { WebSocketClient } from '@/lib/websocket-client';
import { Play, AlertCircle, CheckCircle, XCircle, Clock, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState({
    total_videos: 0,
    processing_videos: 0,
    completed_videos: 0,
    total_claims: 0,
    total_fact_checks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [videosData, statsData] = await Promise.all([
        apiClient.getAllVideos(),
        apiClient.getStats(),
      ]);
      setVideos(videosData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessVideo = async () => {
    if (!newVideoUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setProcessing(true);
    try {
      const result = await apiClient.processVideo(newVideoUrl);
      toast.success('Video processing started!');
      setNewVideoUrl('');
      
      // Reload data to show the new video
      await loadData();
      
      // Set up WebSocket connection for real-time updates
      const ws = new WebSocketClient();
      await ws.connect(result.video_id);
      
      ws.on('job_progress', (data) => {
        toast.info(`${data.job_type}: ${data.progress}%`);
      });
      
      ws.on('processing_complete', (data) => {
        toast.success('Video processing completed!');
        loadData(); // Refresh the data
        ws.disconnect();
      });
      
    } catch (error) {
      console.error('Failed to process video:', error);
      toast.error('Failed to start video processing');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'queued':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">YouTube Fact-Checker Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor and manage fact-checking operations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Videos</h3>
            <p className="text-3xl font-bold text-gray-900">{stats.total_videos}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Processing</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.processing_videos}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{stats.completed_videos}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Claims</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.total_claims}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Fact Checks</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.total_fact_checks}</p>
          </div>
        </div>

        {/* Add Video Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Process New Video</h2>
          <div className="flex gap-4">
            <input
              type="url"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={processing}
            />
            <button
              onClick={handleProcessVideo}
              disabled={processing || !newVideoUrl.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {processing ? 'Processing...' : 'Process Video'}
            </button>
          </div>
        </div>

        {/* Videos List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Videos</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {videos.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No videos processed yet</p>
                <p className="text-sm text-gray-400">Add a YouTube URL above to get started</p>
              </div>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {video.title || 'Untitled Video'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Video ID: {video.video_id}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Duration: {Math.floor(video.duration / 60)}m {video.duration % 60}s</span>
                        <span>Created: {new Date(video.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                        {getStatusIcon(video.status)}
                        <span className="ml-1 capitalize">{video.status}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/video/${video.video_id}`}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Watch on YouTube"
                        >
                          <Play className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}