from app import create_app
from app.extensions import db
from app.models.automation import AutomationTask
from app.routes.automation import generate_activity_code

app = create_app()
with app.app_context():
    # Update all Job Work tasks to ensure they use 'JW'
    jw_tasks = AutomationTask.query.filter_by(source='job_work').all()
    print(f"Checking {len(jw_tasks)} job work tasks...")
    
    # We should recount them properly to ensure JW1, JW2...
    sequences = {} # key: (client, year, month)
    
    # Sort by creation date to keep order
    jw_tasks.sort(key=lambda x: x.id)
    
    for t in jw_tasks:
        key = (t.client_id, t.year, t.month)
        if key not in sequences: sequences[key] = 0
        sequences[key] += 1
        
        new_code = generate_activity_code(t.client_id, t.activity_type_id, t.year, t.month, is_job_work=True, seq=sequences[key])
        if t.activity_code != new_code:
            print(f"Updating {t.activity_code} -> {new_code}")
            t.activity_code = new_code
            
    db.session.commit()
    print("Job Work codes correction complete.")
