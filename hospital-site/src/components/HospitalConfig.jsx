import { useState, useEffect } from 'react';
import axios from 'axios';
import { decodeToken } from '../utils/jwt';
import { API } from '../config';
import './Shared.css';

function HospitalConfig() {
  const [doctors, setDoctors] = useState([]);
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [pendingPharmacies, setPendingPharmacies] = useState([]);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyErr, setVerifyErr] = useState('');

  const token = sessionStorage.getItem('token');
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const user = decodeToken();
  const hospitalId = user?.facilityId;
  const adminUsername = user?.username;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const fetchDoctors = async () => {
    try {
      const r = await axios.get(`${API}/staff/doctors/${hospitalId}`, auth);
      setDoctors(r.data);
    } catch (e) { console.error(e); }
  };

  const fetchPendingFacilities = async () => {
    try {
      const hRes = await axios.get(`${API}/hospital/list`);
      setPendingHospitals(hRes.data.filter(h => h.verificationStatus === 'PENDING'));
    } catch (e) { console.error(e); }
    try {
      const pRes = await axios.get(`${API}/pharmacy-facility/list`);
      setPendingPharmacies(pRes.data.filter(p => p.verificationStatus === 'PENDING'));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPendingFacilities();
    } else {
      fetchDoctors();
    }
  }, []);

  const verifyHospital = async (id) => {
    setVerifyMsg(''); setVerifyErr('');
    try {
      await axios.post(`${API}/hospital/${id}/verify?adminUsername=${encodeURIComponent(adminUsername)}`, {}, auth);
      setVerifyMsg('Hospital verified.');
      fetchPendingFacilities();
    } catch (e) {
      setVerifyErr(e.response?.data || 'Failed to verify hospital.');
    }
  };

  const rejectHospital = async (id) => {
    if (!window.confirm('Reject this hospital? This should only be done if the registration details are invalid.')) return;
    setVerifyMsg(''); setVerifyErr('');
    try {
      await axios.post(`${API}/hospital/${id}/reject?adminUsername=${encodeURIComponent(adminUsername)}`, {}, auth);
      setVerifyMsg('Hospital rejected.');
      fetchPendingFacilities();
    } catch (e) {
      setVerifyErr(e.response?.data || 'Failed to reject hospital.');
    }
  };

  const verifyPharmacy = async (id) => {
    setVerifyMsg(''); setVerifyErr('');
    try {
      await axios.post(`${API}/pharmacy-facility/${id}/verify?adminUsername=${encodeURIComponent(adminUsername)}`, {}, auth);
      setVerifyMsg('Pharmacy verified.');
      fetchPendingFacilities();
    } catch (e) {
      setVerifyErr(e.response?.data || 'Failed to verify pharmacy.');
    }
  };

  const rejectPharmacy = async (id) => {
    if (!window.confirm('Reject this pharmacy? This should only be done if the registration details are invalid.')) return;
    setVerifyMsg(''); setVerifyErr('');
    try {
      await axios.post(`${API}/pharmacy-facility/${id}/reject?adminUsername=${encodeURIComponent(adminUsername)}`, {}, auth);
      setVerifyMsg('Pharmacy rejected.');
      fetchPendingFacilities();
    } catch (e) {
      setVerifyErr(e.response?.data || 'Failed to reject pharmacy.');
    }
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '1.75rem',
    marginBottom: '1.5rem',
    backdropFilter: 'blur(8px)',
  };

  const sectionTitleStyle = {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#F1F5F9',
    marginBottom: '0.35rem',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const btnPrimary = {
    padding: '0.5rem 1.1rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: '#1D9E75',
    color: '#fff',
  };

  const btnDanger = {
    ...btnPrimary,
    background: 'rgba(163,45,45,0.9)',
  };

  return (
    <div className="page" style={{ minHeight: '100vh', padding: '2.5rem', background: 'linear-gradient(180deg, #0B1220 0%, #0F1B2E 100%)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
            {isSuperAdmin ? 'Platform Administration' : 'Hospital Configuration'}
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: 4 }}>
            {isSuperAdmin ? 'Super Admin · Platform oversight' : `${user?.facilityName || 'Hospital'} · Admin oversight`}
          </p>
        </div>

        {(verifyMsg || verifyErr) && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1.25rem',
            fontSize: '0.85rem', fontWeight: 500,
            background: verifyErr ? 'rgba(163,45,45,0.15)' : 'rgba(29,158,117,0.15)',
            color: verifyErr ? '#F87171' : '#4ADE80',
            border: `1px solid ${verifyErr ? 'rgba(163,45,45,0.3)' : 'rgba(29,158,117,0.3)'}`,
          }}>
            {verifyErr ? String(verifyErr) : verifyMsg}
          </div>
        )}

        {/* Pending facility verification — Super Admin only */}
        {isSuperAdmin && (
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
              Pending Facility Verification
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 0, marginBottom: '1.25rem' }}>
              Check each registration number against real state/government records before verifying.
            </p>

            {pendingHospitals.length === 0 && pendingPharmacies.length === 0 ? (
              <div style={{
                padding: '2rem', textAlign: 'center', color: '#475569',
                background: 'rgba(255,255,255,0.02)', borderRadius: 10,
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>✓</div>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>No facilities awaiting verification</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingHospitals.map(h => (
                  <div key={`h-${h.id}`} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '1rem 1.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ color: '#F1F5F9', fontSize: '0.95rem' }}>{h.name}</strong>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0.5,
                          color: '#93C5FD', background: 'rgba(59,130,246,0.15)',
                          padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                        }}>Hospital</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>
                        Reg #: {h.registrationNumber || '—'} {h.gstin ? `· GSTIN: ${h.gstin}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={btnPrimary} onClick={() => verifyHospital(h.id)}>Verify</button>
                      <button style={btnDanger} onClick={() => rejectHospital(h.id)}>Reject</button>
                    </div>
                  </div>
                ))}

                {pendingPharmacies.map(p => (
                  <div key={`p-${p.id}`} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '1rem 1.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ color: '#F1F5F9', fontSize: '0.95rem' }}>{p.name}</strong>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0.5,
                          color: '#FDBA74', background: 'rgba(249,115,22,0.15)',
                          padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                        }}>Pharmacy</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>
                        Drug License #: {p.drugLicenseNumber || '—'} {p.gstin ? `· GSTIN: ${p.gstin}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={btnPrimary} onClick={() => verifyPharmacy(p.id)}>Verify</button>
                      <button style={btnDanger} onClick={() => rejectPharmacy(p.id)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Doctor availability — regular hospital admins only */}
        {!isSuperAdmin && (
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />
              Doctor Availability
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 0, marginBottom: '1.25rem' }}>
              Doctors manage their own leave — this is a read-only view.
            </p>

            {doctors.length === 0 ? (
              <div style={{
                padding: '2rem', textAlign: 'center', color: '#475569',
                background: 'rgba(255,255,255,0.02)', borderRadius: 10,
              }}>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>No doctors found for this hospital</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {doctors.map(doc => (
                  <div key={doc.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.85rem 1.1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                  }}>
                    <div>
                      <strong style={{ color: '#F1F5F9', fontSize: '0.9rem' }}>{doc.fullName}</strong>
                      {!doc.available && (
                        <div style={{ fontSize: '0.75rem', color: '#F87171', marginTop: 2 }}>
                          On leave until {doc.leaveUntil} {doc.reason ? `· ${doc.reason}` : ''}
                          {doc.substituteName ? ` — Substitute: Dr. ${doc.substituteName}` : ''}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                      color: doc.available ? '#4ADE80' : '#F87171',
                      background: doc.available ? 'rgba(29,158,117,0.15)' : 'rgba(163,45,45,0.15)',
                    }}>
                      {doc.available ? '● Available' : '● On leave'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HospitalConfig;