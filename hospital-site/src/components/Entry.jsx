import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const typeLabels = {
  private: 'Private Hospital',
  government: 'Government Hospital',
  pharmacy: 'Retail Pharmacy',
  clinic: 'Retail Clinic',
};

const typeIcons = {
  private: 'ti ti-building-hospital',
  government: 'ti ti-building-bank',
  pharmacy: 'ti ti-prescription',
  clinic: 'ti ti-stethoscope',
};

const typeDescriptions = {
  private: 'Sign in to manage your hospital\'s doctors, reception, and pharmacy operations.',
  government: 'Access your government facility\'s staff portal for patient care and prescriptions.',
  pharmacy: 'Sign in to manage your pharmacy\'s inventory and fulfill prescriptions.',
  clinic: 'Access your clinic\'s consultation and prescription tools.',
};

const pathwaySteps = ['Reception', 'Doctor', 'Pharmacy', 'Patient'];

// Hospital-type facilities use /hospital/*, pharmacy/clinic use /pharmacy-facility/*
const isHospitalType = (type) => type === 'private' || type === 'government';

function Entry() {
  const { facilityType } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const hospitalType = isHospitalType(facilityType);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [facilityName, setFacilityName] = useState('');
  const [facilityMsg, setFacilityMsg] = useState('');
  const [facilityErr, setFacilityErr] = useState('');

  const [facilities, setFacilities] = useState([]);
  const [staffForm, setStaffForm] = useState({
    username: '', password: '', fullName: '', role: hospitalType ? 'DOCTOR' : 'PHARMACY', facilityId: '',
  });
  const [staffMsg, setStaffMsg] = useState('');
  const [staffErr, setStaffErr] = useState('');

  // HPR verification state (doctors only)
  const [hprId, setHprId] = useState('');
  const [hprVerifying, setHprVerifying] = useState(false);
  const [hprVerified, setHprVerified] = useState(false);
  const [hprInfo, setHprInfo] = useState(null);
  const [hprErr, setHprErr] = useState('');

  const loadFacilities = async () => {
    if (hospitalType) {
      const res = await axios.get('http://localhost:8080/hospital/list');
      setFacilities(res.data.filter(h => h.type === facilityType));
    } else {
      const res = await axios.get('http://localhost:8080/pharmacy-facility/list');
      setFacilities(res.data.filter(f => f.type === facilityType));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8080/auth/login', { username, password });
      const { token, role, fullName } = res.data;
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('role', role);
      sessionStorage.setItem('fullName', fullName);

      if (role === 'DOCTOR') navigate('/doctor');
      else if (role === 'ADMIN') navigate('/config');
      else if (role === 'RECEPTION') navigate('/reception');
      else if (role === 'PHARMACY') navigate('/pharmacy');
      else navigate('/');
    } catch {
      setLoginError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFacility = async (e) => {
    e.preventDefault();
    setFacilityErr('');
    setFacilityMsg('');
    try {
      const url = hospitalType
        ? 'http://localhost:8080/hospital/register'
        : 'http://localhost:8080/pharmacy-facility/register';

      await axios.post(url, {
        name: facilityName,
        type: facilityType,
      });
      setFacilityMsg('Facility registered! You can now add staff under it.');
      setFacilityName('');
    } catch (err) {
      setFacilityErr(err.response?.data || 'Registration failed.');
    }
  };

  const verifyHpr = async () => {
    setHprErr(''); setHprInfo(null); setHprVerified(false); setHprVerifying(true);
    try {
      const r = await axios.get(`http://localhost:8080/abdm/verify-hpr/${encodeURIComponent(hprId)}`);
      if (r.data.verified) {
        setHprVerified(true);
        setHprInfo(r.data);
      } else {
        setHprErr(r.data.error || 'HPR verification failed.');
      }
    } catch {
      setHprErr('HPR verification service unavailable.');
    } finally {
      setHprVerifying(false);
    }
  };

  const handleRoleChange = (newRole) => {
    setStaffForm({ ...staffForm, role: newRole });
    // Reset HPR state when switching away from/into DOCTOR
    setHprId(''); setHprVerified(false); setHprInfo(null); setHprErr('');
  };

  const handleRegisterStaff = async (e) => {
    e.preventDefault();
    setStaffErr('');
    setStaffMsg('');

    if (staffForm.role === 'DOCTOR' && !hprVerified) {
      setStaffErr('Please verify the doctor\'s HPR ID before creating the account.');
      return;
    }

    try {
      const payload = {
        username: staffForm.username,
        password: staffForm.password,
        fullName: staffForm.fullName,
        role: staffForm.role,
        hospitalId: hospitalType ? staffForm.facilityId : null,
        pharmacyFacilityId: hospitalType ? null : staffForm.facilityId,
        hprId: staffForm.role === 'DOCTOR' ? hprId : null,
        hprVerified: staffForm.role === 'DOCTOR' ? hprVerified : null,
      };
      await axios.post('http://localhost:8080/auth/register', payload);
      setStaffMsg('Staff account created! You can now sign in.');
      setStaffForm({ username: '', password: '', fullName: '', role: hospitalType ? 'DOCTOR' : 'PHARMACY', facilityId: '' });
      setHprId(''); setHprVerified(false); setHprInfo(null);
    } catch (err) {
      setStaffErr(err.response?.data || 'Registration failed.');
    }
  };

  return (
    <div className="login-container">
      <div className={`login-shell entry-shell theme-${facilityType}`}>
        <div className="welcome-panel">
          <div className="page-brand" style={{ opacity: 0.85 }}>MedTrace</div>
          <div className="welcome-badge"><i className={typeIcons[facilityType] || 'ti ti-building-hospital'}></i></div>
          <h2>{typeLabels[facilityType] || 'Facility'}</h2>
          <p>{typeDescriptions[facilityType] || 'Sign in to your account, register a new facility, or add staff to an existing one.'}</p>

          <div className="welcome-pathway">
            {pathwaySteps.map((step, i, arr) => (
              <div className="welcome-pathway-step" key={step}>
                <div className="welcome-pathway-dot">{i + 1}</div>
                <span>{step}</span>
                {i < arr.length - 1 && <div className="welcome-pathway-line" />}
              </div>
            ))}
          </div>

          <button
            className="back-btn"
            style={{ marginTop: '1.5rem' }}
            onClick={() => navigate(hospitalType ? '/category/hospital' : '/')}
          >
            ← Back
          </button>
        </div>

        <div className="form-panel">
          <div className="entry-tabs">
            <button
              className={`entry-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >Sign In</button>
            <button
              className={`entry-tab ${mode === 'registerFacility' ? 'active' : ''}`}
              onClick={() => setMode('registerFacility')}
            >New Facility</button>
            <button
              className={`entry-tab ${mode === 'registerStaff' ? 'active' : ''}`}
              onClick={() => { setMode('registerStaff'); loadFacilities(); }}
            >Add Staff</button>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="entry-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input className="plain" placeholder="Username" value={username}
                onChange={(e) => setUsername(e.target.value)} required />
              <input className="plain" type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              {loginError && <p className="error">{loginError}</p>}
              <button className="btn" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'registerFacility' && (
            <form onSubmit={handleRegisterFacility} className="entry-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input className="plain" placeholder={`Facility name, e.g. ${hospitalType ? 'Kaveri' : 'Thulasi'}`} value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)} required />
              {facilityErr && <p className="error">{String(facilityErr)}</p>}
              {facilityMsg && <p style={{ color: '#0e7c86', fontSize: '0.85rem' }}>{facilityMsg}</p>}
              <button className="btn" type="submit">Register Facility</button>
            </form>
          )}

          {mode === 'registerStaff' && (
            <form onSubmit={handleRegisterStaff} className="entry-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select className="plain" value={staffForm.facilityId}
                onChange={(e) => setStaffForm({ ...staffForm, facilityId: e.target.value })} required>
                <option value="">Select facility</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input className="plain" placeholder="Full name" value={staffForm.fullName}
                onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })} required />
              <input className="plain" placeholder="Username" value={staffForm.username}
                onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} required />
              <input className="plain" type="password" placeholder="Password" value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required />
              <select className="plain" value={staffForm.role}
                onChange={(e) => handleRoleChange(e.target.value)}>
                {hospitalType ? (
                  <>
                    <option value="DOCTOR">Doctor</option>
                    <option value="ADMIN">Admin</option>
                    <option value="RECEPTION">Reception</option>
                  </>
                ) : (
                  <>
                    <option value="PHARMACY">Pharmacy Staff</option>
                    <option value="ADMIN">Admin</option>
                  </>
                )}
              </select>

              {staffForm.role === 'DOCTOR' && (
                <div style={{
                  border: '1px solid #E4E7EB',
                  borderRadius: 8,
                  padding: '0.75rem',
                  background: '#F6F8F9',
                }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#5B6B79', display: 'block', marginBottom: '0.4rem' }}>
                    HPR ID (Healthcare Professional Registry)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="plain"
                      style={{ flex: 1 }}
                      placeholder="e.g. TN-1234-56789012"
                      value={hprId}
                      onChange={(e) => { setHprId(e.target.value); setHprVerified(false); setHprInfo(null); }}
                      disabled={hprVerified}
                    />
                    <button
                      type="button"
                      className="btn"
                      style={{ whiteSpace: 'nowrap', opacity: hprVerified ? 0.6 : 1 }}
                      onClick={verifyHpr}
                      disabled={!hprId || hprVerifying || hprVerified}
                    >
                      {hprVerified ? '✓ Verified' : hprVerifying ? 'Verifying...' : 'Verify HPR'}
                    </button>
                  </div>

                  {hprErr && <p className="error" style={{ marginTop: '0.5rem' }}>{String(hprErr)}</p>}
                  {hprInfo && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#0e7c86' }}>
                      ✓ {hprInfo.name} — {hprInfo.registrationCouncil}
                      <div style={{ fontSize: '0.68rem', color: '#9db3b8', marginTop: '0.15rem' }}>{hprInfo.source}</div>
                    </div>
                  )}
                </div>
              )}

              {staffErr && <p className="error">{String(staffErr)}</p>}
              {staffMsg && <p style={{ color: '#0e7c86', fontSize: '0.85rem' }}>{staffMsg}</p>}
              <button className="btn" type="submit" disabled={staffForm.role === 'DOCTOR' && !hprVerified}>
                Create Staff Account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Entry;