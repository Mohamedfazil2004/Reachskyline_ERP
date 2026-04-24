from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Update letters
    db.session.execute(text("UPDATE activity_types SET code_letter='YTS' WHERE name LIKE '%YouTube Shorts / Flyer%'"))
    db.session.execute(text("UPDATE activity_types SET code_letter='YT' WHERE name LIKE '%Long Form / YouTube Long%'"))
    
    # Optional: Delete existing tasks so they can be regenerated with correct codes
    db.session.execute(text("DELETE FROM automation_tasks"))
    db.session.execute(text("UPDATE employee_daily_minutes SET used_minutes=0"))
    db.session.execute(text("UPDATE monthly_deliverables SET completed_count=0"))
    
    db.session.commit()
    print('Updated activity type letters and cleared existing tasks for fresh generation.')
