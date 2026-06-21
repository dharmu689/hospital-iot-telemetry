import time
import os
import warnings
from dotenv import load_dotenv

# Suppress Firestore deprecation warnings
warnings.filterwarnings("ignore", category=UserWarning, module="google.cloud.firestore_v1")

# Load env BEFORE importing modules that depend on it
load_dotenv()

import firebase_admin
from firebase_admin import credentials, db, firestore
from anomaly_detector import check_vitals
from ai_explainer import get_ai_explanation
from alert_manager import write_alert, resolve_alert
import requests

def init_firebase():
    try:
        firebase_admin.get_app()
    except ValueError:
        config_path = 'firebase_config.json'
        cred = credentials.Certificate(config_path)
        db_url = os.getenv('FIREBASE_DB_URL')
        firebase_admin.initialize_app(cred, {
            "databaseURL": db_url
        })

init_firebase()

in_alert_state = set()

def get_patient_info(patient_id):
    fs = firestore.client()
    doc = fs.collection("patients").document(patient_id).get()
    return doc.to_dict() if doc.exists else {"name": patient_id}

def process_patient(patient_id, vitals):
    violations = check_vitals(vitals)

    if not violations:
        if patient_id in in_alert_state:
            resolve_alert(patient_id)
            in_alert_state.discard(patient_id)
            print(f"[RESOLVED] {patient_id} vitals normal")
        return

    # Vitals are in violation — create or update alert
    if patient_id not in in_alert_state:
        patient_info = get_patient_info(patient_id)
        print(f"[AI] Analyzing {patient_id}...")
        ai_result = get_ai_explanation(patient_info, vitals, violations)
        write_alert(patient_id, vitals, violations, ai_result)
        in_alert_state.add(patient_id)
    else:
        # Alert already active, just update with new vitals/analysis
        patient_info = get_patient_info(patient_id)
        ai_result = get_ai_explanation(patient_info, vitals, violations)
        write_alert(patient_id, vitals, violations, ai_result)

def run():
    print("AI Agent started. Monitoring RTDB...")
    def on_vitals_change(event):
        path = event.path
        if not event.data or "/latest" not in path: return
        patient_id = path.split("/")[1]
        process_patient(patient_id, event.data)

    db.reference("vitals").listen(on_vitals_change)
    while True: time.sleep(60)

if __name__ == "__main__":
    run()
