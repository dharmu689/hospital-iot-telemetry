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
        patient_states[patient_id] = {
            'is_abnormal': False, 
            'abnormal_vital': None, 
            'trend_direction': 1, 
            'ticks_in_abnormal': 0,
            'is_forced': False,
            'forced_end_time': 0
        }

    state = patient_states[patient_id]
    now = time.time()

    # Check for manual emergency override from Dashboard
    if patient_data.get('force_emergency') is True:
        state['is_abnormal'] = True
        state['is_forced'] = True
        state['forced_end_time'] = now + 30 # Exactly 30 seconds
        state['ticks_in_abnormal'] = 0

        # Determine which vital to crash
        req_vital = patient_data.get('emergency_vital', 'random')
        if req_vital == 'random':
            state['abnormal_vital'] = random.choice(['heartRate', 'spo2', 'systolic', 'respiratoryRate', 'temperature'])
        else:
            state['abnormal_vital'] = req_vital
            
        # For SpO2, emergencies are always drops. For others, random spike or drop.
        if state['abnormal_vital'] == 'spo2':
            state['trend_direction'] = -1
        else:
            state['trend_direction'] = 1 if random.random() > 0.5 else -1
        
        print(f"🚨 FORCED EMERGENCY TRIGGERED for {patient_id} ({state['abnormal_vital']}) - Ends in 30s")
        
        # Reset the flag in Firestore so it doesn't trigger on every loop
        fs.collection('patients').document(patient_id).update({'force_emergency': False})

    # Check if a forced emergency has expired
    if state['is_forced'] and now >= state['forced_end_time']:
        print(f"✅ FORCED EMERGENCY ENDED for {patient_id}. Reverting to normal.")
        state['is_forced'] = False
        state['is_abnormal'] = False
        state['ticks_in_abnormal'] = 0

    # Natural State transitions (only if not currently forced)
    if not state['is_forced']:
        if not state['is_abnormal']:
            # 1% chance to become abnormal naturally
            if random.random() < 0.01:
                state['is_abnormal'] = True
                state['abnormal_vital'] = random.choice(['heartRate', 'spo2', 'systolic', 'respiratoryRate', 'temperature'])
                state['trend_direction'] = -1 if state['abnormal_vital'] == 'spo2' else (1 if random.random() > 0.5 else -1)
                state['ticks_in_abnormal'] = 0
        else:
            state['ticks_in_abnormal'] += 1
            # Natural recovery chance
            if random.random() < 0.05 or state['ticks_in_abnormal'] > 30:
                state['is_abnormal'] = False

    # Initialize fresh vitals if missing
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

    # Apply Random Walk with Mean Reversion
    for k in v:
        if k == 'timestamp': continue
        
        # If the patient is recovering from a forced emergency, pull them back to baseline MUCH faster (20% per tick instead of 5%)
        reversion_strength = 0.2 if not state['is_abnormal'] else 0.05

        if k == 'temperature':
            v[k] += random.uniform(-0.1, 0.1)
            v[k] += (BASELINES[k] - v[k]) * reversion_strength
            v[k] = round(v[k], 1)
        else:
            v[k] += random.randint(-2, 2)
            v[k] += (BASELINES[k] - v[k]) * reversion_strength
            v[k] = int(v[k])

    # Apply Abnormal/Emergency Trends
    if state['is_abnormal']:
        target = state['abnormal_vital']
        
        # AGGRESSIVE SPIKE FORCED BY USER (e.g., +20 HR per 5 seconds)
        # NATURAL SPIKE (e.g., +2 HR per 5 seconds)
        multiplier = 10 if state['is_forced'] else 1
        
        if target == 'temperature':
            v[target] += random.uniform(0.2, 0.5) * state['trend_direction'] * multiplier
            v[target] = round(v[target], 1)
        else:
            # Massive jump ensures we cross the threshold into CRITICAL instantly
            v[target] += random.randint(4, 8) * state['trend_direction'] * multiplier

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
    print('Starting Simulator with AGGRESSIVE Emergency Overrides...')
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
