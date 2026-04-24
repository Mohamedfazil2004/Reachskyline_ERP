from app import create_app
from app.extensions import db
from app.models.master import ActivityType, SystemSetting

app = create_app()
with app.app_context():
    # Clear and re-seed
    # ActivityType.query.delete() 
    # SystemSetting.query.delete()
    
    activity_data = [
        {'code_id': 'AT001', 'name': 'Post', 'duration_minutes': 5},
        {'code_id': 'AT002', 'name': 'Animated Reel, Card design', 'duration_minutes': 10},
        {'code_id': 'AT003', 'name': 'Carousel', 'duration_minutes': 10},
        {'code_id': 'AT004', 'name': 'Shorts, Flyer, Banner', 'duration_minutes': 20},
        {'code_id': 'AT005', 'name': 'Long Forms Brochure', 'duration_minutes': 40},
        {'code_id': 'AT007', 'name': 'Blog & GMB', 'duration_minutes': 20},
        {'code_id': 'AT008', 'name': 'Ad Shorts', 'duration_minutes': 10}
    ]
    
    for d in activity_data:
        at = ActivityType.query.filter_by(code_id=d['code_id']).first()
        if not at:
            at = ActivityType(code_id=d['code_id'], name=d['name'], duration_minutes=d['duration_minutes'])
            db.session.add(at)
        else:
            at.name = d['name']
            at.duration_minutes = d['duration_minutes']
            
    # System Settings
    settings = [
        {'key': 'daily_working_minutes', 'value': '480', 'description': 'Total minutes an employee works per day'},
        {'key': 'admin_email', 'value': 'fazilmohamed2004@gmail.com', 'description': 'Email for notifications'}
    ]
    
    for s in settings:
        setting = SystemSetting.query.filter_by(key=s['key']).first()
        if not setting:
            setting = SystemSetting(**s)
            db.session.add(setting)
        else:
            setting.value = s['value']
            
    db.session.commit()
    print("Seeding successful!")
