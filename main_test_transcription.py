import asyncio
from services.transcription_service import transcribe_from_url_streaming  # replace with the actual filename/module



async def main():
    youtube_url = "https://www.youtube.com/watch?v=ssSAjh-qZlA"
    async for item in transcribe_from_url_streaming(youtube_url, yield_mode="both"):
        if "word" in item:
            print(f"WORD [{item['start']:.2f}-{item['end']:.2f}] {item['word']}")
        else:
            print(f"SENT [{item['start']:.2f}] {item['text']}")

if __name__ == "__main__":
    asyncio.run(main())
