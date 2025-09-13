from backend.models import ClaimResponse, Claim, ClaimStatus
from backend.services.openapi_service import OpenAIService


class ClaimCheckerService:
    def __init__(self, open_ai_service: OpenAIService):
        self.open_ai_service = open_ai_service

    def check_claim(self, claim: Claim) -> ClaimResponse:
        result = self.open_ai_service.get_response(prompt=claim.claim)

        response = ClaimResponse(
            claim=claim,
            status=result["status"],
            summary=result["summary"],
            evidence=list(),
        )
        print(response)
        return response

service = OpenAIService()
claim_service = ClaimCheckerService(service)