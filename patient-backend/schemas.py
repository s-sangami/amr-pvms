from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class OTPRequest(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    otp: str


class PatientSignup(BaseModel):
    abha_id: str
    name: str
    phone: str
    password: str

class PasswordLogin(BaseModel):
    phone: str
    password: str


class ResetPasswordRequest(BaseModel):
    phone: str
    otp: str
    new_password: str
    


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PatientOut(BaseModel):
    id: UUID
    abha_id: str
    name: str
    phone: str
    profile_completed: bool
    age: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None
    pregnancy_status: Optional[str] = None
    past_surgeries: Optional[str] = None
    current_medications: Optional[str] = None
    traditional_medicine: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileCompletionRequest(BaseModel):
    age: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None
    pregnancy_status: Optional[str] = None
    past_surgeries: Optional[str] = None
    current_medications: Optional[str] = None
    traditional_medicine: Optional[str] = None


class PrescriptionOut(BaseModel):
    id: UUID
    drug_name: str
    dosage: Optional[str]
    duration_days: Optional[str]
    status: str
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PrescriptionCreate(BaseModel):
    patient_abha: str
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    drug_name: str
    dosage: Optional[str] = None
    duration_days: Optional[str] = None
    visit_id: Optional[str] = None   # NEW


class FamilyMemberCreate(BaseModel):
    relation: str
    name: str
    id_type: str          # "ABHA" / "Phone" / "Aadhaar"
    id_value: str
    age: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None


class FamilyMemberOut(BaseModel):
    id: UUID
    relation: str
    name: str
    id_type: str
    id_value: str
    age: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
    
class AbhaSendOtpRequest(BaseModel):
    abha_number: str


class AbhaConfirmOtpRequest(BaseModel):
    abha_number: str
    otp: str