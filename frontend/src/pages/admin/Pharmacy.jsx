import { useState } from 'react';
import { pharmacyApi, recordApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext.jsx';
import {
  Badge, Empty, ErrorState, Field, Icon, Loader, Modal, Money, PageHead, SearchBar, Stat, Tabs,
} from '../../components/ui';
import { date, dateTime, money, todayIso } from '../../utils/format';

const TABS = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'dispense', label: 'Dispense' },
  { value: 'movements', label: 'Stock movements' },
  { value: 'alerts', label: 'Alerts' },
];

const BLANK_MEDICINE = {
  name: '', sku: '', category: '', manufacturer: '', unit: 'tablet',
  price: '', reorderLevel: 20, description: '', active: true,
};

function StockLevel({ medicine }) {
  const stock = Number(medicine.stockQuantity || 0);
  const reorder = Number(medicine.reorderLevel || 1);
  const max = Math.max(reorder * 4, stock, 1);
  const pct = Math.min(100, Math.round((stock / max) * 100));
  const tone = stock === 0 ? 'out' : stock <= reorder ? 'low' : '';
  return (
    <div className="stock">
      <div className="stock__bar"><div className={`stock__fill ${tone ? `stock__fill--${tone}` : ''}`} style={{ width: `${pct}%` }} /></div>
      <span className="stock__text">{stock} {medicine.unit}{stock === 0 ? ' · out' : stock <= reorder ? ' · reorder' : ''}</span>
    </div>
  );
}

export default function AdminPharmacy() {
  const toast = useToast();
  const [tab, setTab] = useState('inventory');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stockFor, setStockFor] = useState(null);
  const [batchesFor, setBatchesFor] = useState(null);
  const [form, setForm] = useState(BLANK_MEDICINE);
  const [stockForm, setStockForm] = useState({ batchNo: '', quantity: '', expiryDate: '', reason: 'Stock received' });
  const [busy, setBusy] = useState(false);

  const medicines = useApi(
    () => pharmacyApi.medicines({ ...(query ? { search: query } : {}), ...(lowOnly ? { lowStock: true } : {}), includeInactive: true }),
    [query, lowOnly]
  );
  const prescriptions = useApi(() => recordApi.prescriptions(), [tab], { enabled: tab === 'dispense' });
  const dispenses = useApi(() => pharmacyApi.dispenses(), [tab], { enabled: tab === 'dispense' });
  const movements = useApi(() => pharmacyApi.movements({ limit: 150 }), [tab], { enabled: tab === 'movements' });
  const alerts = useApi(() => pharmacyApi.alerts(), []);

  const items = medicines.data || [];
  const allPrescriptions = prescriptions.data || [];
  const dispensedIds = new Set((dispenses.data || []).map((d) => d.prescription?.id).filter(Boolean));
  const pending = allPrescriptions.filter((p) => !dispensedIds.has(p.id));

  const openNew = () => { setEditing({ id: 'new' }); setForm(BLANK_MEDICINE); };
  const openEdit = (medicine) => {
    setEditing(medicine);
    setForm({
      name: medicine.name, sku: medicine.sku, category: medicine.category || '',
      manufacturer: medicine.manufacturer || '', unit: medicine.unit || 'tablet',
      price: medicine.price, reorderLevel: medicine.reorderLevel,
      description: medicine.description || '', active: medicine.active,
    });
  };

  const saveMedicine = async () => {
    setBusy(true);
    try {
      const body = {
        ...form,
        price: Number(form.price || 0),
        reorderLevel: Number(form.reorderLevel || 20),
      };
      if (editing.id === 'new') await pharmacyApi.create(body);
      else await pharmacyApi.update(editing.id, body);
      toast.success(editing.id === 'new' ? 'Medicine added to the catalogue' : 'Medicine updated');
      setEditing(null);
      medicines.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const receiveStock = async () => {
    setBusy(true);
    try {
      await pharmacyApi.addStock(stockFor.id, {
        batchNo: stockForm.batchNo,
        quantity: Number(stockForm.quantity),
        expiryDate: stockForm.expiryDate || null,
        reason: stockForm.reason,
      });
      toast.success('Stock received and batch recorded');
      setStockFor(null);
      setStockForm({ batchNo: '', quantity: '', expiryDate: '', reason: 'Stock received' });
      medicines.refetch();
      alerts.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const dispense = async (prescription) => {
    if (!window.confirm(`Dispense ${prescription.items?.length} item(s) for ${prescription.patient?.user?.name}?`)) return;
    try {
      const result = await pharmacyApi.dispense({ prescriptionId: prescription.id, notes: 'Dispensed at pharmacy counter' });
      const warnings = result.data?.warnings || [];
      toast.success(`Dispensed ${result.data?.dispense?.items?.length || 0} item(s) · ${money(result.data?.dispense?.totalAmount)}`);
      if (warnings.length) toast.info(warnings.join(' · '));
      dispenses.refetch();
      medicines.refetch();
      alerts.refetch();
      prescriptions.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Pharmacy"
        title="Medicines & dispensing"
        description="Catalogue, batch-level stock, FEFO dispensing and low-stock alerts."
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setTab('alerts')}><Icon name="alert" size={15} /> Alerts</button>
            <button type="button" className="btn btn--primary" onClick={openNew}><Icon name="plus" size={15} /> Add medicine</button>
          </>
        )}
      />

      <div className="stat-row">
        <Stat label="Catalogue" value={(medicines.data || []).length} hint="Medicines tracked" icon="pill" />
        <Stat label="Low stock" value={(alerts.data?.lowStock || []).length} hint="At or below reorder level" icon="alert" tone="warning" />
        <Stat label="Expiring soon" value={(alerts.data?.expiringSoon || []).length} hint="Batches within 90 days" icon="clock" tone={alerts.data?.expiringSoon?.length ? 'danger' : 'success'} />
        <Stat label="Dispensed" value={(dispenses.data || []).length} hint="Prescriptions fulfilled" icon="check" tone="success" />
      </div>

      <div className="toolbar">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === 'inventory' ? (
          <div className="toolbar__group">
            <label className="check">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              <span>Low stock only</span>
            </label>
            <SearchBar value={search} onChange={setSearch} onSubmit={() => setQuery(search.trim())} placeholder="Name, SKU or category" />
          </div>
        ) : null}
      </div>

      {tab === 'inventory' ? (
        <>
          {medicines.loading ? <Loader label="Loading inventory…" /> : null}
          {medicines.error ? <ErrorState error={medicines.error} onRetry={medicines.refetch} /> : null}
          {!medicines.loading && !medicines.error && items.length === 0 ? <Empty icon="pill" title="No medicines found" message="Add a medicine or clear the filters." /> : null}
          {!medicines.loading && !medicines.error && items.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {items.map((medicine) => (
                    <tr key={medicine.id}>
                      <td data-label="Medicine">
                        <strong>{medicine.name}</strong>
                        <span className="muted" style={{ display: 'block', fontSize: 11 }}>{medicine.sku} · {medicine.manufacturer || '—'}</span>
                      </td>
                      <td data-label="Category">{medicine.category || '—'}</td>
                      <td data-label="Stock"><StockLevel medicine={medicine} /></td>
                      <td data-label="Price"><Money value={medicine.price} /></td>
                      <td data-label="Status">
                        {medicine.stockQuantity === 0 ? <Badge tone="danger">Out of stock</Badge>
                          : medicine.stockQuantity <= medicine.reorderLevel ? <Badge tone="warning">Reorder</Badge>
                            : <Badge tone="success">In stock</Badge>}
                      </td>
                      <td data-label="Actions">
                        <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn--sm" onClick={() => setStockFor(medicine)}>Receive</button>
                          <button type="button" className="btn btn--sm" onClick={() => setBatchesFor(medicine)}>Batches</button>
                          <button type="button" className="btn btn--sm" onClick={() => openEdit(medicine)}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'dispense' ? (
        <>
          {prescriptions.loading ? <Loader label="Loading prescriptions…" /> : null}
          {prescriptions.error ? <ErrorState error={prescriptions.error} onRetry={prescriptions.refetch} /> : null}
          <section className="stack">
            <div className="card__head" style={{ paddingBottom: 0 }}>
              <div><h3>Awaiting dispensing</h3><p className="muted">Prescriptions issued by doctors that have no dispense record yet</p></div>
            </div>
            {pending.length === 0 ? <Empty icon="check" title="No prescriptions waiting" message="Every issued prescription has been dispensed." /> : (
              <div className="stack">
                {pending.map((prescription) => (
                  <article className="card" key={prescription.id}>
                    <div className="card__head">
                      <div>
                        <h3>{prescription.patient?.user?.name}</h3>
                        <p className="muted">Issued by {prescription.doctor?.user?.name} · {dateTime(prescription.createdAt)}</p>
                      </div>
                      <button type="button" className="btn btn--primary btn--sm" onClick={() => dispense(prescription)}>Dispense</button>
                    </div>
                    <div className="rx__list">
                      {(prescription.items || []).map((item) => (
                        <div className="tile" key={`${prescription.id}-${item.medicineName}`}>
                          <div className="tile__main">
                            <strong>{item.medicineName}</strong>
                            <span>{item.dosage} · {item.frequency} · {item.durationDays} days</span>
                          </div>
                          <span className="muted">qty {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    {prescription.advice ? <p className="muted" style={{ fontSize: 12 }}>Advice: {prescription.advice}</p> : null}
                  </article>
                ))}
              </div>
            )}

            <h3 style={{ marginTop: 8 }}>Dispensed history</h3>
            {(dispenses.data || []).length === 0 ? <Empty icon="package" title="Nothing dispensed yet" message="Completed dispensings appear here." /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Patient</th><th>Items</th><th>Total</th><th>Dispensed by</th><th>When</th></tr></thead>
                  <tbody>
                    {(dispenses.data || []).map((dispenseRecord) => (
                      <tr key={dispenseRecord.id}>
                        <td data-label="Patient"><strong>{dispenseRecord.patient?.user?.name}</strong></td>
                        <td data-label="Items">{(dispenseRecord.items || []).map((item) => `${item.medicineName} ×${item.quantity}`).join(', ')}</td>
                        <td data-label="Total"><Money value={dispenseRecord.totalAmount} /></td>
                        <td data-label="Dispensed by">{dispenseRecord.dispensedBy}</td>
                        <td data-label="When">{dateTime(dispenseRecord.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {tab === 'movements' ? (
        <>
          {movements.loading ? <Loader label="Loading stock movements…" /> : null}
          {movements.error ? <ErrorState error={movements.error} onRetry={movements.refetch} /> : null}
          {!movements.loading && !movements.error && (movements.data || []).length === 0 ? <Empty icon="package" title="No movements yet" message="Stock received or dispensed will be recorded here." /> : null}
          {!movements.loading && !movements.error && (movements.data || []).length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>When</th><th>Medicine</th><th>Type</th><th>Quantity</th><th>Reference</th><th>Actor</th></tr></thead>
                <tbody>
                  {(movements.data || []).map((movement) => (
                    <tr key={movement.id}>
                      <td data-label="When">{dateTime(movement.createdAt)}</td>
                      <td data-label="Medicine">{movement.medicine?.name}</td>
                      <td data-label="Type"><Badge tone={movement.type === 'IN' ? 'success' : movement.type === 'OUT' ? 'warning' : 'muted'}>{movement.type}</Badge></td>
                      <td data-label="Quantity">{movement.quantity}</td>
                      <td data-label="Reference"><code>{movement.reference || '—'}</code></td>
                      <td data-label="Actor">{movement.createdBy || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'alerts' ? (
        <>
          {alerts.loading ? <Loader label="Checking stock alerts…" /> : null}
          {alerts.error ? <ErrorState error={alerts.error} onRetry={alerts.refetch} /> : null}
          <div className="split split--even">
            <section className="card">
              <div className="card__head"><div><h3>Reorder now</h3><p className="muted">At or below the reorder level</p></div></div>
              {(alerts.data?.lowStock || []).length === 0 ? <Empty icon="check" title="Stock levels healthy" message="No medicine needs reordering." /> : (
                <div className="tile-list">
                  {(alerts.data.lowStock || []).map((medicine) => (
                    <div className={`tile ${medicine.stockQuantity === 0 ? 'tile--danger' : 'tile--warn'}`} key={medicine.id}>
                      <div className="tile__main">
                        <strong>{medicine.name}</strong>
                        <span>{medicine.stockQuantity} {medicine.unit} on hand · reorder at {medicine.reorderLevel}</span>
                      </div>
                      <button type="button" className="btn btn--sm" onClick={() => setStockFor(medicine)}>Receive</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="card">
              <div className="card__head"><div><h3>Expiring within 90 days</h3><p className="muted">Batches to rotate or write off</p></div></div>
              {(alerts.data?.expiringSoon || []).length === 0 ? <Empty icon="check" title="No near-expiry batches" message="All batches have more than 90 days left." /> : (
                <div className="tile-list">
                  {(alerts.data.expiringSoon || []).map((batch) => (
                    <div className="tile tile--warn" key={batch.id}>
                      <div className="tile__main">
                        <strong>{batch.medicine?.name}</strong>
                        <span>Batch {batch.batchNo} · expires {date(batch.expiryDate)}</span>
                      </div>
                      <span className="muted">{batch.quantity} left</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id === 'new' ? 'Add medicine' : `Edit ${editing?.name || ''}`}
        size="lg"
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={saveMedicine} disabled={busy}>{busy ? 'Saving…' : 'Save medicine'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Paracetamol 500mg" /></Field>
          <Field label="SKU"><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="MED-PARA-500" /></Field>
          <Field label="Category"><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Analgesic" /></Field>
          <Field label="Manufacturer"><input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
          <Field label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="tablet" /></Field>
          <Field label="Price (Rs.)"><input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="Reorder level"><input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
          <Field label="Status">
            <select value={form.active ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Description"><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      </Modal>

      <Modal
        open={Boolean(stockFor)}
        onClose={() => setStockFor(null)}
        title="Receive stock"
        description={stockFor ? `${stockFor.name} · currently ${stockFor.stockQuantity} ${stockFor.unit}` : ''}
        footer={(
          <>
            <button type="button" className="btn" onClick={() => setStockFor(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={receiveStock} disabled={busy || !stockForm.batchNo || !stockForm.quantity}>{busy ? 'Receiving…' : 'Receive stock'}</button>
          </>
        )}
      >
        <div className="grid-2">
          <Field label="Batch number"><input value={stockForm.batchNo} onChange={(e) => setStockForm({ ...stockForm, batchNo: e.target.value })} placeholder="B-PARA-1102" /></Field>
          <Field label="Quantity"><input type="number" min="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} /></Field>
          <Field label="Expiry date"><input type="date" min={todayIso()} value={stockForm.expiryDate} onChange={(e) => setStockForm({ ...stockForm, expiryDate: e.target.value })} /></Field>
          <Field label="Reason"><input value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} /></Field>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>Receiving stock creates a batch and an IN movement; dispensing consumes the earliest-expiring batch first.</p>
      </Modal>

      <BatchesModal medicine={batchesFor} onClose={() => setBatchesFor(null)} onAdjusted={()=>{medicines.refetch();alerts.refetch();movements.refetch();}} />
    </div>
  );
}

function BatchesModal({ medicine, onClose, onAdjusted }) {
  const toast = useToast();
  const [adjusting, setAdjusting] = useState(false);
  const batches = useApi(() => pharmacyApi.batches(medicine.id), [medicine?.id], { enabled: Boolean(medicine) });
  const writeOff = async (batch) => {
    const remaining = window.prompt(`Batch ${batch.batchNo}: enter remaining quantity after write-off (0 to ${batch.quantity})`, '0');
    if (remaining === null) return;
    if (!/^\d+$/.test(remaining) || Number(remaining)>batch.quantity) {toast.error('Enter a valid remaining quantity.');return;}
    const reason = window.prompt('Reason for write-off (expiry, damage, or stock reconciliation)');
    if (!reason?.trim()) return;
    setAdjusting(true);
    try {await pharmacyApi.adjust(batch.id,{quantity:Number(remaining),reason});toast.success('Stock write-off recorded');batches.refetch();onAdjusted();}
    catch(e){toast.error(e.message);}finally{setAdjusting(false);}
  };
  return (
    <Modal
      open={Boolean(medicine)}
      onClose={onClose}
      title={`Batches · ${medicine?.name || ''}`}
      description="Earliest expiry leaves the shelf first when dispensing."
      size="lg"
      footer={<button type="button" className="btn" onClick={onClose}>Close</button>}
    >
      {batches.loading ? <div className="loader-inline">Loading batches…</div> : null}
      {(batches.data || []).length === 0 ? <Empty icon="package" title="No batches recorded" message="Receive stock to create the first batch." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Batch</th><th>Expiry</th><th>Quantity</th><th>Received</th><th>Actions</th></tr></thead>
            <tbody>
              {(batches.data || []).map((batch) => (
                <tr key={batch.id}>
                  <td data-label="Batch"><strong>{batch.batchNo}</strong></td>
                  <td data-label="Expiry">{date(batch.expiryDate)}</td>
                  <td data-label="Quantity">{batch.quantity}</td>
                  <td data-label="Received">{date(batch.createdAt)}</td>
                  <td><button className="btn btn--sm" disabled={adjusting || batch.quantity===0} onClick={()=>writeOff(batch)}>Write off stock</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
