import { useState, useEffect } from 'react';
import axios from 'axios';
import TopBar from './TopBar';
import { decodeToken } from '../utils/jwt';

const API = 'http://localhost:8080';

function ReceptionPortal() {
  const [abha, setAbha] = useState('');
  const [verified, setVerified] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [queue, setQueue] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const token = sessionStorage.getItem('token');
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const user = decodeToken();
  const firstName = (user?.username || '').split('.')[0];
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'there';
  const hospitalId = user?.facilityId;

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  const fetchQueue = async () => {
    try {
      const r = await axios.get(`${API}/reception/queue/${hospitalId}`, auth);
      setQueue(r.data);
    } catch { setQueue([]); }
  };

  const fetchDoctors = async () => {
    try {
      const r = await axios.get(`${API}/staff/doctors/${hospitalId}`, auth);
      setDoctors(r.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchQueue();
    fetchDoctors();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchQueue(), fetchDoctors()]);
    setTimeout(() => setRefreshing(false), 400);
  };
const drName = (fullName) => {
  if (!fullName) return 'Dr. Unknown';
  const stripped = fullName.replace(/^dr\.?\s*/i, '');
  return `Dr. ${stripped}`;
};

  const verify = async () => {
    setErr(''); setMsg(''); setVerified(null); setLoading(true);
    try {
      const r = await axios.get(`${API}/abdm/verify/${encodeURIComponent(abha)}`);
      if (r.data.verified) setVerified(r.data);
      else setErr(r.data.error || 'ABHA verification failed.');
    } catch { setErr('Verification service unavailable.'); }
    finally { setLoading(false); }
  };

  const selectedDoctorInfo = doctors.find(d => String(d.id) === selectedDoctor);
  const effectiveDoctorId = selectedDoctorInfo && !selectedDoctorInfo.available && selectedDoctorInfo.substituteId
    ? selectedDoctorInfo.substituteId
    : (selectedDoctor ? parseInt(selectedDoctor, 10) : null);

  const checkIn = async () => {
    setErr(''); setMsg('');
    if (!selectedDoctor) {
      setErr('Please select which doctor the patient is seeing.');
      return;
    }
    try {
      await axios.post(`${API}/reception/checkin`, {
        abha,
        hospitalId,
        doctorId: effectiveDoctorId,
      }, auth);
      setMsg(`${verified.name} checked in successfully.`);
      setAbha(''); setVerified(null); setSelectedDoctor('');
      fetchQueue();
    } catch (e) { setErr(e.response?.data || 'Check-in failed.'); }
  };

const doctorNameFor = (doctorId) => {
  const d = doctors.find(x => x.id === doctorId);
  return d ? drName(d.fullName) : 'Unassigned';
};

  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const waiting = queue.filter(v => v.status === 'WAITING');

  return (
    <div>
      <TopBar />
      <div className="mt-page">
        <div className="mt-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-navy)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Welcome, {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{dateStr}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--c-amber-dark)' }}>
              {timeStr}
            </div>
            <button
              className="mt-btn mt-btn-outline"
              style={{ fontSize: 10, padding: '4px 10px', marginTop: 4 }}
              onClick={refresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Left: Check-in form */}
          <div>
            <div className="mt-card">
              <div className="mt-card-title">Patient check-in</div>
              <label className="mt-label">ABHA Number</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input className="mt-input" style={{ flex: 1 }} placeholder="Enter ABHA number"
                  value={abha} onChange={(e) => { setAbha(e.target.value); setVerified(null); }} />
                <button className="mt-btn" onClick={verify} disabled={!abha || loading}>
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>

              {err && <div className="alert-box alert-red">{String(err)}</div>}
              {msg && <div className="alert-box alert-green">{msg}</div>}

              {verified && (
                <div className="alert-box alert-blue" style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>✓ ABHA verified</div>
                  <div style={{ fontSize: 11 }}>Name: {verified.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>{verified.source}</div>

                  <label className="mt-label">Which doctor does the patient want to see?</label>
                  <select
                    className="mt-select"
                    style={{ marginBottom: 8 }}
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                  >
                    <option value="">Select doctor...</option>
{doctors.map(d => (
  <option key={d.id} value={d.id}>
    {drName(d.fullName)}{d.specialization ? ` — ${d.specialization}` : ''}{!d.available ? ' (On leave)' : ''}
  </option>
))}
                  </select>

                  {selectedDoctorInfo && !selectedDoctorInfo.available && (
                    <div className="alert-box alert-orange" style={{ marginBottom: 8 }}>
                     ⚠ {drName(selectedDoctorInfo.fullName)} is on leave until {selectedDoctorInfo.leaveUntil}.
                     {selectedDoctorInfo.substituteName ? (
                       <> Patient will be seen by <strong>{drName(selectedDoctorInfo.substituteName)}</strong> instead.</>
                      ) : (
                        <> No substitute assigned — please check with admin.</>
                      )}
                    </div>
                  )}

                  <button className="mt-btn mt-btn-green" style={{ width: '100%' }} onClick={checkIn}
                    disabled={selectedDoctorInfo && !selectedDoctorInfo.available && !selectedDoctorInfo.substituteId}>
                    Check In Patient
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Doctor availability panel */}
          <div>
            <div className="mt-card">
              <div className="mt-card-title">👨‍⚕️ Doctor availability</div>
              {doctors.length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No doctors found.</p>
              ) : doctors.map(d => (
                <div key={d.id} className="prow">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{drName(d.fullName)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {d.specialization || 'General'}
                       {!d.available && d.substituteName && ` · Substitute: ${drName(d.substituteName)}`}                    </div>
                  </div>
                  <span className={`badge ${d.available ? 'badge-green' : 'badge-red'}`}>
                    {d.available ? 'Available' : 'On leave'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Patient queue list */}
        <div className="mt-card">
          <div className="mt-card-title">🧑‍🤝‍🧑 Patients checked in today ({queue.length})</div>
          {queue.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No patients checked in yet.</p>
          ) : queue.map(v => (
            <div key={v.id} className="prow">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{v.patientAbha}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Seeing Dr. {doctorNameFor(v.doctorId)} · Checked in {v.checkedInAt ? new Date(v.checkedInAt).toLocaleTimeString() : ''}
                </div>
              </div>
              <span className={`badge ${v.status === 'WAITING' ? 'badge-gray' : 'badge-green'}`}>{v.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReceptionPortal;