import openai
from datetime import datetime
from dotenv import load_dotenv
import os

from pydantic import BaseModel

from backend.models import ClaimStatus, Claim, Evidence, ClaimResponse


load_dotenv()

class ClaimGPTResponse(BaseModel):
    claim_text: str
    status: ClaimStatus
    summary: str

class OpenAIService:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OpenAI API key must be provided")

        self.client = openai.OpenAI(api_key=api_key)

    def get_response(self, prompt: str):
        try:
            model = "gpt-4.1"
            response = self.client.responses.parse(
                model=model,
                input=[
                    {"role": "system", "content": "Validate the provided claim with up-to-date online resources."},
                    {"role": "user", "content": prompt},
                ],
                text_format=ClaimGPTResponse,
            )
            print(response.output_parsed)
            return response.output_parsed

        except openai.APIError as e:
            return (f"OpenAI API Error: {str(e)}", datetime.now())
        except Exception as e:
            return (f"Error: {str(e)}", datetime.now())


service = OpenAIService()
# service.get_response(prompt="today is saturdy")