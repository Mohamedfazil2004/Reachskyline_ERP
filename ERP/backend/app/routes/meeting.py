from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.meeting import Meeting, MeetingParticipant, CalendarEvent
from app.models.user import User
import string
import random

meeting_bp = Blueprint('meeting', __name__)

def generate_meeting_id():
    def rnd(n): return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))
    return f"{rnd(3)}-{rnd(4)}-{rnd(3)}"

# ─── MEETINGS ─────────────────────────────────────────────────────────────

@meeting_bp.route('', methods=['POST'], strict_slashes=False)
@meeting_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def create_meeting():
    host_id = int(get_jwt_identity())
    data = request.json
    
    start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
    end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
    
    new_meeting = Meeting(
        title=data.get('title', 'Skyline Meeting'),
        description=data.get('description', ''),
        host_id=host_id,
        start_time=start_time,
        end_time=end_time,
        duration=data.get('duration', 60),
        meeting_id=generate_meeting_id(),
        password=data.get('password'),
        waiting_room=data.get('waiting_room', False),
        recording_enabled=data.get('recording_enabled', False),
        status='Scheduled'
    )
    db.session.add(new_meeting)
    db.session.flush() # get id
    
    # Add Host to participants
    db.session.add(MeetingParticipant(meeting_id=new_meeting.id, user_id=host_id))
    
    res_participants = []
    
    for participant_id in data.get('participants', []):
        if participant_id != host_id:
            db.session.add(MeetingParticipant(meeting_id=new_meeting.id, user_id=participant_id))
            res_participants.append(participant_id)
            
    for email in data.get('external_emails', []):
        db.session.add(MeetingParticipant(meeting_id=new_meeting.id, is_external=True, email=email))
        
    db.session.commit()
    return jsonify(new_meeting.to_dict()), 201

@meeting_bp.route('', methods=['GET'], strict_slashes=False)
@meeting_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_meetings():
    user_id = int(get_jwt_identity())
    
    # Participated or Hosted
    meetings = Meeting.query.join(MeetingParticipant).filter(
        (Meeting.host_id == user_id) | (MeetingParticipant.user_id == user_id)
    ).all()
    
    # Distinct
    unique_meetings = {m.id: m for m in meetings}.values()
    return jsonify([m.to_dict() for m in sorted(unique_meetings, key=lambda x: x.start_time, reverse=True)])

@meeting_bp.route('/<int:meeting_id>', methods=['GET'])
@jwt_required()
def get_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    return jsonify(meeting.to_dict())

@meeting_bp.route('/<int:meeting_id>', methods=['DELETE'])
@jwt_required()
def delete_meeting(meeting_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    meeting = Meeting.query.get_or_404(meeting_id)
    
    if meeting.host_id != user_id and user.role != 'Admin':
        return jsonify({'error': 'Unauthorized'}), 403
        
    db.session.delete(meeting)
    db.session.commit()
    return jsonify({'msg': 'Meeting deleted'})

@meeting_bp.route('/room/<string:room_id>', methods=['GET'])
@jwt_required()
def get_meeting_by_room(room_id):
    meeting = Meeting.query.filter_by(meeting_id=room_id).first()
    if not meeting:
        return jsonify({'error': 'Meeting not found'}), 404
        
    return jsonify(meeting.to_dict())

# ─── CALENDAR EVENTS ────────────────────────────────────────────────────────

@meeting_bp.route('/calendar', methods=['POST'])
@jwt_required()
def create_event():
    user_id = int(get_jwt_identity())
    data = request.json
    
    start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
    end_time = datetime.fromisoformat(data.get('end_time', data['start_time']).replace('Z', '+00:00'))
    
    event = CalendarEvent(
        user_id=user_id,
        title=data.get('title'),
        description=data.get('description'),
        start_time=start_time,
        end_time=end_time,
        color=data.get('color', '#4f46e5'),
        is_all_day=data.get('is_all_day', False),
        type=data.get('type', 'Personal')
    )
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict()), 201

@meeting_bp.route('/calendar', methods=['GET'])
@jwt_required()
def get_events():
    user_id = int(get_jwt_identity())
    events = CalendarEvent.query.filter_by(user_id=user_id).all()
    # also include user's meetings as events
    meetings = Meeting.query.join(MeetingParticipant).filter(
        (Meeting.host_id == user_id) | (MeetingParticipant.user_id == user_id)
    ).all()
    
    merged_events = [e.to_dict() for e in events]
    
    # convert meetings to calendar event format
    unique_meetings = {m.id: m for m in meetings}.values()
    for m in unique_meetings:
        merged_events.append({
            'id': f"m_{m.id}",
            'title': m.title,
            'start_time': m.start_time.isoformat() if m.start_time else None,
            'end_time': m.end_time.isoformat() if m.end_time else None,
            'color': '#ef4444', # red for meetings
            'type': 'Meeting',
            'meeting_id': m.meeting_id,
            'description': m.description,
            'is_all_day': False
        })
        
    return jsonify(merged_events)

@meeting_bp.route('/calendar/<int:event_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def modify_event(event_id):
    user_id = int(get_jwt_identity())
    event = CalendarEvent.query.get_or_404(event_id)
    if event.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    if request.method == 'DELETE':
        db.session.delete(event)
        db.session.commit()
        return jsonify({'msg': 'Event deleted'})
        
    data = request.json
    if 'start_time' in data:
        event.start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
    if 'end_time' in data:
        event.end_time = datetime.fromisoformat(data['end_time'].replace('Z', '+00:00'))
    
    db.session.commit()
    return jsonify(event.to_dict())
