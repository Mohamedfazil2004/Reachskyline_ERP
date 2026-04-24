from app.extensions import db
from datetime import datetime

class MonthlyPlan(db.Model):
    __tablename__ = 'monthly_plans'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id'), nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1-12
    year = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    deliverables = db.relationship('Deliverable', backref='plan', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'month': self.month,
            'year': self.year,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Deliverable(db.Model):
    __tablename__ = 'deliverables'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activity_code = db.Column(db.String(50), unique=True, nullable=False) # e.g. 2024-02-C001-P-01
    plan_id = db.Column(db.Integer, db.ForeignKey('monthly_plans.id'), nullable=False)
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id'), nullable=False)
    activity_type_id = db.Column(db.Integer, db.ForeignKey('activity_types.id'), nullable=False)
    
    # Workflow Details
    planned_date = db.Column(db.Date)
    rough_cut_link = db.Column(db.String(500))
    content_draft = db.Column(db.Text)
    thumbnail_concept = db.Column(db.Text)
    description = db.Column(db.Text)
    title = db.Column(db.String(200))
    reference_link = db.Column(db.String(500))
    final_output_link = db.Column(db.String(500))
    
    # Status Management
    # Statuses: Pending, Drafted, Rough Cut Uploaded, QC Approved, Client Approved, Scheduled, Posted
    status = db.Column(db.String(50), default='Pending')
    qc_approved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    qc_approved_at = db.Column(db.DateTime)
    creative_approved_by_client = db.Column(db.Boolean, default=False)
    
    # Platform Posting Status (Step 9)
    posted_instagram = db.Column(db.String(20), default='Not Posted') # Not Posted, Scheduled, Posted
    posted_facebook = db.Column(db.String(20), default='Not Posted')
    posted_youtube = db.Column(db.String(20), default='Not Posted')
    posted_twitter = db.Column(db.String(20), default='Not Posted')
    posted_linkedin = db.Column(db.String(20), default='Not Posted')
    posted_whatsapp = db.Column(db.String(20), default='Not Posted')

    time_spent_minutes = db.Column(db.Integer, default=0)
    assigned_writer_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    assigned_editor_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'activity_code': self.activity_code,
            'plan_id': self.plan_id,
            'client_id': self.client_id,
            'activity_type_id': self.activity_type_id,
            'planned_date': self.planned_date.isoformat() if self.planned_date else None,
            'rough_cut_link': self.rough_cut_link,
            'content_draft': self.content_draft,
            'thumbnail_concept': self.thumbnail_concept,
            'description': self.description,
            'title': self.title,
            'reference_link': self.reference_link,
            'final_output_link': self.final_output_link,
            'status': self.status,
            'creative_approved_by_client': self.creative_approved_by_client,
            'posting_status': {
                'instagram': self.posted_instagram,
                'facebook': self.posted_facebook,
                'youtube': self.posted_youtube,
                'twitter': self.posted_twitter,
                'linkedin': self.posted_linkedin,
                'whatsapp': self.posted_whatsapp
            },
            'time_spent': self.time_spent_minutes,
            'assigned_writer': self.assigned_writer_id,
            'assigned_editor': self.assigned_editor_id
        }

class JobWork(db.Model):
    __tablename__ = 'job_works'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activity_code = db.Column(db.String(50), unique=True, nullable=False)
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    deadline = db.Column(db.DateTime)
    time_spent_minutes = db.Column(db.Integer, default=0)
    file_link = db.Column(db.String(500))
    status = db.Column(db.String(50), default='In Progress') # In Progress, Completed, Delivered
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'activity_code': self.activity_code,
            'client_id': self.client_id,
            'description': self.description,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'time_spent': self.time_spent_minutes,
            'file_link': self.file_link,
            'status': self.status
        }

class Shoot(db.Model):
    __tablename__ = 'shoots'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    video_title = db.Column(db.String(255), nullable=False)
    client_id = db.Column(db.String(20), db.ForeignKey('clients.id'), nullable=False)
    content_type = db.Column(db.String(100))
    footage_link = db.Column(db.String(500))
    reference_link = db.Column(db.String(500))
    shoot_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'video_title': self.video_title,
            'client_id': self.client_id,
            'content_type': self.content_type,
            'footage_link': self.footage_link,
            'reference_link': self.reference_link,
            'shoot_date': self.shoot_date.isoformat() if self.shoot_date else None
        }
