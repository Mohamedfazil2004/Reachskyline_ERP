from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    # Roles: Admin, Manager, QC Team, Editor, Content Writer
    role = db.Column(db.String(50), nullable=False, default='Content Writer')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Employee specific fields for Social Media Automation
    employee_id = db.Column(db.String(20), unique=True) # e.g. E001
    efficiency_score = db.Column(db.Integer, default=5) # 1-10
    daily_available_minutes = db.Column(db.Integer, default=480)
    current_workload = db.Column(db.Integer, default=0)
    availability_status = db.Column(db.String(20), default='Available') # Available / Leave
    
    # Skills
    is_video_editor = db.Column(db.Boolean, default=False)
    is_content_writer = db.Column(db.Boolean, default=False)
    is_graphic_designer = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'employee_id': self.employee_id,
            'is_active': self.is_active,
            'efficiency_score': self.efficiency_score,
            'daily_available_minutes': self.daily_available_minutes,
            'current_workload': self.current_workload,
            'availability_status': self.availability_status,
            'skills': {
                'video_editor': self.is_video_editor,
                'content_writer': self.is_content_writer,
                'graphic_designer': self.is_graphic_designer
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
