from app import create_app
from app.models.master import ActivityType

app = create_app()
with app.app_context():
    at_list = [
        ("AT001", "Post", 5, 15),
        ("AT002", "Animated Reel / Card Design", 10, 25),
        ("AT004", "YouTube Shorts / Flyer", 20, 60),
        ("AT005", "Long Form / YouTube Long", 40, 90)
    ]
    
    print("--- Verifying/Updating Activity Minutes ---")
    for code, name, w, e in at_list:
        at = ActivityType.query.filter_by(code_id=code).first()
        if at:
            print(f"Update {code}: W:{w} E:{e}")
            at.writer_minutes = w
            at.editor_minutes = e
        else:
            print(f"Not found: {code}")
    
    from app.extensions import db
    db.session.commit()
    print("DONE")
