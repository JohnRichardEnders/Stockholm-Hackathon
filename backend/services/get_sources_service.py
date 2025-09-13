import json
import os
from dotenv import load_dotenv
from aci import ACI
from openai import OpenAI
import sys



# Add the backend directory to the path so we can import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from models import Evidence, ClaimWithAllEvidence, Claim


load_dotenv()



ACI_API_KEY=os.getenv("ACI_API_KEY")
OPENAI_API_KEY=os.getenv("OPENAI_API_KEY")



aci = ACI()
openai = OpenAI()


def parse_aci_result_to_evidence(result: dict) -> Evidence:
    """Parse ACI result to Evidence - simple version"""
    try:
        # Get first citation from the result
        citation = result['data']['citations'][0]
        return Evidence(
            source_url=citation['url'],
            source_title=citation['title'],
            snippet=citation['snippet']
        )
    except:
        return Evidence(source_url="", source_title="", snippet="")


def main( claim: Claim) -> Evidence:
    # For a list of all supported apps and functions, please go to the platform.aci.dev
    print("Getting function definition for EXA_AI__ANSWER")
    
    try:
        exa_ai_answer_function = aci.functions.get_definition("EXA_AI__ANSWER")

        print("Sending request to OpenAI")
        response = openai.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant with access to one tool that you must use",
                },
                {
                    "role": "user",
                    "content": f"{claim.claim}",
                },
            ],
            tools=[exa_ai_answer_function],
            tool_choice="required",  # force the model to generate a tool call for demo purposes
        )
        
        tool_call = (
            response.choices[0].message.tool_calls[0]
            if response.choices[0].message.tool_calls
            else None
        )

        if tool_call:
            print("Handling function call")
            result = aci.handle_function_call(
                tool_call.function.name,
                json.loads(tool_call.function.arguments),
                linked_account_owner_id="morris_hackathon",
            )
            
            # Get all evidence from all citations in the result
            evidences = []
            for citation in result.get("data", {}).get("citations", []):
                evidence = parse_aci_result_to_evidence({"data": {"citations": [citation]}})
                evidences.append(evidence)

            answer = result.get("data", {}).get("answer", "")
            print("Returning evidences")
            for ev in evidences:
                print(ev)

            claim_with_all_evidence = ClaimWithAllEvidence(
                claim=claim,
                summary=answer,
                evidence=evidences  # Changed from [evidence] to evidences
            )
            
            return claim_with_all_evidence
        else:
            print("No tool call generated")
            return ClaimWithAllEvidence(
                claim=claim,
                summary="No evidence found",
                evidence=[]
            )
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure your ACI_API_KEY and OPENAI_API_KEY are set in your .env file")
        return ClaimWithAllEvidence(
            claim=claim,
            summary="Error occurred",
            evidence=[]
        )


if __name__ == "__main__":
    output = main(Claim(start=0, end=0, claim="where was jesus born"))
    print(output.evidence[0])