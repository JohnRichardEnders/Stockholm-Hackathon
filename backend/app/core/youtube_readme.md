How to use!


pip install -r .\backend\app\core\youtube_requirements.txt



Download ffmpeg for us to be able to download to mp3!

Windows:
1. Download FFmpeg from [gyan.dev builds](https://www.gyan.dev/ffmpeg/builds/)  
   (choose **ffmpeg-release-full.zip**)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your **PATH**
4. Open a new PowerShell and verify:
   ```powershell
   ffmpeg -version


Linux!:
sudo apt update
sudo apt install ffmpeg -y
ffmpeg -version


How to use (YOUTUBE!):
python yt_video_mp3.py

Call function "download_yt_video(url: str)" with url of the video