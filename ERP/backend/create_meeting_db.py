from app import create_app
from app.extensions import db
from app.models.meeting import Meeting, MeetingParticipant, CalendarEvent

app = create_app()

with app.app_context():
    print("Creating meeting module tables...")
    db.create_all()
    print("Meeting module tables created successfully.")
