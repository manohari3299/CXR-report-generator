# =========================
# REPORT GENERATION (Gemini API)
# =========================
import time

# Models to try in order — fallback if the primary is overloaded
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
MAX_RETRIES = 2
RETRY_DELAY = 2
MAX_TOTAL_SECONDS = 30


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
    disease_details = {
        "Pneumonia": {
            "findings": "Patchy airspace opacities are noted, suggestive of an infectious consolidation process. The cardiac silhouette appears within normal limits. No large pleural effusion is identified. The mediastinal contour is unremarkable.",
            "impression": "Findings consistent with pneumonia. Recommend clinical correlation with laboratory findings and consideration of follow-up imaging to assess treatment response.",
        },
        "Effusion": {
            "findings": "There is blunting of the costophrenic angle(s) with a meniscus sign, suggestive of pleural fluid collection. The underlying lung parenchyma is partially obscured. The cardiac silhouette is borderline in size.",
            "impression": "Pleural effusion identified. Recommend clinical correlation to determine etiology. Consider lateral decubitus views or ultrasound for further characterization if clinically indicated.",
        },
        "Cardiomegaly": {
            "findings": "The cardiac silhouette is enlarged with a cardiothoracic ratio exceeding 0.5, consistent with cardiomegaly. The pulmonary vasculature may show mild redistribution. No focal consolidation or large pleural effusion is definitively identified.",
            "impression": "Cardiomegaly is present. Recommend echocardiographic correlation to evaluate cardiac function and structural abnormalities.",
        },
        "Atelectasis": {
            "findings": "Linear or band-like opacities are noted, suggestive of subsegmental or segmental atelectasis with associated volume loss. The remainder of the lungs appears clear. The cardiac silhouette is within normal limits.",
            "impression": "Findings consistent with atelectasis. This may be related to hypoventilation, post-procedural changes, or mucous plugging. Clinical correlation is recommended.",
        },
        "Pneumothorax": {
            "findings": "A thin visceral pleural line is noted with absence of lung markings peripherally, suggestive of pneumothorax. The degree of lung collapse should be assessed clinically. The mediastinal structures appear midline.",
            "impression": "Pneumothorax identified. Clinical assessment of patient symptoms and consideration of intervention based on the size and clinical stability is recommended.",
        },
        "Edema": {
            "findings": "There are bilateral interstitial and/or alveolar opacities with peribronchial cuffing and vascular cephalization, suggestive of pulmonary edema. The cardiac silhouette is enlarged. Small bilateral pleural effusions may be present.",
            "impression": "Findings consistent with pulmonary edema, likely cardiogenic in etiology given the associated cardiomegaly. Recommend clinical correlation with BNP levels and consideration of diuretic therapy.",
        },
        "No Finding": {
            "findings": "The lungs are clear bilaterally without focal consolidation, pleural effusion, or pneumothorax. The cardiac silhouette is within normal limits. The mediastinal contour is unremarkable. The osseous structures are intact.",
            "impression": "No acute cardiopulmonary abnormality identified. The chest radiograph appears within normal limits.",
        },
    }

    details = disease_details.get(prediction, {
        "findings": f"Computer-aided detection has identified features most consistent with {prediction}. The cardiac silhouette and mediastinal contours appear grossly unremarkable. No additional acute findings are definitively identified.",
        "impression": f"Suspected {prediction}. Clinical correlation is recommended for further evaluation.",
    })

    fallback_report = f"FINDINGS:\n{details['findings']}\n"
    fallback_report += f"\nComputer-aided detection confidence: {confidence:.0%}.\n"

    if secondary_findings:
        findings_list = ", ".join([f"{f['label']} ({f['probability']:.0%})" for f in secondary_findings])
        fallback_report += f"\nAdditional findings of note: {findings_list}. These secondary findings warrant clinical attention and may require further evaluation.\n"

    if disagreement:
        fallback_report += "\nOf note, retrieved clinical evidence from similar cases shows some variability in diagnosis. Clinical correlation is highly recommended to confirm the primary assessment.\n"

    fallback_report += f"\nIMPRESSION:\n1. {details['impression']} !"

    return fallback_report
