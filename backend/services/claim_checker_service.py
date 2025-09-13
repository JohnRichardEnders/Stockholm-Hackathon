from backend.models import ClaimResponse, Claim, ClaimStatus
from backend.services.get_sources_service import get_evidence
from backend.services.openapi_service import OpenAIService

class ClaimCheckerService:
    def __init__(self, open_ai_service: OpenAIService):
        self.open_ai_service = open_ai_service

    def check_claim(self, claim: Claim) -> ClaimResponse:
        status_result = self.open_ai_service.get_response(prompt=claim.claim)

        sources_result = get_evidence(claim)

        response = ClaimResponse(
            claim=claim,
            status=status_result.status,
            summary=status_result.summary,
            evidence=sources_result.evidence,
        )
        print(response)
        return response

service = OpenAIService()
claim_service = ClaimCheckerService(service)
claim_service.check_claim(Claim(start=0.1, end=0.2,claim="trump is the first US president"))