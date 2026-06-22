import uuid
import time
from firebase_admin import db, firestore

rtdb = db
def get_fs():
    return firestore.client()

def write_alert(patient_id, vitals, violations, ai_result, should_notify=True):
    """
    Write alert to RTDB and Firestore.

    Args:
        should_notify: If True, frontend will show toast notification.
                       If False, silently update (during cooldown).
    """
    severity = "critical" if any(v["severity"] == "critical" for v in violations) else "warning"
    ts = int(time.time() * 1000)

    # Check if an alert already exists for this patient
    active_ref = rtdb.reference(f"alerts/{patient_id}/active")
    existing_alert = active_ref.get()

    if existing_alert and isinstance(existing_alert, dict):
        # Update existing alert instead of creating a new one
        alert_id = existing_alert.get("alertId")
        alert = existing_alert.copy()
        alert.update({
            "severity": severity,
            "message": violations[0]["message"],
            "updatedAt": ts,
            "vitalsAtTrigger": vitals,
            "aiExplanation": ai_result.get("explanation", ""),
            "recommendations": ai_result.get("recommendations", []),
            "shouldNotify": should_notify,  # Flag for frontend
        })
        status = "UPDATED (SILENT)" if not should_notify else "UPDATED"
        print(f"[ALERT] {status} {severity.upper()} for {patient_id}: {alert['message']}")
    else:
        # Create new alert
        alert_id = f"alert_{uuid.uuid4().hex[:8]}"
        alert = {
            "alertId": alert_id,
            "patientId": patient_id,
            "severity": severity,
            "message": violations[0]["message"],
            "triggeredAt": ts,
            "resolvedAt": None,
            "isResolved": False,
            "vitalsAtTrigger": vitals,
            "aiExplanation": ai_result.get("explanation", ""),
            "recommendations": ai_result.get("recommendations", []),
            "shouldNotify": should_notify,
        }
        print(f"[ALERT] NEW {severity.upper()} for {patient_id}: {alert['message']}")

    # Write to RTDB — immediately visible on dashboard
    rtdb.reference(f"alerts/{patient_id}/active").set(alert)

    # Write to Firestore — permanent history (only new alerts)
    if not existing_alert:
        fs = get_fs()
        fs.collection("patients").document(patient_id)\
          .collection("alerts").document(alert_id).set(alert)

    return alert

def resolve_alert(patient_id):
    """Called when vitals return to normal — clears RTDB active alert and marks Firestore entry resolved."""
    try:
        active_ref = rtdb.reference(f"alerts/{patient_id}/active")
        active_alert = active_ref.get()
        if active_alert and isinstance(active_alert, dict):
            alert_id = active_alert.get("alertId")
            if alert_id:
                ts = int(time.time() * 1000)
                fs = get_fs()
                fs.collection("patients").document(patient_id)\
                  .collection("alerts").document(alert_id).update({
                      "isResolved": True,
                      "resolvedAt": ts
                  })
    except Exception as e:
        print(f"[ERROR] Failed to mark alert as resolved in Firestore: {e}")
    finally:
        rtdb.reference(f"alerts/{patient_id}/active").delete()


