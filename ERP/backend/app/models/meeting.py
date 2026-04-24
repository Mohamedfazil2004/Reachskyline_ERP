from app.extensions import db
from datetime import datetime
import string
import random

def generate_meeting_id():
    # Generate like xxx-xxxx-xxx
    def rnd(n): return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))
    return f"{rnd(3)}-{rnd(4)}-{rnd(3)}"

class Meeting(db.Model):
    __tablename__ = 'meetings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer, nullable=True) # in mins
    
    meeting_id = db.Column(db.String(50), unique=True, nullable=False, default=generate_meeting_id)
    password = db.Column(db.String(100), nullable=True)
    
    waiting_room = db.Column(db.Boolean, default=False)
    recording_enabled = db.Column(db.Boolean, default=False)
    
    status = db.Column(db.String(50), default='Scheduled') # Scheduled, Active, Completed, Cancelled
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    host = db.relationship('User', foreign_keys=[host_id])
    participants = db.relationship('MeetingParticipant', backref='meeting', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'host_id': self.host_id,
            'host_name': self.host.name if self.host else 'Unknown',
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration': self.duration,
            'meeting_id': self.meeting_id,
            'password': self.password,
            'waiting_room': self.waiting_room,
            'recording_enabled': self.recording_enabled,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'participants': [p.user_id for p in self.participants],
            'external_emails': [p.email for p in self.participants if p.is_external]
        }

class MeetingParticipant(db.Model):
    __tablename__ = 'meeting_participants'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id', ondelete='CASCADE'), nullable=False)
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    is_external = db.Column(db.Boolean, default=False)
    email = db.Column(db.String(255), nullable=True)

class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    
    color = db.Column(db.String(20), default='#4f46e5')
    is_all_day = db.Column(db.Boolean, default=False)
    
    type = db.Column(db.String(50), default='Personal') # Personal, Team, Meeting
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id', ondelete='CASCADE'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'color': self.color,
            'is_all_day': self.is_all_day,
            'type': self.type,
            'meeting_id': self.meeting_id,
            'created_at': self.created_at.isoformat()
        }
