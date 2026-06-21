"""
Data Cleanup Script - Removes data older than 30 minutes from Firestore
Keeps: Patient records, System config
Deletes: Old alerts, Old vital streams
"""

import os
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, db

load_dotenv()

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

def cleanup_firestore_alerts():
    """Delete alerts older than 30 minutes from Firestore"""
    fs = firestore.client()
    thirty_min_ago = int((time.time() - 1800) * 1000)  # 30 minutes in milliseconds

    try:
        # Get all patients
        patients = fs.collection('patients').stream()
        deleted_count = 0

        for patient in patients:
            patient_id = patient.id
            alerts_ref = fs.collection('patients').document(patient_id).collection('alerts')

            # Query alerts older than 30 minutes using filter
            query = alerts_ref.where(filter=firestore.FieldFilter('triggeredAt', '<', thirty_min_ago))
            old_alerts = query.stream()

            for alert in old_alerts:
                alert.reference.delete()
                deleted_count += 1

        print(f"[CLEANUP] Deleted {deleted_count} old Firestore alerts")
        return deleted_count
    except Exception as e:
        print(f"[CLEANUP] Firestore cleanup: {e}")
        return 0

def cleanup_rtdb_vitals():
    """Delete vital streams older than 30 minutes from Realtime Database"""
    rtdb = db.reference()
    thirty_min_ago = int(time.time() * 1000) - 1800000  # 30 minutes in milliseconds

    try:
        vitals_ref = rtdb.child('vitals')
        vitals_snapshot = vitals_ref.get()
        vitals_data = vitals_snapshot.val()

        if not vitals_data:
            print("[CLEANUP] No vitals data found")
            return 0

        deleted_count = 0

        for patient_id, patient_vitals in vitals_data.items():
            if not isinstance(patient_vitals, dict) or 'stream' not in patient_vitals:
                continue

            stream_data = patient_vitals['stream']
            if not isinstance(stream_data, dict):
                continue

            # Delete vitals older than 30 minutes
            for timestamp_str in list(stream_data.keys()):
                try:
                    timestamp = int(timestamp_str)
                    if timestamp < thirty_min_ago:
                        rtdb.reference(f'vitals/{patient_id}/stream/{timestamp_str}').delete()
                        deleted_count += 1
                except (ValueError, TypeError):
                    continue

        print(f"[CLEANUP] Deleted {deleted_count} old RTDB vital streams")
        return deleted_count
    except Exception as e:
        print(f"[CLEANUP] RTDB cleanup: {e}")
        return 0

def cleanup_active_alerts():
    """Clear active alerts that are no longer relevant"""
    rtdb = db.reference()

    try:
        alerts_ref = rtdb.child('alerts')
        alerts_snapshot = alerts_ref.get()
        alerts_data = alerts_snapshot.val()

        if not alerts_data:
            print("[CLEANUP] No active alerts found")
            return 0

        deleted_count = 0
        for patient_id, alert_data in alerts_data.items():
            if not isinstance(alert_data, dict) or 'active' not in alert_data:
                continue

            active = alert_data['active']
            if not isinstance(active, dict):
                continue

            triggered_at = active.get('triggeredAt', 0)
            if triggered_at < int((time.time() - 1800) * 1000):
                rtdb.reference(f'alerts/{patient_id}/active').delete()
                deleted_count += 1

        print(f"[CLEANUP] Cleared {deleted_count} old active alerts")
        return deleted_count
    except Exception as e:
        print(f"[CLEANUP] Active alert cleanup: {e}")
        return 0

def run_cleanup():
    """Run complete cleanup"""
    print("\n" + "="*60)
    print("STARTING DATA CLEANUP")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Removing data older than 30 minutes")
    print("="*60 + "\n")

    init_firebase()

    total_deleted = 0
    total_deleted += cleanup_firestore_alerts()
    total_deleted += cleanup_rtdb_vitals()
    total_deleted += cleanup_active_alerts()

    print(f"\n[CLEANUP] Total items deleted: {total_deleted}")
    print("="*60 + "\n")

    return total_deleted

def schedule_cleanup(interval_minutes=60):
    """Run cleanup on a schedule"""
    print(f"[CLEANUP] Scheduler started. Running cleanup every {interval_minutes} minutes")

    while True:
        try:
            run_cleanup()
            print(f"[CLEANUP] Next cleanup in {interval_minutes} minutes")
            time.sleep(interval_minutes * 60)
        except KeyboardInterrupt:
            print("\n[CLEANUP] Scheduler stopped")
            break
        except Exception as e:
            print(f"[ERROR] Scheduler error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "schedule":
        # Run as scheduler
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        schedule_cleanup(interval)
    else:
        # Run once
        run_cleanup()
