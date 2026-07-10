from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import os
import joblib

from database import engine, get_db, Base
import models
from schemas import (
    OTPRequest, OTPVerify, PatientSignup, TokenResponse, PatientOut,
    PrescriptionOut, PrescriptionCreate, ProfileCompletionRequest,
    FamilyMemberCreate, FamilyMemberOut,
    PasswordLogin, ResetPasswordRequest,
    AbhaSendOtpRequest, AbhaConfirmOtpRequest,
)
import auth
import notifications
import aware_data
import abha

app = FastAPI(title="AMR-PVMS Patient Backend")

SERVICE_API_KEY = os.getenv("SERVICE_API_KEY", "dev-service-key-123")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "risk_model.joblib")
risk_model = None
if os.path.exists(MODEL_PATH):
    risk_model = joblib.load(MODEL_PATH)


@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
        print("DB tables created/verified")
    except Exception as e:
        print(f"Could not connect to DB on startup: {e}")
    if risk_model is None:
        print("WARNING: risk_model.joblib not found — run train_risk_model.py")
    else:
        print("AI risk model loaded")


def verify_service_key(x_api_key: str = Header(...)):
    if x_api_key != SERVICE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid service API key")


def get_me(payload: dict, db: Session) -> models.Patient:
    phone = payload.get("phone")
    patient = db.query(models.Patient).filter(models.Patient.phone == phone).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# =========================================================
# HEALTH / DB CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "patient-backend"}


@app.get("/db-check")
def db_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"db_status": "connected"}
    except Exception as e:
        return {"db_status": "error", "detail": str(e)}


# =========================================================
# AUTH (password-based)
# =========================================================

@app.post("/auth/send-otp")
def send_otp(payload: OTPRequest):
    otp = auth.generate_mock_otp(payload.phone)
    return {"message": "OTP sent (mock)", "otp_for_testing": otp}


@app.post("/auth/signup", response_model=PatientOut)
def signup(payload: PatientSignup, db: Session = Depends(get_db)):
    existing = db.query(models.Patient).filter(
        (models.Patient.abha_id == payload.abha_id) |
        (models.Patient.phone == payload.phone)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient with this ABHA or phone already exists")

    patient = models.Patient(
        abha_id=payload.abha_id,
        name=payload.name,
        phone=payload.phone,
        password_hash=auth.hash_password(payload.password),
        profile_completed=False,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: PasswordLogin, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.phone == payload.phone).first()
    if not patient or not patient.password_hash:
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    if not auth.verify_password(payload.password, patient.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone or password")

    token = auth.create_access_token({"sub": str(patient.id), "phone": patient.phone})
    return TokenResponse(access_token=token)


@app.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not auth.verify_mock_otp(payload.phone, payload.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    patient = db.query(models.Patient).filter(models.Patient.phone == payload.phone).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.password_hash = auth.hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset successful"}


# =========================================================
# ABHA VERIFICATION (mock seam — ready for real ABDM API)
# =========================================================

@app.post("/abha/send-otp")
def abha_send_otp(payload: AbhaSendOtpRequest):
    result = abha.verify_abha_send_otp(payload.abha_number)
    return result


@app.post("/abha/verify-otp")
def abha_verify_otp(payload: AbhaConfirmOtpRequest):
    result = abha.verify_abha_confirm_otp(payload.abha_number, payload.otp)
    if not result.get("verified"):
        raise HTTPException(status_code=401, detail="ABHA verification failed — invalid OTP")
    return result


# =========================================================
# PATIENT SELF-SERVICE (JWT protected)
# =========================================================

@app.get("/patient/me", response_model=PatientOut)
def get_my_profile(
    payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    return get_me(payload, db)


@app.post("/patient/me/complete-profile", response_model=PatientOut)
def complete_profile(
    payload: ProfileCompletionRequest,
    jwt_payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    patient = get_me(jwt_payload, db)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(patient, field, value)
    patient.profile_completed = True
    db.commit()
    db.refresh(patient)
    return patient


@app.get("/patient/me/prescriptions")
def get_my_prescriptions(
    payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    patient = get_me(payload, db)
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.patient_abha == patient.abha_id
    ).order_by(models.Prescription.created_at.desc()).all()
    return prescriptions


@app.get("/patient/me/prescriptions/detailed")
def get_my_prescriptions_detailed(
    payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    patient = get_me(payload, db)
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.patient_abha == patient.abha_id
    ).order_by(models.Prescription.created_at.desc()).all()

    result = []
    for p in prescriptions:
        not_recommended = aware_data.is_not_recommended(p.drug_name)
        aware = aware_data.get_aware_category(p.drug_name)
        conflict = aware_data.check_allergy_conflict(p.drug_name, patient.allergies or "")
        category_names = {0: "Access", 1: "Watch", 2: "Reserve"}
        result.append({
            "id": str(p.id),
            "drug_name": p.drug_name,
            "dosage": p.dosage,
            "duration_days": p.duration_days,
            "status": p.status,
            "doctor_name": p.doctor_name,
            "hospital_name": p.hospital_name,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "aware_category": "Not Recommended" if not_recommended else category_names.get(aware),
            "not_recommended": not_recommended,
            "allergy_conflict": conflict,
        })
    return result


@app.post("/patient/me/push-token")
def save_push_token(
    push_token: str,
    payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    patient = get_me(payload, db)
    patient.push_token = push_token
    db.commit()
    return {"message": "Push token saved"}


# =========================================================
# FAMILY MEMBERS (JWT protected)
# =========================================================

@app.post("/patient/me/family", response_model=FamilyMemberOut)
def add_family_member(
    payload: FamilyMemberCreate,
    jwt_payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    patient = get_me(jwt_payload, db)
    member = models.FamilyMember(
        owner_phone=patient.phone,
        relation=payload.relation,
        name=payload.name,
        id_type=payload.id_type,
        id_value=payload.id_value,
        age=payload.age,
        gender=payload.gender,
        blood_group=payload.blood_group,
        allergies=payload.allergies,
        conditions=payload.conditions,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@app.get("/patient/me/family")
def list_family_members(
    jwt_payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    patient = get_me(jwt_payload, db)
    members = db.query(models.FamilyMember).filter(
        models.FamilyMember.owner_phone == patient.phone
    ).order_by(models.FamilyMember.created_at.desc()).all()
    return members


@app.delete("/patient/me/family/{member_id}")
def delete_family_member(
    member_id: str,
    jwt_payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    patient = get_me(jwt_payload, db)
    member = db.query(models.FamilyMember).filter(
        models.FamilyMember.id == member_id,
        models.FamilyMember.owner_phone == patient.phone,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
    db.delete(member)
    db.commit()
    return {"message": "Family member removed"}


@app.get("/patient/me/family/{member_id}/prescriptions")
def family_member_prescriptions(
    member_id: str,
    jwt_payload: dict = Depends(auth.get_current_patient_payload),
    db: Session = Depends(get_db),
):
    patient = get_me(jwt_payload, db)
    member = db.query(models.FamilyMember).filter(
        models.FamilyMember.id == member_id,
        models.FamilyMember.owner_phone == patient.phone,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")

    if member.id_type != "ABHA":
        return []
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.patient_abha == member.id_value
    ).order_by(models.Prescription.created_at.desc()).all()
    return prescriptions


# =========================================================
# SERVICE-TO-SERVICE (API key — Vasuki's hospital backend)
# =========================================================

@app.get("/patient/{abha}/summary", dependencies=[Depends(verify_service_key)])
def patient_summary(abha_param: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.abha_id == abha_param).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "abha_id": patient.abha_id,
        "name": patient.name,
        "allergies": patient.allergies,
        "conditions": patient.conditions,
        "active_prescriptions": [],
    }


@app.post("/prescription/issue", dependencies=[Depends(verify_service_key)])
def issue_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(
        models.Patient.abha_id == payload.patient_abha
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    prescription = models.Prescription(
        patient_abha=payload.patient_abha,
        doctor_name=payload.doctor_name or "Unknown Doctor",
        hospital_name=payload.hospital_name or "Unknown Hospital",
        drug_name=payload.drug_name,
        dosage=payload.dosage,
        duration_days=payload.duration_days,
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)

    notifications.send_push_notification(
        patient.push_token,
        title="New Prescription",
        body=f"{prescription.drug_name} prescribed by {prescription.doctor_name}",
    )

    return {
        "message": "Prescription issued and notification sent",
        "prescription_id": str(prescription.id),
    }


@app.get("/prescription/{prescription_id}/verify", dependencies=[Depends(verify_service_key)])
def verify_prescription(prescription_id: str, db: Session = Depends(get_db)):
    prescription = db.query(models.Prescription).filter(
        models.Prescription.id == prescription_id
    ).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    patient = db.query(models.Patient).filter(
        models.Patient.abha_id == prescription.patient_abha
    ).first()

    return {
        "prescription_id": str(prescription.id),
        "patient_name": patient.name if patient else "Unknown",
        "patient_abha": prescription.patient_abha,
        "drug_name": prescription.drug_name,
        "dosage": prescription.dosage,
        "duration_days": prescription.duration_days,
        "doctor_name": prescription.doctor_name,
        "hospital_name": prescription.hospital_name,
        "issued_date": prescription.created_at.isoformat() if prescription.created_at else None,
        "status": prescription.status,
        "already_dispensed": prescription.status == "dispensed",
    }


@app.post("/prescription/{prescription_id}/dispense", dependencies=[Depends(verify_service_key)])
def dispense_prescription(prescription_id: str, db: Session = Depends(get_db)):
    prescription = db.query(models.Prescription).filter(
        models.Prescription.id == prescription_id
    ).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if prescription.status == "dispensed":
        raise HTTPException(status_code=400, detail="This prescription has already been dispensed")

    prescription.status = "dispensed"
    db.commit()

    return {
        "message": "Prescription marked as dispensed",
        "prescription_id": str(prescription.id),
        "drug_name": prescription.drug_name,
    }


# =========================================================
# AI RISK SCORING (WHO AWaRe based)
# =========================================================

class RiskCheckRequest(BaseModel):
    drug_name: str
    duration_days: int
    diagnosis_match: int = 1      # 0 or 1
    patient_allergies: str = ""


@app.post("/risk/score", dependencies=[Depends(verify_service_key)])
def score_risk(payload: RiskCheckRequest):
    if risk_model is None:
        raise HTTPException(status_code=503, detail="Risk model not loaded — run train_risk_model.py first")

    # WHO "Not Recommended" check comes FIRST
    if aware_data.is_not_recommended(payload.drug_name):
        return {
            "drug_name": payload.drug_name,
            "aware_category": "Not Recommended",
            "blocked": True,
            "risk_flag": True,
            "risk_score": 1.0,
            "explanation": [
                "WHO AWaRe: NOT RECOMMENDED fixed-dose combination",
                "This combination lacks evidence of efficacy and has poor dosing rationale",
                "Carries additive toxicity risk and accelerates antimicrobial resistance",
                "Incompatible with antimicrobial stewardship — prescribe single agents instead",
            ],
        }

    aware_category = aware_data.get_aware_category(payload.drug_name)
    allergy_conflict = aware_data.check_allergy_conflict(payload.drug_name, payload.patient_allergies)
    allergy_flag = 1 if allergy_conflict else 0

    if aware_category is None:
        return {
            "drug_name": payload.drug_name,
            "aware_category": None,
            "blocked": False,
            "risk_flag": bool(allergy_conflict),
            "risk_score": 1.0 if allergy_conflict else 0.0,
            "explanation": (
                ["ALLERGY CONFLICT — drug conflicts with patient's recorded allergies"]
                if allergy_conflict else
                ["Not classified as an antibiotic — no AMR risk scoring applied"]
            ),
        }

    features = [[aware_category, payload.duration_days, allergy_flag, payload.diagnosis_match]]
    prediction = int(risk_model.predict(features)[0])
    probability = float(risk_model.predict_proba(features)[0][1])

    category_names = {0: "Access", 1: "Watch", 2: "Reserve"}
    reasons = [f"WHO AWaRe category: {category_names[aware_category]}"]
    if aware_category == 2:
        reasons.append("Reserve antibiotic — last-resort drug, justify use in clinical notes")
    elif aware_category == 1:
        reasons.append("Watch antibiotic — higher resistance potential, use only when indicated")
    if allergy_conflict:
        reasons.append("ALLERGY CONFLICT — drug conflicts with patient's recorded allergies")
    if payload.duration_days > 10:
        reasons.append(f"Long course ({payload.duration_days} days) increases resistance risk")
    if payload.diagnosis_match == 0:
        reasons.append("Drug does not clearly match the recorded diagnosis")
    if len(reasons) == 1:
        reasons.append("No major additional risk factors detected")

    return {
        "drug_name": payload.drug_name,
        "aware_category": category_names[aware_category],
        "blocked": False,
        "risk_flag": bool(prediction),
        "risk_score": round(probability, 2),
        "explanation": reasons,
    }
    
@app.get("/patient/{abha_param}/active-prescriptions", dependencies=[Depends(verify_service_key)])
def get_active_prescriptions_for_pharmacy(abha_param: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.abha_id == abha_param).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    active = db.query(models.Prescription).filter(
        models.Prescription.patient_abha == abha_param,
        models.Prescription.status != "dispensed",
    ).order_by(models.Prescription.created_at.desc()).all()

    return {
        "patient_name": patient.name,
        "patient_abha": patient.abha_id,
        "active_prescriptions": [
            {
                "id": str(p.id),
                "drug_name": p.drug_name,
                "dosage": p.dosage,
                "duration_days": p.duration_days,
                "doctor_name": p.doctor_name,
                "hospital_name": p.hospital_name,
                "issued_date": p.created_at.isoformat() if p.created_at else None,
                "status": p.status,
            }
            for p in active
        ],
    }