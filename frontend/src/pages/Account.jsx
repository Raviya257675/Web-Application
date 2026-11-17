import { useState } from 'react';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { PageHead } from '../components/ui';

export default function Account() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [passwords, setPasswords] = useState({currentPassword:'',newPassword:'',confirm:''});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event, changePassword) {
    event.preventDefault(); setMessage(''); setError('');
    if(changePassword && passwords.newPassword !== passwords.confirm) {setError('Passwords do not match.'); return;}
    setBusy(true);
    try {
      if(changePassword) {await authApi.changePassword(passwords); setPasswords({currentPassword:'',newPassword:'',confirm:''});}
      else {const {data}=await authApi.updateProfile({name,phone}); updateUser(data);}
      setMessage(changePassword ? 'Password updated. Use your new password the next time you sign in.' : 'Profile updated.');
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  return <div className="page"><PageHead eyebrow="Your account" title="Profile & password" description={`${user.email} · ${user.role.toLowerCase()}`} />
    {error && <div className="error-box" role="alert">{error}</div>}{message && <p role="status">{message}</p>}
    <div className="grid-2"><form className="card" onSubmit={e=>submit(e,false)}><h2>Contact details</h2>
      <label className="field"><span>Full name</span><input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} /></label>
      <label className="field"><span>Phone</span><input value={phone} onChange={e=>setPhone(e.target.value)} /></label>
      <button disabled={busy} className="btn btn--primary">Save profile</button></form>
      <form className="card" onSubmit={e=>submit(e,true)}><h2>Change password</h2>
      {['currentPassword','newPassword','confirm'].map((key,i)=><label className="field" key={key}><span>{['Current password','New password','Confirm new password'][i]}</span><input type="password" required minLength={i ? 8 : 1} maxLength={72} autoComplete={i?'new-password':'current-password'} value={passwords[key]} onChange={e=>setPasswords({...passwords,[key]:e.target.value})} /></label>)}
      <button disabled={busy} className="btn btn--primary">Update password</button></form></div></div>;
}
