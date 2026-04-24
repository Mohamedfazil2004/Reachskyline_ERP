from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        activity_data = [
            ('AT001', 'Poster', 5),
            ('AT002', 'Reel', 15),
            ('AT003', 'Carosel', 15),
            ('AT004', 'Shorts and Blogs', 20),
            ('AT005', 'Longform', 40),
            ('AT006', 'Event Day', 60),
            ('AT007', 'Blog', 20),
            ('AT008', 'Ad Shorts', 15)
        ]
        
        for code, name, duration in activity_data:
            conn.execute(text("""
                INSERT INTO activity_types (code_id, name, duration_minutes) 
                VALUES (:code, :name, :duration)
                ON DUPLICATE KEY UPDATE name=:name, duration_minutes=:duration
            """), {"code": code, "name": name, "duration": duration})
        
        # System Settings including Individual Employee Capacities
        settings = [
            ('capacity_E006', '480', 'Sri daily minutes'),
            ('capacity_E007', '240', 'Abirami daily minutes'),
            ('admin_email', 'fazilmohamed2004@gmail.com', 'Email for notifications')
        ]
        
        for k, v, d in settings:
            conn.execute(text("""
                INSERT INTO system_settings (`key`, `value`, description) 
                VALUES (:k, :v, :d)
                ON DUPLICATE KEY UPDATE `value`=:v, description=:d
            """), {"k": k, "v": v, "d": d})
            
        conn.commit()
    print("Raw SQL seeding successful!")
