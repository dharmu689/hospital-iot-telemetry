import os
import json
import requests

def get_fallback_explanation(patient_info, vitals, violations):
    """
    Generates high-quality, clinically realistic explanations and recommendations
    based on the specific vital sign violations. This acts as a robust fallback
    when LLM API keys are missing, expired, or rate-limited.
    """
    if not violations:
        return {
            "explanation": "No clinical anomalies detected. Vital signs are within normal parameters.",
            "recommendations": [
                "Continue standard routine telemetry monitoring.",
                "Ensure patient environment is comfortable.",
                "Document current baseline vitals in patient records."
            ]
        }

    explanations = []
    recommendations = []
    patient_name = patient_info.get('name', 'Patient')

    for v in violations:
        vital = v.get('vital', '')
        val = v.get('value')
        severity = v.get('severity', 'warning').upper()

        if "heart rate" in vital.lower() or "hr" in vital.lower():
            if val is not None and val > 100:
                explanations.append(
                    f"Patient is experiencing tachycardia (Heart Rate of {val} bpm), indicating possible cardiac distress, compensatory response to fever, systemic infection, pain, or anxiety."
                )
                recommendations.extend([
                    "Obtain a 12-lead ECG immediately to assess cardiac rhythm.",
                    "Evaluate patient for fever, dehydration, or pain; treat underlying causes.",
                    "Keep patient at rest and monitor blood pressure/perfusion status closely."
                ])
            elif val is not None and val < 60:
                explanations.append(
                    f"Patient is experiencing bradycardia (Heart Rate of {val} bpm), raising concerns for decreased cardiac output, conduction block, or drug-induced rate suppression."
                )
                recommendations.extend([
                    "Assess patient's level of consciousness and check for symptomatic hypotension.",
                    "Review medication log for beta-blockers, calcium channel blockers, or digoxins.",
                    "Ensure emergency bedside pacing equipment is accessible."
                ])

        elif "spo2" in vital.lower() or "oxygen" in vital.lower():
            if val is not None and val < 95:
                explanations.append(
                    f"Patient is showing oxygen desaturation (SpO2 of {val}%), signaling potential hypoxemia, ventilation-perfusion mismatch, or acute respiratory compromise."
                )
                recommendations.extend([
                    "Initiate supplemental oxygen therapy (2-4 L/min via nasal cannula) to target SpO2 >= 94%.",
                    "Elevate head of bed to semi-Fowler's position to optimize lung expansion.",
                    "Verify pulse oximeter probe placement and assess peripheral perfusion/capillary refill."
                ])

        elif "systolic" in vital.lower() or "bp" in vital.lower() or "blood pressure" in vital.lower():
            if val is not None and val > 130:
                explanations.append(
                    f"Patient has severe hypertension (Systolic BP of {val} mmHg), which increases myocardial workload and raises risks of acute cardiovascular/cerebrovascular events."
                )
                recommendations.extend([
                    "Re-measure blood pressure manually to confirm accuracy of automated reading.",
                    "Review administration records for missed or scheduled antihypertensive medications.",
                    "Assess patient for acute headache, chest pain, dyspnea, or visual disturbances."
                ])
            elif val is not None and val < 90:
                explanations.append(
                    f"Patient has hypotension (Systolic BP of {val} mmHg), indicating risk of hypoperfusion, hypovolemia, cardiogenic shock, or systemic sepsis."
                )
                recommendations.extend([
                    "Place patient in a supine position with legs elevated if not clinically contraindicated.",
                    "Assess fluid volume status and prepare for IV fluid bolus as ordered by the physician.",
                    "Monitor mental status, skin temperature, and urine output for early signs of shock."
                ])

        elif "temperature" in vital.lower() or "temp" in vital.lower():
            if val is not None and val > 99.5:
                explanations.append(
                    f"Patient is febrile (Temperature of {val}°F), indicating a systemic inflammatory or infectious response."
                )
                recommendations.extend([
                    "Administer ordered antipyretics (e.g., acetaminophen) and monitor temp trend.",
                    "Collect blood, urine, or sputum cultures if ordered to investigate infectious source.",
                    "Encourage oral hydration or ensure adequate IV fluids."
                ])
            elif val is not None and val < 97.0:
                explanations.append(
                    f"Patient is hypothermic (Temperature of {val}°F), putting them at risk for cardiac arrhythmias and metabolic dysregulation."
                )
                recommendations.extend([
                    "Apply passive warming blankets and ensure patient environment is warm and dry.",
                    "Monitor core temperature closely to prevent rapid temperature spikes.",
                    "Assess for signs of shivering or peripheral vasoconstriction."
                ])

        elif "respiratory rate" in vital.lower() or "rr" in vital.lower():
            if val is not None and val > 20:
                explanations.append(
                    f"Patient has tachypnea (Respiratory Rate of {val} breaths/min), a key early sign of respiratory distress, hypoxia, or metabolic acidosis."
                )
                recommendations.extend([
                    "Assess breathing effort, work of breathing, and auscultate bilateral lung sounds.",
                    "Verify SpO2 levels and correlate with arterial blood gas (ABG) findings.",
                    "Guide patient through calm, paced breathing techniques to reduce anxiety."
                ])
            elif val is not None and val < 12:
                explanations.append(
                    f"Patient has bradypnea (Respiratory Rate of {val} breaths/min), which may indicate respiratory center depression, narcotic overdose, or muscle fatigue."
                )
                recommendations.extend([
                    "Check responsiveness, pupil size, and neurological status immediately.",
                    "Review recent administration of opioid analgesics or sedative medications.",
                    "Prepare emergency airway equipment (BVM, intubation kit) and reversal agents (e.g., naloxone)."
                ])

    if not explanations:
        explanations.append(f"Patient vital signs show {severity} violations: " + ", ".join([v['message'] for v in violations]))

    if not recommendations:
        recommendations.extend([
            "Perform immediate clinical assessment of the patient.",
            "Verify all IoT sensor connections and check calibration.",
            "Alert the charge nurse or attending physician if vitals do not normalize."
        ])

    # De-duplicate recommendations and ensure we have at least 3
    seen = set()
    unique_recs = []
    for r in recommendations:
        if r not in seen:
            seen.add(r)
            unique_recs.append(r)

    while len(unique_recs) < 3:
        unique_recs.append("Monitor patient vitals closely and check sensor placement.")

    return {
        "explanation": " ".join(explanations),
        "recommendations": unique_recs[:3]
    }

def get_ai_explanation(patient_info, vitals, violations):
    violations_text = "\n".join([f"- {v['message']}" for v in violations])
    severity = "CRITICAL" if any(v["severity"] == "critical" for v in violations) else "WARNING"

    prompt = f"""You are a clinical decision support AI. A patient has a {severity} alert.

Patient Information:
- Name: {patient_info.get('name', 'Unknown')}
- Age: {patient_info.get('age', 'Unknown')}
- Ward: {patient_info.get('ward', 'Unknown')}

Current Vital Signs: {vitals}

Alert Violations:
{violations_text}

Provide:
1. A brief clinical explanation
2. Three specific recommendations

Respond in this exact JSON format:
{{
  "explanation": "...",
  "recommendations": ["...", "...", "..."]
}}"""

    # 1. Try Gemini API if key is present
    gemini_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if gemini_key:
        try:
            print("[AI] Attempting Gemini API...")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()
            res_json = response.json()
            text_content = res_json["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text_content)
        except Exception as e:
            print(f"[AI] Gemini API error: {e}")

    # 2. Try OpenAI API if key is present
    openai_key = os.getenv('OPENAI_API_KEY')
    if openai_key and not openai_key.startswith("sk-proj-your") and "lefGJu" not in openai_key:
        try:
            print("[AI] Attempting OpenAI API...")
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"[AI] OpenAI API error: {e}")

    # 3. Fallback to rich, clinical rule-based generation
    print("[AI] API unavailable or failed. Using Clinical Rule-Based Fallback Generator.")
    return get_fallback_explanation(patient_info, vitals, violations)
