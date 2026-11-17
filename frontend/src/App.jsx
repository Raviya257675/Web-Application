import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import DashboardLayout from './components/Layout.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminAppointments from './pages/admin/Appointments.jsx';
import AdminDoctors from './pages/admin/Doctors.jsx';
import AdminDepartments from './pages/admin/Departments.jsx';
import AdminPatients from './pages/admin/Patients.jsx';
import AdminBilling from './pages/admin/Billing.jsx';
import AdminPharmacy from './pages/admin/Pharmacy.jsx';
import AdminLaboratory from './pages/admin/Laboratory.jsx';
import AdminWards from './pages/admin/Wards.jsx';
import AdminStaff from './pages/admin/Staff.jsx';
import AdminLeaves from './pages/admin/Leaves.jsx';
import AdminAudit from './pages/admin/Audit.jsx';

import DoctorDashboard from './pages/doctor/Dashboard.jsx';
import DoctorAppointments from './pages/doctor/Appointments.jsx';
import DoctorPatients from './pages/doctor/Patients.jsx';
import DoctorPatient from './pages/doctor/PatientRecord.jsx';
import DoctorRecords from './pages/doctor/Records.jsx';
import DoctorLab from './pages/doctor/LabOrders.jsx';
import DoctorAvailability from './pages/doctor/Availability.jsx';

import PatientDashboard from './pages/patient/Dashboard.jsx';
import BookAppointment from './pages/patient/Book.jsx';
import PatientAppointments from './pages/patient/Appointments.jsx';
import PatientRecords from './pages/patient/Records.jsx';
import PatientPrescriptions from './pages/patient/Prescriptions.jsx';
import PatientInvoices from './pages/patient/Invoices.jsx';
import PatientLab from './pages/patient/Lab.jsx';
import PatientAdmissions from './pages/patient/Admissions.jsx';

import Notifications from './pages/Notifications.jsx';
import Reception from './pages/reception/Reception.jsx';
import Account from './pages/Account.jsx';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader-full"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowed={['RECEPTIONIST']} />}>
          <Route path="/receptionist" element={<DashboardLayout />}>
            <Route index element={<Reception />} />
            <Route path="patients" element={<Reception section="patients" />} />
            <Route path="appointments" element={<Reception section="appointments" />} />
            <Route path="billing" element={<Reception section="billing" />} />
            <Route path="beds" element={<Reception section="beds" />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>
        <Route element={<RoleRoute allowed={['PHARMACIST']} />}>
          <Route path="/pharmacist" element={<DashboardLayout />}>
            <Route index element={<AdminPharmacy />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>
        <Route path="/account" element={<DashboardLayout />}><Route index element={<Account />} /></Route>
        <Route element={<RoleRoute allowed={['ADMIN']} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="appointments" element={<AdminAppointments />} />
            <Route path="doctors" element={<AdminDoctors />} />
            <Route path="departments" element={<AdminDepartments />} />
            <Route path="patients" element={<AdminPatients />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="pharmacy" element={<AdminPharmacy />} />
            <Route path="laboratory" element={<AdminLaboratory />} />
            <Route path="wards" element={<AdminWards />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="approvals" element={<AdminStaff key="approvals" approvals />} />
            <Route path="leaves" element={<AdminLeaves />} />
            <Route path="audit" element={<AdminAudit />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowed={['DOCTOR']} />}>
          <Route path="/doctor" element={<DashboardLayout />}>
            <Route index element={<DoctorDashboard />} />
            <Route path="appointments" element={<DoctorAppointments />} />
            <Route path="patients" element={<DoctorPatients />} />
            <Route path="patients/:patientId" element={<DoctorPatient />} />
            <Route path="records" element={<DoctorRecords />} />
            <Route path="lab" element={<DoctorLab />} />
            <Route path="availability" element={<DoctorAvailability />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowed={['PATIENT']} />}>
          <Route path="/patient" element={<DashboardLayout />}>
            <Route index element={<PatientDashboard />} />
            <Route path="book" element={<BookAppointment />} />
            <Route path="appointments" element={<PatientAppointments />} />
            <Route path="records" element={<PatientRecords />} />
            <Route path="prescriptions" element={<PatientPrescriptions />} />
            <Route path="invoices" element={<PatientInvoices />} />
            <Route path="lab" element={<PatientLab />} />
            <Route path="admissions" element={<PatientAdmissions />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route path="/notifications" element={<DashboardLayout />}>
          <Route index element={<Notifications />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
