import { useState, useEffect } from 'react';
import axios from 'axios';
import './Shared.css';

const API = 'http://localhost:8080';

function HospitalConfig() {
  const [doctors, setDoctors] = useState([]);
  const token = sessionStorage.getItem('token');
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const hospitalId = 1;

  const fetchDoctors = async () => {
    try {
      const r = await axios.get(`${API}/staff/doctors/${hospitalId}`, auth);
      setDoctors(r.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchDoctors(); }, []);

  return (
    <div className="page" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="page-header">
        <div>
          <h1>Hospital Configuration</h1>
          <p>Kaveri Hospital · Admin oversight</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Doctor availability</h3>
        <p style={{ fontSize: '0.8rem', color: '#9db3b8', marginTop: '-0.5rem' }}>
          Doctors manage their own leave — this is a read-only view.
        </p>
        {doctors.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#9db3b8' }}>No doctors found for this hospital.</p>
        ) : doctors.map(doc => (
          <div key={doc.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.6rem 0', borderBottom: '1px solid #eee',
          }}>
            <div>
              <strong>{doc.fullName}</strong>
              {!doc.available && (
                <div style={{ fontSize: '0.75rem', color: '#A32D2D' }}>
                  On leave until {doc.leaveUntil} {doc.reason ? `· ${doc.reason}` : ''}
                  {doc.substituteName ? ` — Substitute: Dr. ${doc.substituteName}` : ''}
                </div>
              )}
            </div>
            <span style={{
              fontSize: '0.75rem', fontWeight: 600,
              color: doc.available ? '#1D9E75' : '#A32D2D',
            }}>
              {doc.available ? '● Available' : '● On leave'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HospitalConfig;