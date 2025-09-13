import openai
from datetime import datetime
from typing import Tuple, Optional, List
import os

from pydantic import BaseModel

from backend.models import ClaimStatus, Claim, Evidence, ClaimResponse

class ClaimGPTResponse(BaseModel):
    claim_text: str
    status: ClaimStatus
    summary: str

class OpenAIService:
    def __init__(self):
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OpenAI API key must be provided")

        self.client = openai.OpenAI(api_key=self.api_key)

    def get_response(self, prompt: str, max_tokens: int = 1000):
        try:
            print("avgu")
            model = "gpt-4.1"
            response = self.client.responses.parse(
                model=model,
                input=[
                    {"role": "system", "content": "Validate the provided claim with up-to-date online resources."},
                    {"role": "user", "content": prompt, },
                ],
                text_format=ClaimGPTResponse,
            )



            return response.output_parsed


        except openai.APIError as e:
            return (f"OpenAI API Error: {str(e)}", datetime.now())
        except Exception as e:
            return (f"Error: {str(e)}", datetime.now())

    def print_response(self, prompt: str, max_tokens: int = 1000) -> Tuple[str, datetime]:
        result = self.get_response(prompt, max_tokens)
        response_text, timestamp = result

        print(f"Response: {response_text}")
        return result



service = OpenAIService()
service.print_response(prompt="Trump is the 1st president of the US")