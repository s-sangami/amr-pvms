import pandas as pd
import numpy as np
from xgboost import XGBClassifier
import joblib

np.random.seed(42)
n = 2000

# Features grounded in real AMR risk logic
aware_category = np.random.choice([0, 1, 2], size=n, p=[0.5, 0.35, 0.15])
duration_days = np.random.randint(3, 21, size=n)
allergy_flag = np.random.choice([0, 1], size=n, p=[0.85, 0.15])
diagnosis_match = np.random.choice([0, 1], size=n, p=[0.25, 0.75])

# Realistic risk labelling based on antimicrobial stewardship principles:
# - Reserve drugs are inherently high-risk if used casually
# - Allergy conflicts are always high-risk
# - Long courses raise resistance risk
# - Prescribing without a matching diagnosis is inappropriate use
risk_score = (
    (aware_category * 0.35) +
    (allergy_flag * 0.45) +
    ((duration_days > 10).astype(int) * 0.25) +
    ((diagnosis_match == 0).astype(int) * 0.30)
)
risk_label = (risk_score >= 0.4).astype(int)

df = pd.DataFrame({
    "aware_category": aware_category,
    "duration_days": duration_days,
    "allergy_flag": allergy_flag,
    "diagnosis_match": diagnosis_match,
    "risk_label": risk_label,
})

X = df.drop("risk_label", axis=1)
y = df["risk_label"]

model = XGBClassifier(n_estimators=80, max_depth=4, eval_metric="logloss")
model.fit(X, y)

joblib.dump(model, "risk_model.joblib")
print("Model trained and saved as risk_model.joblib")
print(f"Training accuracy: {model.score(X, y):.2%}")
print(f"High-risk cases in training data: {y.mean():.1%}")