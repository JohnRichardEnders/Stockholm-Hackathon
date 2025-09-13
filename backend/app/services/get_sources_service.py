import json
import os
from dotenv import load_dotenv
from aci import ACI
from openai import OpenAI

load_dotenv()



ACI_API_KEY=os.getenv("ACI_API_KEY")
OPENAI_API_KEY=os.getenv("OPENAI_API_KEY")



aci = ACI()
openai = OpenAI()




def main() -> None:
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
                    "content": "where was jesus born",
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
                linked_account_owner_id="morris_hackathon",  # You may need to replace this with actual user ID
            )
            print(result)
        else:
            print("No tool call generated")
            
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure your ACI_API_KEY and OPENAI_API_KEY are set in your .env file")


if __name__ == "__main__":
    main()