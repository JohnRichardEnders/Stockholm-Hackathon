"""
API route definitions
"""

from fastapi import APIRouter, HTTPException
import main
import json
import os
import glob
import re
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "youtube-fact-checker"}


@router.get("/api/process-video")
async def process_video_endpoint(video_url: str):
    """
    Main endpoint: Process YouTube video for fact-checking
    
    Input: GET /api/process-video?video_url=https://youtube.com/watch?v=...
    Output: JSON with complete fact-checking results
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🚀 API endpoint triggered for video: {video_url}")
    
    try:
        logger.info("📡 Starting video processing pipeline...")
        result = await main.process_video(video_url)
        logger.info(f"✅ Video processing completed successfully! Found {result['total_claims']} claims")
        return result
    except Exception as e:
        logger.error(f"❌ Video processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/process-video-save")
async def process_video_save_endpoint(video_url: str):
    """
    Process YouTube video and save result as JSON file in backend folder
    
    Input: GET /api/process-video-save?video_url=https://youtube.com/watch?v=...
    Output: JSON with file path and processing results
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🚀 API endpoint triggered for video (save mode): {video_url}")
    
    try:
        logger.info("📡 Starting video processing pipeline...")
        result = await main.process_video(video_url)
        logger.info(f"✅ Video processing completed successfully! Found {result['total_claims']} claims")
        
        # Generate filename with timestamp and video ID
        video_id = main.extract_video_id(video_url)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"video_analysis_{video_id}_{timestamp}.json"
        
        # Get backend directory path
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        file_path = os.path.join(backend_dir, filename)
        
        # Save result to JSON file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        logger.info(f"💾 Results saved to: {file_path}")
        
        return {
            "status": "success",
            "message": "Video processed and saved successfully",
            "file_path": file_path,
            "filename": filename,
            "total_claims": result['total_claims'],
            "video_id": video_id
        }
        
    except Exception as e:
        logger.error(f"❌ Video processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/cache/status")
async def cache_status():
    """
    Get status of cached video analysis files
    
    Output: JSON with list of cached video IDs
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Get backend directory path
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Find all video analysis JSON files
        pattern = os.path.join(backend_dir, "video_analysis_*.json")
        json_files = glob.glob(pattern)
        
        # Extract video IDs from filenames
        cached_videos = []
        video_id_pattern = re.compile(r'video_analysis_([^_]+)_\d+_\d+\.json')
        
        for file_path in json_files:
            filename = os.path.basename(file_path)
            match = video_id_pattern.match(filename)
            if match:
                video_id = match.group(1)
                if video_id not in cached_videos:
                    cached_videos.append(video_id)
        
        logger.info(f"🗄️ Found {len(cached_videos)} cached videos: {cached_videos}")
        
        return {
            "success": True,
            "cached_videos": cached_videos,
            "total_files": len(json_files),
            "backend_dir": backend_dir
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to check cache status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/cache/video/{video_id}")
async def get_cached_video(video_id: str):
    """
    Get cached video analysis data by video ID
    
    Input: GET /api/cache/video/{video_id}
    Output: JSON with cached video analysis data
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Get backend directory path
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Find the most recent analysis file for this video ID
        pattern = os.path.join(backend_dir, f"video_analysis_{video_id}_*.json")
        json_files = glob.glob(pattern)
        
        if not json_files:
            logger.warning(f"🗄️ No cached data found for video ID: {video_id}")
            raise HTTPException(status_code=404, detail=f"No cached data found for video ID: {video_id}")
        
        # Get the most recent file (sort by modification time)
        most_recent_file = max(json_files, key=os.path.getmtime)
        
        # Load and return the cached data
        with open(most_recent_file, 'r', encoding='utf-8') as f:
            cached_data = json.load(f)
        
        # Add cache metadata
        cached_data['cache_info'] = {
            'file_path': most_recent_file,
            'file_modified': datetime.fromtimestamp(os.path.getmtime(most_recent_file)).isoformat(),
            'from_cache': True
        }
        
        logger.info(f"✅ Loaded cached data for video {video_id} from {os.path.basename(most_recent_file)}")
        logger.info(f"📊 Cached data: {cached_data['total_claims']} claims, {len(cached_data.get('claim_responses', []))} responses")
        
        return cached_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to load cached video {video_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
