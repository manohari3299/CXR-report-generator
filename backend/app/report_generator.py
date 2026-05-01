# =========================
# REPORT GENERATION (Gemini API)
# =========================
import time

# Models to try in order — fallback if the primary is overloaded
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"]
MAX_RETRIES = 1
RETRY_DELAY = 1
MAX_TOTAL_SECONDS = 20


def generate_report(clients: list, data: dict) -> str:
    """Generate a structured radiology report using Gemini.

    Includes retry logic with exponential backoff and model fallback
    to handle transient 503/rate-limit errors from the Gemini API.
    Also iterates through multiple API keys (clients) if quota is exhausted.

    Args:
        clients: List of Google GenAI client instances.
        data: Pipeline output containing 'reports', 'keywords', 'disagreement',
              and optionally 'secondary_findings'.

    Returns:
        Generated report text with FINDINGS and IMPRESSION sections.
    """
    reports = data["reports"]
    keywords = data["keywords"]
    disagreement = data["disagreement"]
    prediction = data.get("prediction", "")
    confidence = data.get("confidence", 0.0)
    secondary_findings = data.get("secondary_findings", [])

    # Build secondary findings context
    secondary_text = ""
    if secondary_findings:
        findings_list = ", ".join(
            f"{f['label']} ({f['probability']:.0%})" for f in secondary_findings
        )
        secondary_text = f"\nAdditional detected conditions: {findings_list}\n"

    prompt = f"""
You are an expert radiologist.

Generate a structured chest X-ray report using ONLY consistent findings.

Primary diagnosis: {prediction} (confidence: {confidence:.0%})
Key findings: {keywords}
{secondary_text}
{"Note: There is disagreement among retrieved evidence cases. Mention uncertainty where appropriate." if disagreement else ""}

Format:

FINDINGS:
...

IMPRESSION:
...

"""

    for r in reports:
        prompt += f"\n{r}\n"

    # Try each client (API key) and each model, with a hard wall-clock cap
    last_error = None
    start_time = time.monotonic()
    timed_out = False
    for client_idx, client in enumerate(clients):
        if timed_out:
            break
        for model_name in GEMINI_MODELS:
            if timed_out:
                break
            for attempt in range(MAX_RETRIES):
                if time.monotonic() - start_time >= MAX_TOTAL_SECONDS:
                    print(f"[ReportGen] Total timeout ({MAX_TOTAL_SECONDS}s) exceeded, falling back.")
                    timed_out = True
                    break
                try:
                    print(f"[ReportGen] Key {client_idx + 1}: Trying {model_name} (attempt {attempt + 1}/{MAX_RETRIES})...")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    print(f"[ReportGen] Success with Key {client_idx + 1} on {model_name}.")
                    return response.text
                except Exception as e:
                    last_error = e
                    error_str = str(e)
                    if "503" in error_str or "UNAVAILABLE" in error_str or "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                        wait = RETRY_DELAY * (2 ** attempt)
                        print(f"[ReportGen] Key {client_idx + 1} {model_name} overloaded/exhausted, retrying in {wait}s...")
                        time.sleep(wait)
                    else:
                        print(f"[ReportGen] Key {client_idx + 1} {model_name} failed: {error_str}")
                        break

    print(f"[ReportGen] All Gemini models and API keys failed. Returning fallback report. Last error: {last_error}")
    
    # Fallback template if APIs are down/exhausted
    fallback_report = f"FINDINGS:\nComputer-aided detection identified {prediction} as the primary finding with {confidence:.0%} confidence.\n"
    
    if secondary_findings:
        fallback_report += "Secondary findings include: " + ", ".join([f"{f['label']} ({f['probability']:.0%})" for f in secondary_findings]) + ".\n"
        
    if disagreement:
        fallback_report += "Note: Retrieved clinical evidence shows some disagreement with this prediction. Clinical correlation is highly recommended.\n"
        
    fallback_report += f"\nIMPRESSION:\n1. Suspected {prediction}.\n2. Note: This report was generated using a fallback template because the AI text generation service is currently unavailable due to rate limits."
    
    return fallback_report
