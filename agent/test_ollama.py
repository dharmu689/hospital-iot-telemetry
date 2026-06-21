import os
import json
import requests
from dotenv import load_dotenv
from ai_explainer import get_ai_explanation

load_dotenv()

print("=" * 70)
print("TESTING OLLAMA LLM INTEGRATION")
print("=" * 70)

ollama_url = os.getenv('OLLAMA_API_URL', 'https://ai-ollama.tac-cgcu.xyz')
print(f"\nOllama Server: {ollama_url}")

# Test 1: Check if Ollama server is accessible
print("\n[TEST 1] Checking Ollama server connectivity...")
try:
    response = requests.get(f"{ollama_url}/api/tags", timeout=10)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        models = response.json()
        print("[OK] Server is accessible")
        print("Available models:")
        for model in models.get('models', []):
            print(f"  - {model.get('name')}")
    else:
        print(f"[WARN] Unexpected status code: {response.status_code}")
except Exception as e:
    print(f"[FAIL] Cannot reach server: {e}")

# Test 2: Test with sample patient data
print("\n[TEST 2] Testing clinical explanation generation...")

sample_patient = {
    "name": "John Doe",
    "age": 65,
    "ward": "ICU-A"
}

sample_vitals = {
    "heart_rate": 125,
    "bp_systolic": 160,
    "bp_diastolic": 95,
    "spo2": 92,
    "temperature": 101.5,
    "respiratory_rate": 24
}

sample_violations = [
    {"vital": "Heart Rate", "value": 125, "severity": "warning", "message": "Heart rate is elevated at 125 bpm (normal: 60-100)"},
    {"vital": "SpO2", "value": 92, "severity": "warning", "message": "Oxygen saturation is low at 92% (normal: >95%)"},
    {"vital": "Temperature", "value": 101.5, "severity": "warning", "message": "Temperature elevated at 101.5F"}
]

print(f"Patient: {sample_patient['name']}, Age: {sample_patient['age']}")
print(f"Violations: {len(sample_violations)}")

result = get_ai_explanation(sample_patient, sample_vitals, sample_violations)

print("\n[RESULT] Generated Explanation:")
print(f"Explanation: {result.get('explanation')[:150]}...")
print(f"Recommendations: {result.get('recommendations')}")

print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)
