import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { appointmentApi, labApi, patientApi, recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import RecordModal from '../../components/RecordModal.jsx';
import {
  Avatar, Badge, Empty, ErrorState, Field, Icon, Loader, Modal, PageHead, Stat,
} from '../../components/ui';
import { date, dateTime, relative, time } from '../../utils/format';

export default function DoctorPatientRecord() {
  const { patientId } = useParams();
  const toast = useToast();
  const [recordFor, setRecordFor] = useState(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({ testId: '', priority: 'ROUTINE' });
  const [busy, setBusy] = useState(false);

  const { data, loading, error, refetch } = useApi(async () => {
    const [patient, records, appointments, labs] = await Promise.all([
      patientApi.get(patientId),
      recordApi.forPatient(patientId),
      appointmentApi.list({ limit: 200 }),
      labApi.orders(),
    ]);
    return {
      data: {
        patient: patient.data,
        records: records.data || [],
        appointments: (appointments.data || []).filter((a) => String(a.patient?.id) === String(patientId)),
        labs: (labs.data || []).filter((order) => String(order.patient?.id) === String(patientId)),
      },
    };
  }, [patientId]);

  const tests = useApi(() => labApi.tests(), [orderOpen], { enabled: orderOpen });

  if (loading) return <Loader label="Opening the patient chart…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const patient = data?.patient;
  const records = data?.records || [];
  const appointments = data?.appointments || [];
  const labs = data?.labs || [];
  const recordAppointments = new Set(records.map((record) => record.appointment?.id));
  const eligible = appointments.filter((a) => a.status === 'COMPLETED' && !recordAppointments.has(a.id));

  const orderLab = async () => {
    if (!orderForm.testId) { toast.error('Choose a test'); return; }
    setBusy(true);
    try {
      await labApi.order({ patientId: Number(patientId), testId: Number(orderForm.testId), priority: orderForm.priority });
      toast.success('Lab test ordered');
      setOrderOpen(false);
      setOrderForm({ testId: '', priority: 'ROUTINE' });
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Patient chart"
        title={patient?.user?.name}
        description={`${patient?.age ?? '—'} years · ${patient?.gender?.toLowerCase() || '—'} · ${patient?.bloodGroup || '—'}`}
        actions={(
          <>
            <Link className="btn" to="/doctor/patients">Back to patients</Link>
            <button type="button" className="btn btn--primary" onClick={() => setOrderOpen(true)}><Icon name="flask" size={15} /> Order lab test</button>
          </>
        )}
      />

      <div className="split">
        <section className="card">
          <div className="card__head">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar name={patient?.user?.name} size="lg" />
              <div>
                <h3>{patient?.user?.name}</h3>
                <p className="muted">{patient?.user?.email} · {patient?.user?.phone || 'no phone'}</p>
              </div>
            </div>
            <Badge tone="info">Under your care</Badge>
          </div>
          <div className="grid-2">
            <div className="detail"><span>Address</span><strong>{patient?.address || '—'}</strong></div>
            <div className="detail"><span>Emergency contact</span><strong>{patient?.emergencyContact || '—'}</strong></div>
            <div className="detail"><span>Insurance</span><strong>{patient?.insuranceProvider || 'Self pay'}</strong></div>
            <div className="detail"><span>Registered</span><strong>{date(patient?.createdAt)}</strong></div>
          </div>
        </section>

        <div className="stack">
          {patient?.allergies && patient.allergies !== 'None' ? (
            <div className="notice notice--danger">
              <Icon name="alert" size={17} />
              <div><strong>Allergy alert</strong>{patient.allergies}</div>
            </div>
          ) : null}
          <div className="stat-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Stat label="Visits" value={appointments.length} hint="With you" icon="calendar" />
            <Stat label="Records" value={records.length} hint="Signed" icon="file" tone="success" />
          </div>
          <div className="stat-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Stat label="Lab orders" value={labs.length} hint="Total" icon="flask" tone="info" />
            <Stat label="Prescriptions" value={records.filter((record) => record.prescription).length} hint="Issued" icon="pill" />
          </div>
        </div>
      </div>

      {eligible.length ? (
        <div className="notice notice--info">
          <Icon name="file" size={17} />
          <div>
            <strong>{eligible.length} completed visit{eligible.length > 1 ? 's are' : ' is'} missing a clinical record.</strong>
            <div className="row-gap" style={{ marginTop: 8 }}>
              {eligible.slice(0, 3).map((appointment) => (
                <button type="button" key={appointment.id} className="btn btn--sm" onClick={() => setRecordFor(appointment)}>
                  Write record · {date(appointment.dateTime)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <section className="card">
        <div className="card__head">
          <div><h3>Clinical history</h3><p className="muted">Diagnoses, vitals and prescriptions</p></div>
        </div>
        {records.length === 0 ? <Empty icon="file" title="No clinical records" message="Complete a visit and write the record to start the history." /> : (
          <div className="record-grid">
            {records.map((record) => (
              <article className="card record" key={record.id}>
                <div className="record__head">
                  <div>
                    <h4>{record.diagnosis}</h4>
                    <span className="muted">{dateTime(record.createdAt)} · {record.doctor?.user?.name}</span>
                  </div>
                  {record.followUpDate ? <Badge tone="info">Follow-up {date(record.followUpDate)}</Badge> : null}
                </div>
                {record.symptoms ? <p className="muted">{record.symptoms}</p> : null}
                {record.vitals ?? null}
                <ul className="vitals">
                  {record.bloodPressure ? <li><span>BP</span>{record.bloodPressure}</li> : null}
                  {record.pulse ? <li><span>Pulse</span>{record.pulse} bpm</li> : null}
                  {record.temperature ? <li><span>Temp</span>{record.temperature} °C</li> : null}
                  {record.spo2 ? <li><span>SpO₂</span>{record.spo2}%</li> : null}
                  {record.weight ? <li><span>Weight</span>{record.weight} kg</li> : null}
                  {record.height ? <li><span>Height</span>{record.height} cm</li> : null}
                </ul>
                {record.notes ? <p className="record__notes">{record.notes}</p> : null}
                {record.prescription ? (
                  <div className="rx">
                    <h5>Prescription</h5>
                    <ul className="rx__list">
                      {(record.prescription.items || []).map((item) => (
                        <li key={item.medicineName}><strong>{item.medicineName}</strong> — {item.dosage} · {item.frequency} · {item.durationDays} days{item.instructions ? ` · ${item.instructions}` : ''}</li>
                      ))}
                    </ul>
                    {record.prescription.advice ? <p className="muted">Advice: {record.prescription.advice}</p> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="split split--even">
        <section className="card">
          <div className="card__head"><div><h3>Appointments</h3><p className="muted">Your visits with this patient</p></div></div>
          {appointments.length === 0 ? <Empty icon="calendar" title="No appointments" message="No visits booked with you yet." /> : (
            <div className="tile-list">
              {appointments.map((appointment) => (
                <div className="tile" key={appointment.id}>
                  <div className="tile__main">
                    <strong>{date(appointment.dateTime)} · {time(appointment.dateTime)}</strong>
                    <span>{appointment.reason || 'No reason recorded'}</span>
                  </div>
                  <Badge status={appointment.status.toLowerCase()} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__head"><div><h3>Lab orders</h3><p className="muted">Ordered for this patient</p></div></div>
          {labs.length === 0 ? <Empty icon="flask" title="No lab orders" message="Order a test to investigate." /> : (
            <div className="tile-list">
              {labs.map((order) => (
                <div className="tile" key={order.id}>
                  <div className="tile__main">
                    <strong>{order.test?.name}</strong>
                    <span>{order.status === 'COMPLETED' ? `Result: ${order.resultValue} ${order.resultUnit || ''}` : `Ordered ${relative(order.orderedAt)}`}</span>
                  </div>
                  <Badge status={order.status.toLowerCase()} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <RecordModal
        open={Boolean(recordFor)}
        appointment={recordFor}
        onClose={() => setRecordFor(null)}
        onSaved={() => { setRecordFor(null); refetch(); }}
      />

      <Modal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="Order a lab test"
        description={patient?.user?.name}
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setOrderOpen(false)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={orderLab} disabled={busy}>{busy ? 'Ordering…' : 'Order test'}</button>
          </>
        )}
      >
        <Field label="Test">
          <select value={orderForm.testId} onChange={(e) => setOrderForm({ ...orderForm, testId: e.target.value })}>
            <option value="">Choose a test</option>
            {(tests.data || []).map((test) => <option key={test.id} value={test.id}>{test.name} · {test.sampleType} · Rs. {test.price}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={orderForm.priority} onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}>
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
          </select>
        </Field>
      </Modal>
    </div>
  );
}
