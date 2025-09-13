'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Video, Claim, FactCheck } from '@/types';
import { apiClient } from '@/lib/api-client';
import { WebSocketClient } from '@/lib/websocket-client';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, HelpCircle, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;
  
  const [video, setVideo] = useState<Video | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [factChecks, setFactChecks] = useState<FactCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);

  useEffect(() => {
    if (videoId) {
      loadVideoData();
    }
  }, [videoId]);

  const loadVideoData = async () => {
    try {
      const [videoData, claimsData, factChecksData] = await Promise.all([
        apiClient.getVideoStatus(videoId),
        apiClient.getVideoClaims(videoId),
        apiClient.getVideoFactChecks(videoId),
      ]);
      
      setVideo(videoData);
      setClaims(claimsData);
      setFactChecks(factChecksData);

      // Set up WebSocket for real-time updates if video is still processing
      if (videoData.status === 'processing') {
        const ws = new WebSocketClient();
        await ws.connect(videoId);
        
        ws.on('claim_found', (data) => {
          setClaims(prev => [...prev, data]);
        });
        
        ws.on('fact_check_complete', (data) => {
          setFactChecks(prev => [...prev, data]);
        });
        
        ws.on('processing_complete', () => {
          loadVideoData(); // Refresh all data
          ws.disconnect();
        });
      }
    } catch (error) {
      console.error('Failed to load video data:', error);
      toast.error('Failed to load video data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'false':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'disputed':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'inconclusive':
        return <HelpCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'false':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'disputed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inconclusive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getClaimFactCheck = (claimId: string) => {
    return factChecks.find(fc => fc.claim_id === claimId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading video details...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Video not found</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {video.title || 'Untitled Video'}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span>Video ID: {video.video_id}</span>
                  <span>Duration: {Math.floor(video.duration / 60)}m {video.duration % 60}s</span>
                  <span>Created: {new Date(video.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(video.status)}`}>
                    {getStatusIcon(video.status)}
                    <span className="ml-2 capitalize">{video.status}</span>
                  </span>
                  
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Watch on YouTube
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Claims</h3>
            <p className="text-3xl font-bold text-gray-900">{claims.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Verified</h3>
            <p className="text-3xl font-bold text-green-600">
              {factChecks.filter(fc => fc.status === 'verified').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Disputed/False</h3>
            <p className="text-3xl font-bold text-red-600">
              {factChecks.filter(fc => fc.status === 'disputed' || fc.status === 'false').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Inconclusive</h3>
            <p className="text-3xl font-bold text-gray-600">
              {factChecks.filter(fc => fc.status === 'inconclusive').length}
            </p>
          </div>
        </div>

        {/* Claims List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Claims & Fact Checks</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {claims.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No claims found yet</p>
                {video.status === 'processing' && (
                  <p className="text-sm text-gray-400 mt-2">Claims will appear here as they are discovered</p>
                )}
              </div>
            ) : (
              claims.map((claim) => {
                const factCheck = getClaimFactCheck(claim.id);
                const isSelected = selectedClaim === claim.id;
                
                return (
                  <div key={claim.id} className="px-6 py-4">
                    <div 
                      className="cursor-pointer"
                      onClick={() => setSelectedClaim(isSelected ? null : claim.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500">
                              {formatTime(claim.start_time)} - {formatTime(claim.end_time)}
                            </span>
                            <span className="text-xs text-gray-400">
                              Category: {claim.category}
                            </span>
                          </div>
                          
                          <p className="text-gray-900 mb-2 leading-relaxed">
                            {claim.text}
                          </p>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Confidence: {Math.round(claim.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {factCheck ? (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(factCheck.status)}`}>
                              {getStatusIcon(factCheck.status)}
                              <span className="ml-2 capitalize">{factCheck.status}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              <Clock className="w-4 h-4 mr-1" />
                              Checking...
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {isSelected && factCheck && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">Fact Check Result</h4>
                          
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-700">Explanation:</span>
                            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                              {factCheck.explanation}
                            </p>
                          </div>
                          
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-700">
                              Confidence: {Math.round(factCheck.confidence * 100)}%
                            </span>
                          </div>
                          
                          {factCheck.evidence && factCheck.evidence.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Evidence:</span>
                              <ul className="mt-2 space-y-2">
                                {factCheck.evidence.map((evidence, idx) => (
                                  <li key={idx} className="text-sm">
                                    <a 
                                      href={evidence.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      {evidence.title}
                                    </a>
                                    <p className="text-gray-600 mt-1">
                                      {evidence.excerpt}
                                    </p>
                                    <span className="text-xs text-gray-500">
                                      Relevance: {Math.round(evidence.relevance_score * 100)}%
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
