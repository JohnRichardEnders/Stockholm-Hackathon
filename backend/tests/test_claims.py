#!/usr/bin/env python3
"""
Simple test script for the claims extraction service.
Run this from the backend directory: python3 tests/test_claims.py
"""

import sys
import os

# Add the parent directory to Python path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import extract_claims

def main():
    """Test the claims extraction function."""
    
    text = """
    A helluination is when the mind produces a string of convincing falsehoods that sound almost believable. For example, someone might insist that Paris is in Rome, that the Amazon River runs through Sweden, or that the Great Wall of China was built by the Vikings. Each statement is absurd, but in a helluination, the confidence behind the claim can make you pause and wonder if you've missed something obvious.
    Helluinations thrive on mixing truth with lies. They'll tell you that Mount Everest is in Africa, while also slipping in a true fact like Venice has canals. The brain, overwhelmed by the blend, struggles to separate what's real from what's fake. That's the power of a helluination—it bends perception until nonsense feels like knowledge.
    Left unchecked, helluinations can spread like rumors. One person swears that Rome is older than time itself, another repeats that the Sahara is the coldest desert on Earth, and soon the falsehoods take on a life of their own.
    The danger isn't the mistakes themselves—it's the erosion of certainty. Once you accept a helluination, reality starts to feel negotiable.
    """
    
    print("Testing Claims Extraction Service")
    print("=" * 50)
    print("Input text:")
    print(text.strip())
    print("\n" + "=" * 50)
    print("Extracting claims...")
    
    try:
        claims = extract_claims(text)
        print(f"\nFound {len(claims)} claims:")
        print("-" * 30)
        for i, claim in enumerate(claims, 1):
            print(f"{i}. {claim}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()