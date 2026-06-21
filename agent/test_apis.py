import os
import requests
import json

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

print("=" * 60)
print("API CONNECTION TEST")
print("=" * 60)

# Check what keys are available
gemini_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
openai_key = os.getenv('OPENAI_API_KEY')

print(f"\n1. GEMINI API")
print(f"   Key available: {bool(gemini_key)}")
if gemini_key:
    print(f"   Key (first 20 chars): {gemini_key[:20]}...")

print(f"\n2. OPENAI API")
print(f"   Key available: {bool(openai_key)}")
if openai_key:
    print(f"   Key (first 20 chars): {openai_key[:20]}...")
    # Check for placeholder/test keys
    if openai_key.startswith("sk-proj-your"):
        print(f"   Status: [FAIL] PLACEHOLDER KEY (starts with 'sk-proj-your')")
    elif "lefGJu" in openai_key:
        print(f"   Status: [FAIL] TEST/DUMMY KEY (contains 'lefGJu')")
    else:
        print(f"   Status: [OK] Real key format")

print("\n" + "=" * 60)
print("TESTING CONNECTIONS")
print("=" * 60)

# Test Gemini
print("\n[TEST 1] Gemini API Connection")
if gemini_key:
    models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]
    success = False

    for model in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{
                    "parts": [{"text": "Say 'Gemini works' in one sentence."}]
                }]
            }
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            print(f"   Trying {model}... Status: {response.status_code}")

            if response.status_code == 200:
                print(f"[OK] GEMINI API WORKING (using {model})")
                result = response.json()
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                print(f"Response: {text[:100]}")
                success = True
                break
        except Exception as e:
            pass

    if not success:
        print(f"[FAIL] GEMINI API - No working model found")
        print(f"(Tried: {', '.join(models_to_try)})")
else:
    print("[WARN] No Gemini API key found")

# Test OpenAI
print("\n[TEST 2] OpenAI API Connection")
if openai_key and not openai_key.startswith("sk-proj-your") and "lefGJu" not in openai_key:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'OpenAI works' in one sentence."}],
            temperature=0.3
        )
        print("[OK] OPENAI API WORKING")
        print(f"Response: {response.choices[0].message.content[:100]}")
    except Exception as e:
        print(f"[FAIL] OPENAI API ERROR: {str(e)}")
else:
    if openai_key and "lefGJu" in openai_key:
        print("[WARN] OpenAI key is a TEST/DUMMY key (contains 'lefGJu'), skipping test")
    elif openai_key and openai_key.startswith("sk-proj-your"):
        print("[WARN] OpenAI key is a PLACEHOLDER, skipping test")
    else:
        print("[WARN] No valid OpenAI API key found")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("\nTo fix Gemini: Add GEMINI_API_KEY or GOOGLE_API_KEY to .env")
print("To fix OpenAI: Replace the test key with a real sk-proj-* key")
print("=" * 60)
