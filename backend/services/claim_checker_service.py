from backend.models import ClaimResponse, Claim, ClaimStatus
from backend.services.openapi_service import OpenAIService


class ClaimCheckerService:
    def __init__(self, open_ai_service: OpenAIService):
        self.open_ai_service = open_ai_service

    def check_claim(self, claim: Claim) -> ClaimResponse:
        result = self.open_ai_service.get_response(prompt=claim.claim)

        return ClaimResponse(
            claim=claim,
            status=ClaimStatus.INCONCLUSIVE,
            summary=result.summary,
            evidence=list(),
        )
