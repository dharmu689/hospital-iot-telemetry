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

# Alert state tracking
in_alert_state = set()
last_alert_time = {}  # Maps patient_id -> timestamp of last alert notification
COOLDOWN_PERIOD = 60  # Seconds between alert notifications

def get_patient_info(patient_id):
    fs = firestore.client()
    doc = fs.collection("patients").document(patient_id).get()
    return doc.to_dict() if doc.exists else {"name": patient_id}

def process_patient(patient_id, vitals):
    global last_alert_time
    violations = check_vitals(vitals)
    current_time = time.time()

    if not violations:
        if patient_id in in_alert_state:
            resolve_alert(patient_id)
            in_alert_state.discard(patient_id)
            last_alert_time.pop(patient_id, None)  # Reset cooldown on manual resolution
            print(f"[RESOLVED] {patient_id} vitals normal")
        return

    # Vitals are in violation — check cooldown before alerting
    time_since_last_alert = current_time - last_alert_time.get(patient_id, 0)
    in_cooldown = time_since_last_alert < COOLDOWN_PERIOD and patient_id in in_alert_state

    if patient_id not in in_alert_state:
        # First alert for this patient
        patient_info = get_patient_info(patient_id)
        print(f"[AI] Analyzing {patient_id}...")
        ai_result = get_ai_explanation(patient_info, vitals, violations)
        write_alert(patient_id, vitals, violations, ai_result, should_notify=True)
        in_alert_state.add(patient_id)
        last_alert_time[patient_id] = current_time
        print(f"[COOLDOWN] {patient_id} alert notification SENT. Next notification in 60s.")
    elif in_cooldown:
        # Within 60-second cooldown — silently update database but don't notify
        patient_info = get_patient_info(patient_id)
        ai_result = get_ai_explanation(patient_info, vitals, violations)
        write_alert(patient_id, vitals, violations, ai_result, should_notify=False)
        remaining = int(COOLDOWN_PERIOD - time_since_last_alert)
        print(f"[COOLDOWN] {patient_id} silently updating ({remaining}s remaining). No notification.")
    else:
        # Outside cooldown period — send new alert notification
        patient_info = get_patient_info(patient_id)
        print(f"[AI] Analyzing {patient_id} (cooldown expired)...")
        ai_result = get_ai_explanation(patient_info, vitals, violations)
        write_alert(patient_id, vitals, violations, ai_result, should_notify=True)
        last_alert_time[patient_id] = current_time
        print(f"[COOLDOWN] {patient_id} alert re-notification SENT. Next notification in 60s.")

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
