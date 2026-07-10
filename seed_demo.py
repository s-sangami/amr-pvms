"""
Seed script for demo data.
Run once with the backend NOT running (so the DB isn't locked):
    python seed_demo.py

Creates a demo patient (Rajan Kumar, Penicillin allergy) with password login
and a couple of sample prescriptions.
"""

from database import SessionLocal, engine, Base
import models
import auth

Base.metadata.create_all(bind=engine)
db = SessionLocal()

DEMO_ABHA = "11112222333344"
DEMO_PHONE = "9000000001"
DEMO_PASSWORD = "demo1234"

# --- Create or refresh the demo patient ---
existing = db.query(models.Patient).filter(models.Patient.phone == DEMO_PHONE).first()
if existing:
    db.delete(existing)
    db.commit()
    print("Removed old demo patient")

# Also clear any old prescriptions for this ABHA
old_rx = db.query(models.Prescription).filter(
    models.Prescription.patient_abha == DEMO_ABHA
).all()
for r in old_rx:
    db.delete(r)
db.commit()

patient = models.Patient(
    abha_id=DEMO_ABHA,
    name="Rajan Kumar",
    phone=DEMO_PHONE,
    password_hash=auth.hash_password(DEMO_PASSWORD),
    profile_completed=True,
    age="52",
    gender="Male",
    blood_group="B+",
    address="12 Gandhi Road, Hosur, Tamil Nadu",
    height="170cm",
    weight="72kg",
    allergies="Penicillin",
    conditions="Type 2 Diabetes, Hypertension",
    pregnancy_status="",
    past_surgeries="Appendectomy (2015)",
    current_medications="Metformin, Amlodipine",
    traditional_medicine="No",
)
db.add(patient)
db.commit()
db.refresh(patient)
print(f"Created demo patient: {patient.name} (ABHA {patient.abha_id})")

# --- Sample prescriptions ---
sample_rx = [
    models.Prescription(
        patient_abha=DEMO_ABHA,
        doctor_name="Dr. Meera Krishnan",
        hospital_name="Kaveri Hospital",
        drug_name="Azithromycin",
        dosage="500mg",
        duration_days="5",
        status="issued",
    ),
    models.Prescription(
        patient_abha=DEMO_ABHA,
        doctor_name="Dr. Suresh Rao",
        hospital_name="Government Hospital, Hosur",
        drug_name="Doxycycline",
        dosage="100mg",
        duration_days="7",
        status="dispensed",
    ),
]
for rx in sample_rx:
    db.add(rx)
db.commit()
print(f"Added {len(sample_rx)} sample prescriptions")

db.close()
print("\nDemo seed complete!")
print(f"  Login phone:    {DEMO_PHONE}")
print(f"  Login password: {DEMO_PASSWORD}")
print(f"  ABHA (for Vasuki's prescriptions): {DEMO_ABHA}")