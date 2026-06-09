from openai import OpenAI
import os
import json

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

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

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"GPT-4 error: {e}")
        return {
            "explanation": "AI analysis unavailable.",
            "recommendations": ["Check patient immediately"]
        }

