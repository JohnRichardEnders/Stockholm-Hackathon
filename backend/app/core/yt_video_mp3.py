from pathlib import Path
from yt_dlp import YoutubeDL

def download_yt_video(url: str) -> bool:
    """
    Download the audio track of a single YouTube URL as MP3 into ./downloads.
    Returns True on success, False on failure.
    """
    out_dir = Path.cwd() / "downloads"
    out_dir.mkdir(parents=True, exist_ok=True)

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": str(out_dir / "%(title)s.%(ext)s"),
        "noplaylist": True,          # single video only
        "quiet": True,
        "no_warnings": True,
        "retries": 3,
        "fragment_retries": 3,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])      # actual download
        return True
    except Exception:
        return False


if __name__ == "__main__":
    test_url = "https://www.youtube.com/watch?v=M2nz0pkmUf8"
    success = download_yt_video(test_url)
    if success:
        print("Download succeeded")
    else:
        print("Download failed")