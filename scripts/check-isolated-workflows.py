"""Integration checks ONLY for the disposable, seeded localhost:18084 review server.
Never point this script at the normal hospital database. Uses Python's standard library.
"""
import json
import urllib.request
import urllib.error
import uuid

BASE = 'http://localhost:18084'
checks = []

def call(method, path, token=None, body=None, expected=200, binary=False):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + '/api' + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read()
    if response.status != expected:
        raise AssertionError(f'{method} {path}: expected {expected}, got {response.status}: {raw[:300]!r}')
    checks.append(f'{method} {path}: {expected}')
    return raw if binary else json.loads(raw).get('data') if raw else None

def login(email, password='Password123!'):
    return call('POST', '/auth/login', body={'email': email, 'password': password})

admin = login('admin@hospital.test')['accessToken']
doctor = login('doctor@hospital.test')
patient = login('patient@hospital.test')
dt, pt = doctor['accessToken'], patient['accessToken']
patient_id = patient['user']['patientId']

# Catalogue CRUD, validation and authorization.
department = call('POST', '/departments', admin, {'name':'Review '+uuid.uuid4().hex[:8], 'consultationFee':100})
call('PATCH', '/departments/'+str(department['id']), admin,
     {'name':department['name'], 'description':'Updated test fixture', 'consultationFee':150, 'active':True})
call('POST', '/departments', pt, {'name':'Not allowed', 'consultationFee':100}, expected=403)
call('GET', '/users', pt, expected=403)
call('GET', '/auth/me', expected=401)

# Doctor -> lab sample -> completed result -> patient visibility.
tests = call('GET', '/lab/tests', dt)
order = call('POST', '/lab/orders', dt, {'patientId':patient_id, 'testId':tests[0]['id'], 'priority':'ROUTINE'})
oid = str(order['id'])
call('PATCH', '/lab/orders/'+oid+'/collect', admin, {'technician':'Review technician'})
call('PATCH', '/lab/orders/'+oid+'/result', admin, {'resultValue':'Review result', 'remarks':'Synthetic test only'})
visible = call('GET', '/lab/orders', pt)
assert any(x['id']==order['id'] and x['status']=='COMPLETED' for x in visible)
checks.append('Patient sees completed lab result')

# A new test patient avoids changing any seeded admission.
new_patient = call('POST', '/auth/register', body={'name':'Admission review',
    'email':'review-'+uuid.uuid4().hex[:8]+'@example.test', 'password':'ReviewPass456!', 'role':'PATIENT'})
beds = call('GET', '/wards/beds/available', admin)
admission = call('POST', '/wards/admissions', admin, {'patientId':new_patient['patientId'],
    'doctorId':doctor['user']['doctorId'], 'bedId':beds[0]['id'], 'diagnosis':'Synthetic review'})
call('POST', '/wards/admissions/'+str(admission['id'])+'/discharge', admin, {'notes':'Review finished'})
available = call('GET', '/wards/beds/available', admin)
assert any(b['id']==beds[0]['id'] for b in available)
checks.append('Discharge releases the bed')

# Invoice ownership and a genuine PDF response, not an HTML error download.
invoices = call('GET', '/billing', pt)
assert invoices, 'Seeded patient should have an invoice'
pdf = call('GET', '/billing/invoice/'+str(invoices[0]['id'])+'/pdf', pt, binary=True)
assert pdf.startswith(b'%PDF-'), 'Invoice download must be a PDF'
other = login('patient.maya@hospital.test')['accessToken']
call('GET', '/billing/invoice/'+str(invoices[0]['id'])+'/pdf', other, expected=403, binary=True)

# Refresh flow and notifications.
refreshed = call('POST', '/auth/refresh', body={'refreshToken':patient['refreshToken']})
call('GET', '/auth/me', refreshed['accessToken'])
call('POST', '/notifications/read-all', pt, {})
unread = call('GET', '/notifications/unread-count', pt)
assert unread == 0 or (isinstance(unread, dict) and unread.get('count') == 0), unread
print(json.dumps({'passed':len(checks), 'checks':checks}, indent=2))
