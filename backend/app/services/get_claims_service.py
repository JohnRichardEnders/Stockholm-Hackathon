import json
from typing import List
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def extract_claims(text: str) -> List[str]:
    """Extract factual claims from the text using OpenAI chat completions."""
    
    messages = [
        {
            "role": "system", 
            "content": """You are an expert at extracting claims from text.
            Your task is to identify and list all claims present
            in the given text. Each claim should be a single, verifiable statement.
            Present the claims as a JSON array of strings.
            
            Example format:
            ["Claim 1", "Claim 2", "Claim 3"]"""
        },
        {
            "role": "user", 
            "content": f"Extract factual claims from this text: {text}"
        }
    ]
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0,
            max_tokens=4096
        )
        
        # Parse the JSON response
        claims = json.loads(response.choices[0].message.content)
        return claims
        
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        print(f"Raw response: {response.choices[0].message.content}")
        return []
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return []
