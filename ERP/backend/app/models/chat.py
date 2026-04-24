from app.extensions import db
from datetime import datetime

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=True)
    attachment_path = db.Column(db.String(500), nullable=True)
    attachment_type = db.Column(db.String(50), nullable=True)  # image, video, document, voice
    is_read = db.Column(db.Boolean, default=False)
    reactions = db.Column(db.Text, nullable=True)  # JSON string: {"❤️": [user_id,...]}
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_messages', lazy=True))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('received_messages', lazy=True))

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else 'Unknown',
            'sender_role': self.sender.role if self.sender else 'User',
            'receiver_id': self.receiver_id,
            'receiver_name': self.receiver.name if self.receiver else 'Unknown',
            'message': self.message,
            'attachment_path': self.attachment_path,
            'attachment_type': self.attachment_type,
            'is_read': self.is_read,
            'reactions': json.loads(self.reactions) if self.reactions else {},
            'created_at': self.created_at.isoformat()
        }


class ChatGroup(db.Model):
    __tablename__ = 'chat_groups'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    icon = db.Column(db.String(10), default='👥')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    members = db.relationship('ChatGroupMember', backref='group', lazy=True, cascade='all, delete-orphan')
    messages = db.relationship('ChatGroupMessage', backref='group', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        members_info = []
        for m in self.members:
            u = m.user
            if u:
                members_info.append({
                    'id': u.id,
                    'name': 'Branch Manager' if u.name == 'System Admin' else u.name,
                    'role': u.role,
                    'is_admin': m.is_admin
                })
        return {
            'id': self.id,
            'name': self.name,
            'icon': self.icon,
            'member_ids': [m.user_id for m in self.members],
            'members': members_info,
            'created_at': self.created_at.isoformat()
        }


class ChatGroupMember(db.Model):
    __tablename__ = 'chat_group_members'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('chat_groups.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)

    user = db.relationship('User', foreign_keys=[user_id], lazy=True)


class ChatGroupMessage(db.Model):
    __tablename__ = 'chat_group_messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('chat_groups.id', ondelete='CASCADE'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=True)
    attachment_path = db.Column(db.String(500), nullable=True)
    attachment_type = db.Column(db.String(50), nullable=True)
    reactions = db.Column(db.Text, nullable=True)  # JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship('User', foreign_keys=[sender_id])

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'group_id': self.group_id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else 'Unknown',
            'sender_role': self.sender.role if self.sender else '',
            'message': self.message,
            'attachment_path': self.attachment_path,
            'attachment_type': self.attachment_type,
            'reactions': json.loads(self.reactions) if self.reactions else {},
            'created_at': self.created_at.isoformat()
        }
