import AuthPhotoPanel from '../components/AuthPhotoPanel';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/ui';
import { AuthIllustration } from '../components/MedicalVisuals.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    dob: '',
    gender: 'FEMALE',
    role: 'PATIENT', professionalLicense: '', applicationNote: '', departmentId: '', specialization: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const departments = useApi(() => publicApi.departments(), []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const created = await register({
        ...form,
        departmentId: form.role === 'DOCTOR' && form.departmentId ? Number(form.departmentId) : null,
        dob: form.dob || null,
        phone: form.phone || null,
      });
      navigate('/login', { replace: true, state: { registered: true, pending: created.approvalStatus === 'PENDING' } });
    } catch (err) {
      setError(err.message || 'Unable to create your account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card auth__card--split">
        <AuthPhotoPanel signup />

        <div className="auth__form">
          <h1>Create your Meridian account</h1>
          <p className="muted">Choose your role. Your account opens the workspace appropriate to your responsibilities.</p>

          <form onSubmit={submit}>
            {error ? <div className="error-box" style={{ marginBottom: 16 }}>{error}</div> : null}
            <label className="field"><span>Account role</span><select value={form.role} onChange={update('role')}>
                <option value="PATIENT">Patient</option><option value="DOCTOR">Doctor</option><option value="ADMIN">Administrator</option><option value="RECEPTIONIST">Receptionist</option><option value="PHARMACIST">Pharmacist</option>
              </select></label>
            {form.role === 'ADMIN' && <p role="status">Administrator accounts can sign in immediately and approve staff applications from Staff & access.</p>}
            {!['PATIENT','ADMIN'].includes(form.role) && <div className="card" style={{marginBottom:16}}><p>Staff access requires administrator approval. Your professional details will be reviewed before you can sign in.</p>
              {(form.role === 'DOCTOR' || form.role === 'PHARMACIST') && <label className="field"><span>Professional registration number</span><input required maxLength={120} value={form.professionalLicense} onChange={update('professionalLicense')} /></label>}
              {form.role === 'DOCTOR' && <><label className="field"><span>Department</span><select required value={form.departmentId} onChange={update('departmentId')}><option value="">Choose a department</option>{(departments.data || []).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label className="field"><span>Specialization</span><input required maxLength={120} value={form.specialization} onChange={update('specialization')} /></label>{!departments.loading && !departments.data?.length && <p>The hospital must configure departments before doctors can apply. Contact administration.</p>}</>}
              <label className="field"><span>Application details</span><textarea maxLength={1000} value={form.applicationNote} onChange={update('applicationNote')} placeholder="Your qualifications, experience and hospital affiliation" /></label>
            </div>}
            <label className="field">
              <span>Full name</span>
              <input required value={form.name} onChange={update('name')} placeholder="John Doe" autoComplete="name" />
            </label>
            <div className="grid-2">
              <label className="field">
                <span>Email address</span>
                <input type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" />
              </label>
              <label className="field">
                <span>Mobile number</span>
                <input value={form.phone} onChange={update('phone')} placeholder="+94 77 000 0000" autoComplete="tel" />
              </label>
              <label className="field">
                <span>Date of birth</span>
                <input type="date" value={form.dob} onChange={update('dob')} max={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="field">
                <span>Gender</span>
                <select value={form.gender} onChange={update('gender')}>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={8}
                maxLength={72}
                value={form.password}
                onChange={update('password')}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input type="password" required autoComplete="new-password" value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" />
            </label>
            <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
              {busy ? <><span className="spinner" /> Creating account…</> : 'Create account'}
            </button>
          </form>

          <p className="auth__foot">Already registered? <Link to="/login">Sign in</Link></p>
          <p className="auth__foot" style={{ marginTop: 4 }}>
            <Link to="/" className="muted">← Back to the hospital site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
