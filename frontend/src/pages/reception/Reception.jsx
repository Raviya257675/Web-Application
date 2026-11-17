import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/client';
import client from '../../api/client';
import { publicApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { Badge, Empty, ErrorState, Loader, Modal, PageHead, Stat } from '../../components/ui';
import { dateTime, money, todayIso } from '../../utils/format';

const titles = {today:'Front desk today',patients:'Patient registration',appointments:'Appointments & check-in',billing:'Payments & receipts',beds:'Available beds'};
const field = (label, input) => <label className="field"><span>{label}</span>{input}</label>;

export default function Reception({section='today'}) {
  const toast=useToast();
  const [search,setSearch]=useState('');
  const [day,setDay]=useState(todayIso());
  const [page,setPage]=useState(1);
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({});
  const [busy,setBusy]=useState(false);
  const [formError,setFormError]=useState('');
  const [patientSearch,setPatientSearch]=useState('');
  const [queueDoctor,setQueueDoctor]=useState('');
  useEffect(()=>{setSearch('');setPage(1);setModal(null);},[section]);
  const isAppointments=section==='today'||section==='appointments';
  const patients=useApi(()=>http.get('/reception/patients',{search:section==='patients'?search:patientSearch}),[search,patientSearch,section],{enabled:section==='patients'||modal?.kind==='book'});
  const appointments=useApi(()=>http.get('/reception/appointments',{date:day||undefined,search,page}),[day,search,page,section],{enabled:isAppointments});
  const invoices=useApi(()=>http.get('/reception/billing',{search,page}),[search,page,section],{enabled:section==='billing'});
  const beds=useApi(()=>http.get('/reception/beds'),[section],{enabled:section==='beds'});
  const doctors=useApi(()=>publicApi.doctors(),[]);
  const slots=useApi(()=>publicApi.availability(form.doctorId,form.date),[form.doctorId,form.date,modal?.kind],{enabled:!!form.doctorId&&!!form.date&&(modal?.kind==='book'||modal?.kind==='reschedule')});
  const data=isAppointments?appointments:section==='patients'?patients:section==='billing'?invoices:beds;
  const update=key=>event=>setForm({...form,[key]:event.target.value});
  const refresh=()=>{data.refetch();};
  function open(kind, row={}) {
    setFormError('');setModal({kind,row});setPatientSearch('');
    if(kind==='book'||kind==='reschedule') setForm({patientId:row.patientId||'',doctorId:row.doctorId||'',date:todayIso(),dateTime:'',reason:'',durationMinutes:30});
    else if(kind==='pay') setForm({amount:(Number(row.totalAmount)-Number(row.amountPaid)).toFixed(2),method:'CASH',reference:''});
    else setForm({name:row.name||'',email:row.email||'',phone:row.phone||'',password:'',dob:row.dob||'',gender:row.gender||'FEMALE',address:row.address||'',emergencyContact:row.emergencyContact||''});
  }
  async function save(e) {
    e.preventDefault();setBusy(true);setFormError('');
    try {
      const {kind,row}=modal;
      if(kind==='patient-new') await http.post('/reception/patients',{...form,dob:form.dob||null,role:'PATIENT'});
      if(kind==='patient-edit') await http.patch(`/reception/patients/${row.id}`,{name:form.name,phone:form.phone,dob:form.dob||null,address:form.address,emergencyContact:form.emergencyContact});
      if(kind==='book') await http.post('/reception/appointments',{patientId:Number(form.patientId),doctorId:Number(form.doctorId),dateTime:form.dateTime,durationMinutes:Number(form.durationMinutes),reason:form.reason});
      if(kind==='reschedule') await http.patch(`/reception/appointments/${row.id}/reschedule`,{dateTime:form.dateTime,durationMinutes:Number(form.durationMinutes)});
      if(kind==='pay') await http.post(`/reception/billing/${row.id}/pay`,{amount:Number(form.amount),method:form.method,reference:form.reference});
      toast.success(kind==='patient-new'?'Patient registered. Give the patient their account details privately.':'Saved successfully');setModal(null);refresh();
    } catch(e) {setFormError(e.message);} finally {setBusy(false);}
  }
  async function action(row, action) {
    let body={};
    if(action==='cancel') {const reason=window.prompt('Reason for cancellation');if(reason===null)return;body={reason};}
    else if(action==='no-show'&&!window.confirm('Mark this patient as a no-show?')) return;
    setBusy(true);
    try {await http.patch(`/reception/appointments/${row.id}/${action}`,body);toast.success('Appointment updated');refresh();}
    catch(e){toast.error(e.message);}finally{setBusy(false);}
  }
  async function pdf(row) {
    try {const res=await client.get(`/reception/billing/${row.id}/pdf`,{responseType:'blob'});const url=URL.createObjectURL(res.data);const a=document.createElement('a');a.href=url;a.download=`${row.invoiceNumber}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){toast.error(e.message);}
  }
  const rows=(data.data||[]).filter(a=>!isAppointments||!queueDoctor||String(a.doctorId)===queueDoctor);
  return <div className="page">
    <PageHead eyebrow="Reception" title={titles[section]} description="Coordinate arrivals, appointments and payments. Clinical decisions remain with the treating team."
      actions={<div className="row-gap"><button className="btn" onClick={refresh}>Refresh</button>{section==='patients'&&<button className="btn btn--primary" onClick={()=>open('patient-new')}>Register patient</button>}{isAppointments&&<button className="btn btn--primary" onClick={()=>open('book')}>Book appointment</button>}</div>} />
    {section==='today'&&<><div className="stat-row"><Stat label="Visits shown" value={rows.length} icon="calendar" hint="Selected date / current page"/><Stat label="Checked in" value={rows.filter(a=>a.checkedInAt&&a.status==='BOOKED').length} icon="users" hint="Waiting for consultation"/><Stat label="Completed" value={rows.filter(a=>a.status==='COMPLETED').length} icon="check" hint="Selected date / current page"/></div><div className="row-gap"><Link className="btn" to="/receptionist/patients">Register or find a patient</Link><Link className="btn" to="/receptionist/billing">Record a payment</Link></div></>}
    {section!=='beds'&&<div className="toolbar"><label className="field"><span>Search</span><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder={section==='patients'?'Name, email, phone or patient ID':'Patient name or reference'} /></label>
      {isAppointments&&<>{field('Appointment date',<input type="date" value={day} onChange={e=>{setDay(e.target.value);setPage(1);}}/>)}{field('Doctor',<select value={queueDoctor} onChange={e=>setQueueDoctor(e.target.value)}><option value="">All doctors</option>{(doctors.data||[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>)}</>}
    </div>}
    {data.loading?<Loader label="Loading workspace…"/>:data.error?<ErrorState error={data.error} onRetry={refresh}/>:rows.length===0?<Empty title="No results" message="Try a different date or search. New records will appear here."/>:
      <div className="table-wrap"><table className="table">
      {isAppointments&&<><thead><tr><th>Time / token</th><th>Patient</th><th>Doctor</th><th>Arrival</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td>{dateTime(a.dateTime)}<br/>Token #{a.tokenNumber}</td><td><strong>{a.patientName}</strong><br/>{a.phone}</td><td>{a.doctorName}</td><td>{a.checkedInAt?`Checked in ${dateTime(a.checkedInAt)}`:'Not arrived'}</td><td><Badge status={a.status}/></td><td>{a.status==='BOOKED'&&<div className="row-gap"><button disabled={busy||!!a.checkedInAt||a.dateTime.slice(0,10)!==todayIso()} className="btn btn--sm" onClick={()=>action(a,'check-in')}>Check in</button><button className="btn btn--sm" onClick={()=>open('reschedule',a)}>Reschedule</button><button disabled={busy} className="btn btn--sm" onClick={()=>action(a,'cancel')}>Cancel</button><button disabled={busy||new Date(a.dateTime)>new Date()} className="btn btn--sm" onClick={()=>action(a,'no-show')}>No-show</button></div>}</td></tr>)}</tbody></>}
      {section==='patients'&&<><thead><tr><th>Patient</th><th>Email / phone</th><th>Date of birth</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><strong>{p.name}</strong><br/>Patient #{p.id}</td><td>{p.email}<br/>{p.phone}</td><td>{p.dob||'Not provided'}</td><td>{p.active?'Active':'Inactive'}</td><td><button className="btn btn--sm" onClick={()=>open('patient-edit',p)}>Edit contact details</button></td></tr>)}</tbody></>}
      {section==='billing'&&<><thead><tr><th>Invoice</th><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(i=><tr key={i.id}><td>{i.invoiceNumber}</td><td>{i.patientName}</td><td>{money(i.totalAmount)}</td><td>{money(i.amountPaid)}</td><td>{money(Number(i.totalAmount)-Number(i.amountPaid))}</td><td><Badge status={i.status}/></td><td><div className="row-gap">{i.status!=='VOID'&&Number(i.totalAmount)>Number(i.amountPaid)&&<button className="btn btn--sm" onClick={()=>open('pay',i)}>Record payment</button>}<button className="btn btn--sm" onClick={()=>setModal({kind:'history',row:i})}>Payment history</button><button className="btn btn--sm" onClick={()=>pdf(i)}>PDF receipt</button></div></td></tr>)}</tbody></>}
      {section==='beds'&&<><thead><tr><th>Ward</th><th>Bed</th><th>Daily charge</th><th>Status</th></tr></thead><tbody>{rows.map(b=><tr key={b.id}><td>{b.ward?.name}</td><td>{b.code}</td><td>{money(b.dailyCharge)}</td><td>Available</td></tr>)}</tbody></>}
      </table></div>}
    {(isAppointments||section==='billing')&&<div className="row-gap"><button className="btn" disabled={page===1||data.loading} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page}</span><button className="btn" disabled={(data.data||[]).length<100||data.loading} onClick={()=>setPage(page+1)}>Next</button></div>}
    {section==='patients'&&<p className="muted">Showing up to 100 matching patients. Search to find a specific person.</p>}
    <Modal open={!!modal} onClose={()=>!busy&&setModal(null)} title={{'patient-new':'Register patient','patient-edit':'Edit patient contact details',book:'Book appointment',reschedule:'Reschedule appointment',pay:'Record a payment',history:'Payment history'}[modal?.kind]||''} size="lg">
      {modal?.kind==='history'?<div className="stack">{(modal.row.payments||[]).map((p,i)=><div key={i} className="card"><strong>{money(p.amount)} · {p.method}</strong><p>{dateTime(p.paidAt)} · Recorded by {p.receivedBy}</p><p>{p.reference||'No reference'}</p></div>)}{!modal.row.payments?.length&&<p>No payments recorded.</p>}</div>:
      <form onSubmit={save}>{formError&&<div className="error-box" role="alert">{formError}</div>}
        {modal?.kind.startsWith('patient')&&<div className="grid-2">{field('Full name',<input required maxLength={120} value={form.name||''} onChange={update('name')}/>)}{field('Phone',<input maxLength={40} value={form.phone||''} onChange={update('phone')}/>)}{field('Date of birth',<input type="date" max={todayIso()} value={form.dob||''} onChange={update('dob')}/>)}
          {modal.kind==='patient-new'?<>{field('Email',<input type="email" required value={form.email||''} onChange={update('email')}/>)}{field('Initial password',<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password||''} onChange={update('password')}/>)}{field('Gender',<select value={form.gender} onChange={update('gender')}><option>FEMALE</option><option>MALE</option><option>OTHER</option></select>)}<p>The patient can change their initial password from Profile & password.</p></>:<>{field('Address',<input maxLength={500} value={form.address||''} onChange={update('address')}/>)}{field('Emergency contact',<input maxLength={200} value={form.emergencyContact||''} onChange={update('emergencyContact')}/>)}</>}
        </div>}
        {(modal?.kind==='book'||modal?.kind==='reschedule')&&<>
          {modal.kind==='book'&&<>{field('Find patient',<input value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} placeholder="Search name, email or phone"/>)}{field('Patient',<select required value={form.patientId} onChange={update('patientId')}><option value="">Choose a patient</option>{(patients.data||[]).filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}</select>)}</>}
          {field('Doctor',<select required disabled={modal.kind==='reschedule'} value={form.doctorId} onChange={e=>setForm({...form,doctorId:e.target.value,dateTime:''})}><option value="">Choose a doctor</option>{(doctors.data||[]).map(d=><option key={d.id} value={d.id}>{d.name} · {d.specialization}</option>)}</select>)}
          {field('Date',<input type="date" required min={todayIso()} value={form.date||''} onChange={e=>setForm({...form,date:e.target.value,dateTime:''})}/>)}
          {slots.error&&<p role="alert">{slots.error.message}</p>}
          {field('Available time',<select required value={form.dateTime||''} onChange={e=>{const slot=slots.data?.slots?.find(s=>s.dateTime===e.target.value);const window=slots.data?.windows?.find(w=>slot?.dateTime?.slice(11,16)>=w.startTime?.slice(0,5)&&slot?.dateTime?.slice(11,16)<w.endTime?.slice(0,5));setForm({...form,dateTime:e.target.value,durationMinutes:window?.slotMinutes||30});}}><option value="">{slots.loading?'Loading slots…':'Choose an available slot'}</option>{(slots.data?.slots||[]).filter(s=>s.available).map(s=><option key={s.dateTime} value={s.dateTime}>{s.label}</option>)}</select>)}
          {!slots.loading&&form.doctorId&&form.date&&!(slots.data?.slots||[]).some(s=>s.available)&&<p>No available slots. Choose another date or ask the doctor to publish availability.</p>}
          {modal.kind==='book'&&field('Visit reason (optional)',<input maxLength={500} value={form.reason||''} onChange={update('reason')}/>)}
        </>}
        {modal?.kind==='pay'&&<><p>Record money already received at the counter. This form does not charge a card.</p><p>Outstanding: {money(Number(modal.row.totalAmount)-Number(modal.row.amountPaid))}</p>{field('Amount received',<input type="number" required min="0.01" step="0.01" max={Number(modal.row.totalAmount)-Number(modal.row.amountPaid)} value={form.amount} onChange={update('amount')}/>)}{field('Payment method',<select value={form.method} onChange={update('method')}>{['CASH','CARD','BANK_TRANSFER','INSURANCE','UPI'].map(m=><option key={m}>{m}</option>)}</select>)}{field('Transaction reference',<input value={form.reference||''} onChange={update('reference')}/>)}</>}
        <div className="row-gap"><button type="button" className="btn" disabled={busy} onClick={()=>setModal(null)}>Cancel</button><button className="btn btn--primary" disabled={busy}>{busy?'Saving…':'Save'}</button></div>
      </form>}
    </Modal>
  </div>;
}
