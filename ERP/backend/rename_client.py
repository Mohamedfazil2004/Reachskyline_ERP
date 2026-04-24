from app import create_app
from app.extensions import db
from app.models.master import Client
from app.models.automation import AutomationTask, AutomationJobWork, MonthlyDeliverable

app = create_app()
with app.app_context():
    # 1. Find the client
    old_name = "GM Hospital"
    new_name = "Gem Hospital"
    new_id = "C003"
    
    client = Client.query.filter(Client.name.ilike(f"%{old_name}%")).first()
    if not client:
        print(f"Client with name containing '{old_name}' not found.")
        # Try to find by ID if name search fails
        client = Client.query.get("CLT003") # Based on previous context maybe?
        if not client:
            # Let's list all clients to be sure
            all_clients = Client.query.all()
            print("Current clients in DB:")
            for c in all_clients:
                print(f"ID: {c.id}, Name: {c.name}")
            exit()

    old_id = client.id
    print(f"Updating Client: {client.name} ({old_id}) -> {new_name} ({new_id})")

    # 2. Update the Client record
    # Since ID is primary key, we might need a more careful update if there are FK constraints
    # Usually better to create new and re-link or just update if no strict FK blocking.
    # But SQLite/SQLAlchemy might handle it if we update the object.
    
    # We'll update the name first
    client.name = new_name
    
    # If we need to change the ID, we must update all references
    if old_id != new_id:
        # Check if C003 already exists
        existing = Client.query.get(new_id)
        if existing:
            print(f"Warning: Client {new_id} already exists. Merging records.")
            # Move all references from old_id to new_id
            AutomationTask.query.filter_by(client_id=old_id).update({AutomationTask.client_id: new_id})
            AutomationJobWork.query.filter_by(client_id=old_id).update({AutomationJobWork.client_id: new_id})
            MonthlyDeliverable.query.filter_by(client_id=old_id).update({MonthlyDeliverable.client_id: new_id})
            db.session.delete(client)
        else:
            # Update ID (this might fail if FKs are validated immediately, but usually works in transactions)
            # Better to update references first
            AutomationTask.query.filter_by(client_id=old_id).update({AutomationTask.client_id: new_id})
            AutomationJobWork.query.filter_by(client_id=old_id).update({AutomationJobWork.client_id: new_id})
            MonthlyDeliverable.query.filter_by(client_id=old_id).update({MonthlyDeliverable.client_id: new_id})
            client.id = new_id
    
    db.session.flush()

    # 3. Update Activity Codes in Taskboard
    # Format: [Year][Month][ClientDigit][TypeCode][Count]
    # For Gem Hospital (C003), ClientDigit is '3'
    tasks = AutomationTask.query.filter_by(client_id=new_id).all()
    print(f"Updating codes for {len(tasks)} tasks...")
    
    from app.routes.automation import generate_activity_code
    
    # We'll need a way to preserve the original sequence if possible, 
    # but the simplest is to re-generate based on their current count position.
    # However, to be safe and "update wherever display", we'll just re-calc codes.
    
    # Group by month/year to maintain correct count
    month_groups = {}
    for t in tasks:
        key = (t.year, t.month)
        if key not in month_groups: month_groups[key] = []
        month_groups[key].append(t)
        
    for key, group in month_groups.items():
        # Sort by creation or id to keep original order if possible
        group.sort(key=lambda x: x.id)
        for i, t in enumerate(group, 1):
            is_jw = (t.source == 'job_work')
            new_code = generate_activity_code(new_id, t.activity_type_id, t.year, t.month, is_job_work=is_jw, seq=i)
            print(f"  {t.activity_code} -> {new_code}")
            t.activity_code = new_code

    db.session.commit()
    print("Update successful.")
