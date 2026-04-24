"""Test the automation API end-to-end"""
import requests

BASE = 'http://localhost:5000/api'

# 1. Login as admin
print("=== 1. Login ===")
r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@erp.com', 'password': 'admin123'})
if r.status_code != 200:
    r = requests.post(f'{BASE}/auth/login', json={'email': 'sri@skyline.com', 'password': 'pass123'})
    
print(f"  Status: {r.status_code}")
data = r.json()
token = data.get('access_token') or data.get('token')
print(f"  Token: {'OK' if token else 'FAILED - ' + str(data)}")

if not token:
    print("Cannot proceed without auth token")
    exit(1)

headers = {'Authorization': f'Bearer {token}'}

# 2. Test automation stats
print("\n=== 2. GET /api/automation/stats ===")
r = requests.get(f'{BASE}/automation/stats', headers=headers)
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    print(f"  Data: {r.json()}")
else:
    print(f"  Error: {r.text[:200]}")

# 3. Test monthly deliverables 
print("\n=== 3. GET /api/automation/monthly-deliverables?month=2&year=2026 ===")
r = requests.get(f'{BASE}/automation/monthly-deliverables?month=2&year=2026', headers=headers)
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    items = r.json()
    print(f"  Count: {len(items)} deliverables")
    for item in items[:3]:
        print(f"    {item['client_name']} | {item['activity_type_name']} | target={item['monthly_target']}")
else:
    print(f"  Error: {r.text[:200]}")

# 4. Test employee availability
print("\n=== 4. GET /api/automation/employee-availability ===")
r = requests.get(f'{BASE}/automation/employee-availability', headers=headers)
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    emps = r.json()
    print(f"  Count: {len(emps)} employees")
    for e in emps[:3]:
        print(f"    {e.get('employee_name')} | avail={e.get('available_minutes')}m used={e.get('used_minutes')}m")
else:
    print(f"  Error: {r.text[:200]}")

# 5. Generate tasks for today
print("\n=== 5. POST /api/automation/generate-tasks ===")
import datetime
today = datetime.date.today().isoformat()
r = requests.post(f'{BASE}/automation/generate-tasks', 
                  json={'date': today}, headers=headers)
print(f"  Status: {r.status_code}")
print(f"  Response: {r.json()}")

# 6. Get today's tasks
print("\n=== 6. GET /api/automation/tasks?date=today ===")
r = requests.get(f'{BASE}/automation/tasks?date={today}', headers=headers)
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    tasks = r.json()
    print(f"  Tasks generated: {len(tasks)}")
    for t in tasks[:5]:
        print(f"    [{t['priority']}] {t['activity_code']} | {t['client_name']} | {t['activity_type_name']} | assigned={t['assigned_employee_name']}")
else:
    print(f"  Error: {r.text[:200]}")

print("\n✅ API test complete!")
