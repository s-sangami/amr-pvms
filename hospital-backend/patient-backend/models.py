from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.types import TypeDecorator, CHAR
import uuid
from datetime import datetime
from database import Base


class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID
            return dialect.type_descriptor(UUID())
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(value) if not isinstance(value, uuid.UUID) else value


class Patient(Base):
    __tablename__ = "patients"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    abha_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    push_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile_completed = Column(Boolean, default=False)
    age = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    address = Column(String, nullable=True)
    height = Column(String, nullable=True)
    weight = Column(String, nullable=True)
    allergies = Column(String, nullable=True)
    conditions = Column(String, nullable=True)
    pregnancy_status = Column(String, nullable=True)
    past_surgeries = Column(String, nullable=True)
    current_medications = Column(String, nullable=True)
    traditional_medicine = Column(String, nullable=True)
    consent_given = Column(Boolean, default=False)
    consent_date = Column(DateTime, nullable=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    patient_abha = Column(String, index=True, nullable=False)
    doctor_name = Column(String, nullable=True)
    hospital_name = Column(String, nullable=True)
    drug_name = Column(String, nullable=False)
    dosage = Column(String, nullable=True)
    duration_days = Column(String, nullable=True)
    status = Column(String, default="issued")
    created_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    dispensed_at = Column(DateTime, nullable=True)
    visit_id = Column(String, nullable=True, index=True)


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    owner_phone = Column(String, index=True, nullable=False)  # which patient added them
    relation = Column(String, nullable=False)                 # e.g. Mother, Son
    name = Column(String, nullable=False)
    id_type = Column(String, nullable=False)                  # ABHA / Phone / Aadhaar
    id_value = Column(String, nullable=False)
    age = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    allergies = Column(String, nullable=True)
    conditions = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)