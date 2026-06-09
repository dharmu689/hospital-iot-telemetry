import json
import random
import time
import os
from datetime import datetime
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, db, firestore
from dotenv import load_dotenv

load_dotenv()

def init_firebase():
    try:
        firebase_admin.get_app()
    except ValueError:
        config_path = Path('firebase_config.json')
        if not config_path.exists():
            return None, None
        cred = credentials.Certificate(str(config_path))
        db_url = os.getenv('FIREBASE_DB_URL')
        firebase_admin.initialize_app(cred, {'databaseURL': db_url})
    return db, firestore.client()

def load_thresholds():
    try:
        with open('data/thresholds.json', 'r') as f:
            return json.load(f)
    except:
        return {}

last_vitals = {}
patient_states = {}

# Healthy baselines
BASELINES = {
    'heartRate': 75,
    'spo2': 98,
    'systolic': 120,
    'diastolic': 80,
    'temperature': 98.6,
    'respiratoryRate': 16
}

def generate_vitals(patient_id, patient_data, thresholds, fs):
    global last_vitals, patient_states

    if patient_id not in patient_states:
        patient_states[patient_id] = {'is_abnormal': False, 'abnormal_vital': None, 'trend_direction': 1, 'ticks_in_abnormal': 0}

    state = patient_states[patient_id]

    # Check for manual emergency override from Dashboard
    if patient_data.get('force_emergency') is True:
        state['is_abnormal'] = True
        
        # Determine which vital to crash
        req_vital = patient_data.get('emergency_vital', 'random')
        if req_vital == 'random':
            state['abnormal_vital'] = random.choice(['heartRate', 'spo2', 'systolic', 'respiratoryRate', 'temperature'])
        else:
            state['abnormal_vital'] = req_vital
            
        # Determine direction based on severity and vital type
        # For SpO2, emergencies are always drops. For others, it can be spikes or drops.
        if state['abnormal_vital'] == 'spo2':
            state['trend_direction'] = -1
        else:
            state['trend_direction'] = 1 if random.random() > 0.5 else -1

        state['ticks_in_abnormal'] = 0
        
        print(f"🚨 FORCED EMERGENCY TRIGGERED for {patient_id} ({state['abnormal_vital']})")
        
        # Reset the flag in Firestore so it doesn't trigger on every loop infinitely
        fs.collection('patients').document(patient_id).update({'force_emergency': False})

    # Natural State transitions
    elif not state['is_abnormal']:
        # 1% chance to become abnormal per tick naturally
        if random.random() < 0.01:
            state['is_abnormal'] = True
            state['abnormal_vital'] = random.choice(['heartRate', 'spo2', 'systolic', 'respiratoryRate', 'temperature'])
            state['trend_direction'] = 1 if random.random() > 0.5 else -1
            if state['abnormal_vital'] == 'spo2':
                state['trend_direction'] = -1 # SpO2 usually drops
            state['ticks_in_abnormal'] = 0
    else:
        state['ticks_in_abnormal'] += 1
        # 5% chance to recover per tick naturally, or force recover after 30 ticks (2.5 mins)
        if random.random() < 0.05 or state['ticks_in_abnormal'] > 30:
            state['is_abnormal'] = False

    if patient_id not in last_vitals:
        last_vitals[patient_id] = {
            'heartRate': random.randint(70, 85),
            'spo2': random.randint(96, 100),
            'systolic': random.randint(115, 125),
            'diastolic': random.randint(75, 85),
            'temperature': round(random.uniform(98.0, 99.0), 1),
            'respiratoryRate': random.randint(14, 18)
        }
        return last_vitals[patient_id].copy()

    v = last_vitals[patient_id].copy()

    # Normal Random walk with baseline reversion (tendency to return to normal)
    for k in v:
        if k == 'timestamp':
            continue
        if k == 'temperature':
            v[k] += random.uniform(-0.1, 0.1)
            # Revert to mean by 5% each tick
            v[k] += (BASELINES[k] - v[k]) * 0.05
            v[k] = round(v[k], 1)
        else:
            v[k] += random.randint(-2, 2)
            # Revert to mean by 5% each tick
            v[k] += (BASELINES[k] - v[k]) * 0.05
            v[k] = int(v[k])

    # Apply abnormal trends if currently in emergency
    if state['is_abnormal']:
        target = state['abnormal_vital']
        
        # If it was a forced emergency, we want to spike the vitals much faster
        # so it hits the warning/critical threshold immediately for demo purposes
        multiplier = 4 if patient_data.get('force_emergency') is True else 1
        
        if target == 'temperature':
            v[target] += random.uniform(0.2, 0.6) * state['trend_direction'] * multiplier
            v[target] = round(v[target], 1)
        else:
            v[target] += random.randint(2, 6) * state['trend_direction'] * multiplier

    # ABSOLUTE Hard limits (impossible to go below/above human survival bounds)
    v['heartRate'] = max(30, min(v['heartRate'], 220))
    v['spo2'] = max(50, min(v['spo2'], 100))
    v['systolic'] = max(60, min(v['systolic'], 250))
    v['diastolic'] = max(40, min(v['diastolic'], 150))
    v['temperature'] = max(90.0, min(v['temperature'], 108.0))
    v['respiratoryRate'] = max(5, min(v['respiratoryRate'], 50))

    last_vitals[patient_id] = v
    return v

def main():
    print('Starting Simulator with Realistic Telemetry Bounds & Emergency Override...')
    rtdb, fs = init_firebase()
    if not rtdb: return
    thresholds = load_thresholds()
    
    while True:
        try:
            patients_ref = fs.collection('patients').where('isSimulated', '==', True).stream()
            for p in patients_ref:
                patient_data = p.to_dict()
                vitals = generate_vitals(p.id, patient_data, thresholds, fs)
                ts = int(time.time() * 1000)
                vitals['timestamp'] = ts
                rtdb.reference(f'vitals/{p.id}/latest').set(vitals)
                rtdb.reference(f'vitals/{p.id}/stream/{ts}').set(vitals)
                print(f'Updated {p.id} - HR: {vitals["heartRate"]}, SpO2: {vitals["spo2"]}')
            time.sleep(5)
        except KeyboardInterrupt: break
        except Exception as e: print(f'Error: {e}'); time.sleep(5)

if __name__ == '__main__':
    main()
