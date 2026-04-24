from app.extensions import db
from datetime import datetime, date


class WebsiteActivity(db.Model):
    """Master data: Website activities like Page Development, QC, etc."""
    __tablename__ = 'website_activities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activity = db.Column(db.String(100), nullable=False)   # e.g. "Page Development"
    activity_type = db.Column(db.String(150), nullable=False)  # e.g. "Primary Page Build"
    standard_minutes = db.Column(db.Integer, default=30)
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'activity': self.activity,
            'activity_type': self.activity_type,
            'standard_minutes': self.standard_minutes,
            'is_active': self.is_active,
        }


class WebsiteTask(db.Model):
    """A task assigned by Website Head to a Website Employee."""
    __tablename__ = 'website_tasks'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Assignment info
    date = db.Column(db.Date, nullable=False, default=date.today)
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Task details
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id', ondelete='CASCADE'), nullable=True)
    task_description = db.Column(db.Text, nullable=False)
    activity_id = db.Column(db.Integer, db.ForeignKey('website_activities.id'), nullable=True)
    minutes = db.Column(db.Integer, default=30)

    # Submission
    work_link = db.Column(db.Text, nullable=True)

    # Status flow:
    # Pending → In Progress → Completed (by employee)
    # → Approved / Rework (by head)
    status = db.Column(db.String(30), default='Pending')

    # Rework details
    rework_reason = db.Column(db.Text, nullable=True)
    rework_count = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assigner = db.relationship('User', foreign_keys=[assigned_by], backref='website_tasks_assigned')
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref='website_tasks_received')
    client = db.relationship('Client', backref=db.backref('website_tasks', lazy=True, passive_deletes=True))
    activity = db.relationship('WebsiteActivity', backref=db.backref('tasks', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'assigned_by': self.assigned_by,
            'assigner_name': self.assigner.name if self.assigner else None,
            'assigned_to': self.assigned_to,
            'assignee_name': self.assignee.name if self.assignee else None,
            'client_id': self.client_id,
            'client_name': self.client.name if self.client else None,
            'task_description': self.task_description,
            'activity_id': self.activity_id,
            'activity': self.activity.activity if self.activity else None,
            'activity_type': self.activity.activity_type if self.activity else None,
            'minutes': self.minutes,
            'work_link': self.work_link,
            'status': self.status,
            'rework_reason': self.rework_reason,
            'rework_count': self.rework_count or 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
