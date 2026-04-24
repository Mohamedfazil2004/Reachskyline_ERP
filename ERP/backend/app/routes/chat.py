import os
import json
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
from app.extensions import db
from app.models.user import User
from app.models.chat import ChatMessage, ChatGroup, ChatGroupMember, ChatGroupMessage

chat_bp = Blueprint('chat', __name__)

CHAT_UPLOAD_FOLDER = 'uploads/chat'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'rtf', 'mp4', 'mov', 'avi',
                      'mkv', 'webm', 'png', 'jpg', 'jpeg', 'gif', 'webp',
                      'ogg', 'opus', 'mp3', 'wav', 'm4a'}  # audio for voice notes

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ─────────────────────────────────────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────────────────────────────────────

@chat_bp.route('/users', methods=['GET'])
@jwt_required()
def get_chat_users():
    current_user_id = int(get_jwt_identity())
    # Exclude Mounish (role=Admin with name Mounish) and the current user
    users = User.query.filter(
        User.id != current_user_id,
        User.is_active == True,
        User.name != 'Mounish'
    ).all()
    return jsonify([{
        'id': u.id,
        'name': 'Branch Manager' if u.name == 'System Admin' else u.name,
        'role': u.role,
        'email': u.email
    } for u in users]), 200

# ─────────────────────────────────────────────────────────────────────────────
# DIRECT MESSAGES
# ─────────────────────────────────────────────────────────────────────────────

@chat_bp.route('/messages/<int:receiver_id>', methods=['GET'])
@jwt_required()
def get_messages(receiver_id):
    sender_id = int(get_jwt_identity())
    messages = ChatMessage.query.filter(
        db.or_(
            db.and_(ChatMessage.sender_id == sender_id, ChatMessage.receiver_id == receiver_id),
            db.and_(ChatMessage.sender_id == receiver_id, ChatMessage.receiver_id == sender_id)
        )
    ).order_by(ChatMessage.created_at.asc()).all()

    # Mark incoming as read
    unread = ChatMessage.query.filter_by(sender_id=receiver_id, receiver_id=sender_id, is_read=False).all()
    for m in unread:
        m.is_read = True
    db.session.commit()

    return jsonify([m.to_dict() for m in messages]), 200

@chat_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    sender_id = int(get_jwt_identity())
    data = request.json
    receiver_id = data.get('receiver_id')
    message_text = data.get('message')
    attachment_path = data.get('attachment_path')
    attachment_type = data.get('attachment_type')

    if not receiver_id:
        return jsonify({'error': 'Receiver required'}), 400
    if not message_text and not attachment_path:
        return jsonify({'error': 'Empty message'}), 400

    msg = ChatMessage(
        sender_id=sender_id,
        receiver_id=receiver_id,
        message=message_text,
        attachment_path=attachment_path,
        attachment_type=attachment_type
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201

# React to a DM
@chat_bp.route('/messages/<int:msg_id>/react', methods=['POST'])
@jwt_required()
def react_dm(msg_id):
    user_id = int(get_jwt_identity())
    data = request.json or {}
    emoji = data.get('emoji')
    if not emoji:
        return jsonify({'error': 'emoji required'}), 400

    msg = ChatMessage.query.get_or_404(msg_id)
    reactions = json.loads(msg.reactions) if msg.reactions else {}

    if emoji not in reactions:
        reactions[emoji] = []
    if user_id in reactions[emoji]:
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        reactions[emoji].append(user_id)

    msg.reactions = json.dumps(reactions)
    db.session.commit()
    return jsonify(msg.to_dict()), 200

# ─────────────────────────────────────────────────────────────────────────────
# UNREAD COUNTS
# ─────────────────────────────────────────────────────────────────────────────

@chat_bp.route('/unread-counts', methods=['GET'])
@jwt_required()
def get_unread_counts():
    current_user_id = int(get_jwt_identity())
    unread_msgs = ChatMessage.query.filter_by(receiver_id=current_user_id, is_read=False).all()
    total_unread = len(unread_msgs)
    by_sender = {}
    for m in unread_msgs:
        sid = str(m.sender_id)
        by_sender[sid] = by_sender.get(sid, 0) + 1

    # Also count group unread (simple: messages in last hour not from current user)
    return jsonify({'total_unread': total_unread, 'by_sender': by_sender}), 200

# ─────────────────────────────────────────────────────────────────────────────
# FILE UPLOAD
# ─────────────────────────────────────────────────────────────────────────────

@chat_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_chat_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        path = os.path.join(current_app.root_path, '..', CHAT_UPLOAD_FOLDER)
        if not os.path.exists(path):
            os.makedirs(path)
        unique_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
        file_path = os.path.join(path, unique_name)
        file.save(file_path)
        return jsonify({
            'file_path': os.path.join(CHAT_UPLOAD_FOLDER, unique_name).replace('\\', '/'),
            'filename': filename
        }), 200
    return jsonify({'error': 'File type not allowed'}), 400

# ─────────────────────────────────────────────────────────────────────────────
# GROUP CHATS
# ─────────────────────────────────────────────────────────────────────────────

@chat_bp.route('/groups', methods=['GET'])
@jwt_required()
def get_groups():
    user_id = int(get_jwt_identity())
    memberships = ChatGroupMember.query.filter_by(user_id=user_id).all()
    group_ids = [m.group_id for m in memberships]
    groups = ChatGroup.query.filter(ChatGroup.id.in_(group_ids)).all()
    return jsonify([g.to_dict() for g in groups]), 200

@chat_bp.route('/groups/<int:group_id>/messages', methods=['GET'])
@jwt_required()
def get_group_messages(group_id):
    user_id = int(get_jwt_identity())
    # Verify membership
    mem = ChatGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not mem:
        return jsonify({'error': 'Not a member'}), 403

    msgs = ChatGroupMessage.query.filter_by(group_id=group_id)\
        .order_by(ChatGroupMessage.created_at.asc()).all()
    return jsonify([m.to_dict() for m in msgs]), 200

@chat_bp.route('/groups/<int:group_id>/messages', methods=['POST'])
@jwt_required()
def send_group_message(group_id):
    user_id = int(get_jwt_identity())
    mem = ChatGroupMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not mem:
        return jsonify({'error': 'Not a member'}), 403

    data = request.json or {}
    msg = ChatGroupMessage(
        group_id=group_id,
        sender_id=user_id,
        message=data.get('message'),
        attachment_path=data.get('attachment_path'),
        attachment_type=data.get('attachment_type')
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify(msg.to_dict()), 201

@chat_bp.route('/groups/<int:group_id>/messages/<int:msg_id>/react', methods=['POST'])
@jwt_required()
def react_group(group_id, msg_id):
    user_id = int(get_jwt_identity())
    data = request.json or {}
    emoji = data.get('emoji')
    if not emoji:
        return jsonify({'error': 'emoji required'}), 400

    msg = ChatGroupMessage.query.get_or_404(msg_id)
    reactions = json.loads(msg.reactions) if msg.reactions else {}

    if emoji not in reactions:
        reactions[emoji] = []
    if user_id in reactions[emoji]:
        reactions[emoji].remove(user_id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        reactions[emoji].append(user_id)

    msg.reactions = json.dumps(reactions)
    db.session.commit()
    return jsonify(msg.to_dict()), 200
