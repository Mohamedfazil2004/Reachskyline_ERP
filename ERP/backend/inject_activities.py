from app import create_app
from app.extensions import db
from app.models.master import ActivityType

app = create_app()
with app.app_context():
    data = [
        {"code_id": "AT001", "name": "Poster", "code_letter": "P", "activity_time": 5, "editor_minutes": 15},
        {"code_id": "AT002", "name": "Animated reel", "code_letter": "R", "activity_time": 10, "editor_minutes": 25},
        {"code_id": "AT003", "name": "Carousel", "code_letter": "C", "activity_time": 10, "editor_minutes": 25},
        {"code_id": "AT004", "name": "Shorts", "code_letter": "YTS", "activity_time": 20, "editor_minutes": 60},
        {"code_id": "AT005", "name": "Long form", "code_letter": "YT", "activity_time": 40, "editor_minutes": 90},
    ]
    
    for item in data:
        at = ActivityType.query.filter_by(code_id=item["code_id"]).first()
        if at:
            at.name = item["name"]
            at.code_letter = item["code_letter"]
            at.activity_time = item["activity_time"]
            at.editor_minutes = item["editor_minutes"]
        else:
            at = ActivityType(**item)
            db.session.add(at)
    
    db.session.commit()
    print("Activity types updated successfully (Upserted).")
