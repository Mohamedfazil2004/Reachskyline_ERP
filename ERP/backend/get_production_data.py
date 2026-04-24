from app import create_app
from app.extensions import db
from app.models.automation import MonthlyDeliverable
from app.models.master import ActivityType
from sqlalchemy import func

app = create_app()
with app.app_context():
    # Get all deliverables for March 2026
    delivs = MonthlyDeliverable.query.filter_by(month=3, year=2026).all()
    
    total_minutes = 0
    breakdown = {}
    
    for d in delivs:
        at = ActivityType.query.get(d.activity_type_id)
        if not at: continue
        
        mins = at.writer_minutes
        count = d.monthly_target
        total_minutes += (mins * count)
        
        if at.name not in breakdown:
            breakdown[at.name] = {'count': 0, 'mins_per': mins}
        breakdown[at.name]['count'] += count

    print("=== PRODUCTION PLANNING DATA ===")
    for name, info in breakdown.items():
        print(f"{name}: {info['count']} tasks @ {info['mins_per']} mins = {info['count'] * info['mins_per']} total mins")
    
    print(f"TOTAL MONTHLY MINUTES: {total_minutes}")
    print(f"TOTAL TASKS: {sum(x['count'] for x in breakdown.values())}")
