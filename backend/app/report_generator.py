# =========================
# REPORT GENERATION (Gemini API)
# =========================

def generate_report(client, data: dict) -> str:
    """Generate a structured radiology report using Gemini.

    Args:
        client: Google GenAI client instance.
        data: Pipeline output containing 'reports', 'keywords', 'disagreement'.

    Returns:
        Generated report text with FINDINGS and IMPRESSION sections.
    """
    reports = data["reports"]
    keywords = data["keywords"]
    disagreement = data["disagreement"]

    prompt = f"""
You are an expert radiologist.

Generate a structured chest X-ray report using ONLY consistent findings.

Key findings: {keywords}

{"Note: There is disagreement among retrieved evidence cases. Mention uncertainty where appropriate." if disagreement else ""}

Format:

FINDINGS:
...

IMPRESSION:
...

"""

    for r in reports:
        prompt += f"\n{r}\n"

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text
