from app.extensions import db
from datetime import datetime

class Client(db.Model):
    __tablename__ = 'clients'

    id = db.Column(db.String(20), primary_key=True)  # e.g. CLT001
    name = db.Column(db.String(150), nullable=False)
    industry = db.Column(db.String(100))
    contact_person = db.Column(db.String(100))
    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    monthly_plans = db.relationship('MonthlyPlan', backref='client', lazy=True, cascade='all, delete-orphan')
    job_works = db.relationship('JobWork', backref='client', lazy=True, cascade='all, delete-orphan')
    shoots = db.relationship('Shoot', backref='client', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'industry': self.industry,
            'contact_person': self.contact_person,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ActivityType(db.Model):
    __tablename__ = 'activity_types'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    code_id = db.Column(db.String(10), unique=True)   # AT001, AT002 etc
    name = db.Column(db.String(100), nullable=False)  # Post, Animated Reel, etc.
    code_letter = db.Column(db.String(5), default='X')  # P, R, B, C, S, L, A
    writer_minutes = db.Column(db.Integer, default=10)   # Time in minutes
    editor_minutes = db.Column(db.Integer, default=15)   # Time for editor stage
    duration_minutes = db.Column(db.Integer, default=10) # Legacy / default
    description = db.Column(db.String(200))

    def to_dict(self):
        return {
            'id': self.id,
            'code_id': self.code_id,
            'name': self.name,
            'code_letter': self.code_letter,
            'writer_minutes': self.writer_minutes,
            'editor_minutes': self.editor_minutes,
            'duration_minutes': self.duration_minutes,
            'description': self.description
        }

class SystemSetting(db.Model):
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255))

    def to_dict(self):
        return {
            'key': self.key,
            'value': self.value,
            'description': self.description
        }
