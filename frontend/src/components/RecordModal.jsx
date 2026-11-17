import { useState } from 'react';
import { labApi, recordApi } from '../api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Icon, Modal } from './ui';
import { date, time } from '../utils/format';

const EMPTY_ITEM = { medicineName: '', dosage: '', frequency: '', durationDays: 5, quantity: 10, instructions: '' };

export default function RecordModal({ open, appointment, onClose, onSaved }) {
  const toast = useToast();
  const tests = useApi(() => labApi.tests(), [open], { enabled: open });
  const [form, setForm] = useState({
    diagnosis: '',
    symptoms: '',
    bloodPressure: '',
    pulse: '',
    temperature: '',
    weight: '',
    height: '',
    spo2: '',
    notes: '',
    followUpDate: '',
    advice: '',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [labIds, setLabIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const reset = () => {
    setForm({
      diagnosis: '', symptoms: '', bloodPressure: '', pulse: '', temperature: '',
      weight: '', height: '', spo2: '', notes: '', followUpDate: '', advice: '',
    });
    setItems([{ ...EMPTY_ITEM }]);
    setLabIds([]);
  };

  const toggleLab = (id) => {
    setLabIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  };

  const submit = async () => {
    if (!form.diagnosis.trim()) {
      toast.error('A diagnosis is required');
      return;
    }
    setBusy(true);
    try {
      const prescription = items
        .filter((item) => item.medicineName.trim())
        .map((item) => ({
          medicineName: item.medicineName,
          dosage: item.dosage || null,
          frequency: item.frequency || null,
          durationDays: item.durationDays ? Number(item.durationDays) : null,
          quantity: item.quantity ? Number(item.quantity) : null,
          instructions: item.instructions || null,
        }));
      await recordApi.create({
        appointmentId: appointment.id,
        diagnosis: form.diagnosis,
        symptoms: form.symptoms || null,
        bloodPressure: form.bloodPressure || null,
        pulse: form.pulse ? Number(form.pulse) : null,
        temperature: form.temperature ? Number(form.temperature) : null,
        weight: form.weight ? Number(form.weight) : null,
        height: form.height ? Number(form.height) : null,
        spo2: form.spo2 ? Number(form.spo2) : null,
        notes: form.notes || null,
        followUpDate: form.followUpDate || null,
        advice: form.advice || null,
        prescription,
        labTestIds: labIds,
      });
      toast.success('Clinical record saved' + (prescription.length ? ' with prescription' : ''));
      reset();
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Write the clinical record"
      description={appointment ? `${appointment.patient?.user?.name} · ${date(appointment.dateTime)} ${time(appointment.dateTime)}` : ''}
      size="lg"
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Sign & save record'}
          </button>
        </>
      )}
    >
      <div className="grid-2">
        <Field label="Diagnosis" className="grid-span">
          <input value={form.diagnosis} onChange={update('diagnosis')} placeholder="e.g. Community-acquired pneumonia" />
        </Field>
        <Field label="Presenting symptoms">
          <textarea rows={2} value={form.symptoms} onChange={update('symptoms')} placeholder="Cough, fever, shortness of breath…" />
        </Field>
        <Field label="Examination notes">
          <textarea rows={2} value={form.notes} onChange={update('notes')} placeholder="Chest auscultation, throat, abdomen…" />
        </Field>
      </div>

      <h4>Vitals</h4>
      <div className="grid-3">
        <Field label="Blood pressure"><input value={form.bloodPressure} onChange={update('bloodPressure')} placeholder="120/80" /></Field>
        <Field label="Pulse (bpm)"><input type="number" value={form.pulse} onChange={update('pulse')} placeholder="72" /></Field>
        <Field label="Temperature (°C)"><input type="number" step="0.1" value={form.temperature} onChange={update('temperature')} placeholder="36.8" /></Field>
        <Field label="Weight (kg)"><input type="number" step="0.1" value={form.weight} onChange={update('weight')} placeholder="70" /></Field>
        <Field label="Height (cm)"><input type="number" step="0.1" value={form.height} onChange={update('height')} placeholder="170" /></Field>
        <Field label="SpO₂ (%)"><input type="number" value={form.spo2} onChange={update('spo2')} placeholder="98" /></Field>
      </div>

      <div className="grid-2">
        <Field label="Follow-up date"><input type="date" value={form.followUpDate} onChange={update('followUpDate')} /></Field>
        <Field label="Advice to patient"><input value={form.advice} onChange={update('advice')} placeholder="Rest, hydration, red flags…" /></Field>
      </div>

      <div className="row-end" style={{ borderTop: 0, paddingTop: 0 }}>
        <div>
          <h4>Prescription</h4>
          <p className="muted" style={{ fontSize: 12 }}>Only items with a medicine name are saved.</p>
        </div>
        <button type="button" className="btn btn--sm" onClick={() => setItems([...items, { ...EMPTY_ITEM }])}>
          <Icon name="plus" size={13} /> Add medicine
        </button>
      </div>
      <div className="stack stack--tight">
        {items.map((item, index) => (
          <div className="rxform__row" key={index}>
            <input style={{ flex: '2 1 180px' }} value={item.medicineName} onChange={(e) => updateItem(index, 'medicineName', e.target.value)} placeholder="Medicine name" />
            <input value={item.dosage} onChange={(e) => updateItem(index, 'dosage', e.target.value)} placeholder="Dosage" />
            <input value={item.frequency} onChange={(e) => updateItem(index, 'frequency', e.target.value)} placeholder="Frequency" />
            <input type="number" min="1" value={item.durationDays} onChange={(e) => updateItem(index, 'durationDays', e.target.value)} placeholder="Days" style={{ maxWidth: 80 }} />
            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} placeholder="Qty" style={{ maxWidth: 80 }} />
            <input value={item.instructions} onChange={(e) => updateItem(index, 'instructions', e.target.value)} placeholder="Instructions" />
            <button type="button" className="icon-btn" onClick={() => setItems(items.filter((_, i) => i !== index))} aria-label="Remove medicine">×</button>
          </div>
        ))}
      </div>

      <h4 style={{ marginTop: 8 }}>Order lab tests</h4>
      <div className="check-grid">
        {(tests.data || []).map((test) => (
          <label className="check" key={test.id}>
            <input type="checkbox" checked={labIds.includes(test.id)} onChange={() => toggleLab(test.id)} />
            <span>{test.name} <em className="muted">· {test.sampleType}</em></span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
