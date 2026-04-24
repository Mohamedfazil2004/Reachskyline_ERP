from app.extensions import db
from datetime import datetime

class WorkRecord(db.Model):
    __tablename__ = 'work_records'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id'), nullable=True)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    work_description = db.Column(db.Text, nullable=False)
    time_minutes = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='Completed')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Note: User and Client backrefs will be automatically created if needed, 
    # but we can also define them here for clarity if we want.

    def to_dict(self):
        # We'll use a lazy join or similar in the route to get names if needed,
        # or just rely on the existing relationships.
        from app.models.user import User
        from app.models.master import Client
        
        user = User.query.get(self.user_id)
        client = Client.query.get(self.client_id) if self.client_id else None
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': user.name if user else "Unknown",
            'client_id': self.client_id,
            'client_name': client.name if client else "General / Others",
            'date': self.date.isoformat() if self.date else None,
            'work_description': self.work_description,
            'time_minutes': self.time_minutes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
