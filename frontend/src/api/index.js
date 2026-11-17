import { http, downloadInvoicePdf } from './client';

export const authApi = {
  login: (body) => http.post('/auth/login', body),
  register: (body) => http.post('/auth/register', body),
  me: () => http.get('/auth/me'),
  logout: () => http.post('/auth/logout', {}),
  updateProfile: (body) => http.patch('/auth/profile', body),
  changePassword: (body) => http.patch('/auth/password', body),
};

export const publicApi = {
  stats: () => http.get('/public/stats'),
  departments: () => http.get('/public/departments'),
  doctors: (departmentId) => http.get('/public/doctors', departmentId ? { departmentId } : undefined),
  availability: (doctorId, date) => http.get(`/public/doctors/${doctorId}/availability`, { date }),
};

export const dashboardApi = {
  get: () => http.get('/dashboard'),
};

export const departmentApi = {
  list: (includeInactive = false) => http.get('/departments', { includeInactive }),
  get: (id) => http.get(`/departments/${id}`),
  create: (body) => http.post('/departments', body),
  update: (id, body) => http.patch(`/departments/${id}`, body),
  remove: (id) => http.delete(`/departments/${id}`),
};

export const doctorApi = {
  list: (params) => http.get('/doctors', params),
  me: () => http.get('/doctors/me'),
  get: (id) => http.get(`/doctors/${id}`),
  availability: (id, date) => http.get(`/doctors/${id}/availability`, { date }),
  schedule: (id, date) => http.get(`/doctors/${id}/schedule`, { date }),
  update: (id, body) => http.patch(`/doctors/${id}`, body),
  setAvailability: (id, slots) => http.patch(`/doctors/${id}/availability`, { slots }),
  deactivate: (id) => http.delete(`/doctors/${id}`),
  leaves: (id) => http.get(`/doctors/${id}/leaves`),
  allLeaves: () => http.get('/doctors/leaves'),
  requestLeave: (id, body) => http.post(`/doctors/${id}/leaves`, body),
  decideLeave: (leaveId, status) => http.patch(`/doctors/leaves/${leaveId}`, { status }),
};

export const patientApi = {
  list: (search) => http.get('/patients', search ? { search } : undefined),
  me: () => http.get('/patients/me'),
  get: (id) => http.get(`/patients/${id}`),
  update: (id, body) => http.patch(`/patients/${id}`, body),
  deactivate: (id) => http.delete(`/patients/${id}`),
};

export const appointmentApi = {
  book: (body) => http.post('/appointments', body),
  list: (params) => http.get('/appointments', params),
  me: (params) => http.get('/appointments/me', params),
  get: (id) => http.get(`/appointments/${id}`),
  cancel: (id, reason) => http.patch(`/appointments/${id}/cancel`, { reason }),
  reschedule: (id, body) => http.patch(`/appointments/${id}/reschedule`, body),
  remove: (id) => http.delete(`/appointments/${id}`),
  complete: (id, notes) => http.patch(`/appointments/${id}/complete`, { notes }),
  noShow: (id) => http.patch(`/appointments/${id}/no-show`),
};

export const recordApi = {
  create: (body) => http.post('/medical-records', body),
  list: (patientId) => http.get('/medical-records', patientId ? { patientId } : undefined),
  forPatient: (patientId) => http.get(`/medical-records/patient/${patientId}`),
  get: (id) => http.get(`/medical-records/${id}`),
  update: (id, body) => http.patch(`/medical-records/${id}`, body),
  prescriptions: (patientId) => http.get('/medical-records/prescriptions', patientId ? { patientId } : undefined),
  prescription: (id) => http.get(`/medical-records/prescriptions/${id}`),
};

export const billingApi = {
  list: (params) => http.get('/billing', params),
  summary: () => http.get('/billing/summary'),
  forPatient: (patientId) => http.get(`/billing/patient/${patientId}`),
  generate: (appointmentId) => http.post(`/billing/${appointmentId}/generate`, {}),
  get: (id) => http.get(`/billing/invoice/${id}`),
  pay: (id, body) => http.post(`/billing/invoice/${id}/pay`, body),
  update: (id, body) => http.patch(`/billing/invoice/${id}`, body),
  void: (id) => http.delete(`/billing/invoice/${id}`),
  pdf: downloadInvoicePdf,
};

export const pharmacyApi = {
  medicines: (params) => http.get('/pharmacy/medicines', params),
  medicine: (id) => http.get(`/pharmacy/medicines/${id}`),
  create: (body) => http.post('/pharmacy/medicines', body),
  update: (id, body) => http.patch(`/pharmacy/medicines/${id}`, body),
  addStock: (id, body) => http.post(`/pharmacy/medicines/${id}/stock`, body),
  adjust: (id, body) => http.patch(`/pharmacy/batches/${id}`, body),
  batches: (id) => http.get(`/pharmacy/medicines/${id}/batches`),
  movements: (params) => http.get('/pharmacy/movements', params),
  alerts: () => http.get('/pharmacy/alerts'),
  dispense: (body) => http.post('/pharmacy/dispense', body),
  dispenses: () => http.get('/pharmacy/dispenses'),
};

export const labApi = {
  tests: (includeInactive = false) => http.get('/lab/tests', { includeInactive }),
  createTest: (body) => http.post('/lab/tests', body),
  updateTest: (id, body) => http.patch(`/lab/tests/${id}`, body),
  order: (body) => http.post('/lab/orders', body),
  orders: (status) => http.get('/lab/orders', status ? { status } : undefined),
  orderGet: (id) => http.get(`/lab/orders/${id}`),
  collect: (id, technician) => http.patch(`/lab/orders/${id}/collect`, { technician }),
  result: (id, body) => http.patch(`/lab/orders/${id}/result`, body),
  cancel: (id) => http.patch(`/lab/orders/${id}/cancel`),
};

export const wardApi = {
  wards: (includeInactive = false) => http.get('/wards', { includeInactive }),
  createWard: (body) => http.post('/wards', body),
  updateWard: (id, body) => http.patch(`/wards/${id}`, body),
  beds: (wardId) => http.get(`/wards/${wardId}/beds`),
  addBed: (wardId, body) => http.post(`/wards/${wardId}/beds`, body),
  updateBed: (id, body) => http.patch(`/wards/beds/${id}`, body),
  setBedStatus: (id, status) => http.patch(`/wards/beds/${id}/status`, { status }),
  availableBeds: () => http.get('/wards/beds/available'),
  admissions: (status) => http.get('/wards/admissions', status ? { status } : undefined),
  admission: (id) => http.get(`/wards/admissions/${id}`),
  admit: (body) => http.post('/wards/admissions', body),
  discharge: (id, notes) => http.post(`/wards/admissions/${id}/discharge`, { notes }),
  occupancy: () => http.get('/wards/occupancy'),
};

export const userApi = {
  list: (params) => http.get('/users', params),
  get: (id) => http.get(`/users/${id}`),
  createStaff: (body) => http.post('/users/staff', body),
  review: (id, approve, note) => http.patch(`/users/${id}/review`, { approve, note }),
  setStatus: (id, active) => http.patch(`/users/${id}/status`, { active }),
};

export const notificationApi = {
  list: () => http.get('/notifications'),
  unreadCount: () => http.get('/notifications/unread-count'),
  markRead: (id) => http.patch(`/notifications/${id}/read`, {}),
  markAllRead: () => http.post('/notifications/read-all', {}),
};

export const auditApi = {
  list: (params) => http.get('/audit', params),
};
