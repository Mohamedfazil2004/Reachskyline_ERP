"""Direct SQL seeder - bypasses ORM relationship issues"""
from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():

    # ─── 1. Clients ─────────────────────────────────────────
    print("=== Seeding Clients ===")
    clients = [
        ("C001","Reach Skyline"),("C002","D-Medva"),("C003","Gem Hospital Chennai"),
        ("C004","Dr Senthilnathan"),("C005","Supreme Speciality Hospital"),("C006","Spahi"),
        ("C007","Sooriya Hospital"),("C008","Cubewire"),("C009","Madras Coffee House"),
        ("C010","Healing Earth Ayurveda Hospital"),("C011","Ramnath Bhagavath"),("C012","TPPA"),
        ("C013","Brigantine"),("C014","King Sessing Ice Cream"),("C015","Universe Book of World Records"),
        ("C016","Tamilnad Mercantile Bank"),("C017","Hercyclopedia"),("C018","Eye Foundation"),
        ("C019","Zohaan"),("C020","TATA Motors"),("C021","Aradhan Hall"),
        ("C022","MSPVL Polytechnic College"),("C023","Mainigar Media"),("C024","KOKO Fresh"),
        ("C025","Vee Shapes Designers"),("C026","IBrand Events"),("C027","Zing International School"),
        ("C028","Bixie"),("C029","NSS"),("C030","PowerMax Tyre"),
        ("C031","SCSVMV University"),("C032","GM Hospital"),("C033","RK Grande"),
    ]
    for cid, cname in clients:
        db.session.execute(text(
            "INSERT INTO clients (id, name, is_active) VALUES (:id, :name, 1) "
            "ON DUPLICATE KEY UPDATE name=:name"
        ), {"id": cid, "name": cname})
    db.session.commit()
    print(f"  ✓ {len(clients)} clients seeded")

    # ─── 2. Activity Types ───────────────────────────────────
    print("\n=== Seeding Activity Types ===")
    activity_types = [
        ("AT001","Post","P",5,15),
        ("AT002","Animated Reel / Card Design","R",10,25),
        ("AT003","Carousel","C",10,25),
        ("AT004","YouTube Shorts / Flyer","YTS",20,60),
        ("AT005","Long Form / YouTube Long","YT",40,90),
        ("AT007","Blog & GMB","B",20,15),
        ("AT008","Ad Shorts","A",10,90),
    ]
    for code_id, name, code_letter, writer_mins, editor_mins in activity_types:
        db.session.execute(text(
            "INSERT INTO activity_types (code_id, name, code_letter, writer_minutes, editor_minutes, duration_minutes) "
            "VALUES (:code_id, :name, :code_letter, :wm, :em, :wm) "
            "ON DUPLICATE KEY UPDATE name=:name, code_letter=:code_letter, writer_minutes=:wm, editor_minutes=:em"
        ), {"code_id": code_id, "name": name, "code_letter": code_letter, "wm": writer_mins, "em": editor_mins})
    db.session.commit()
    print(f"  ✓ {len(activity_types)} activity types seeded")

    # ─── 3. Employees ───────────────────────────────────────
    print("\n=== Seeding Employees ===")
    from werkzeug.security import generate_password_hash

    employees = [
        ("E001","Rishinesh",      "rishinesh@sky.com",  "Editor",         0, 1),
        ("E002","Rajaguru",       "rajaguru@sky.com",   "Editor",         0, 1),
        ("E003","Visalam",        "visalam@sky.com",    "Editor",         0, 1),
        ("E004","Kesavan",        "kesavan@sky.com",    "Editor",         0, 1),
        ("E006","Sri Kunjaravalli","sri@sky.com",       "Content Writer", 1, 0),
        ("E007","Abirami",        "abirami@sky.com",    "Content Writer", 1, 0),
    ]
    pwd_hash = generate_password_hash("pass123")
    for eid, ename, email, role, is_writer, is_editor in employees:
        # Check if exists
        existing = db.session.execute(text("SELECT id FROM users WHERE employee_id=:eid"), {"eid": eid}).fetchone()
        if not existing:
            by_email = db.session.execute(text("SELECT id FROM users WHERE email=:email"), {"email": email}).fetchone()
            if by_email:
                db.session.execute(text(
                    "UPDATE users SET employee_id=:eid, role=:role, is_content_writer=:iw, is_video_editor=:ie WHERE email=:email"
                ), {"eid": eid, "role": role, "iw": is_writer, "ie": is_editor, "email": email})
                print(f"  ~ {eid}: linked to existing user")
            else:
                db.session.execute(text(
                    "INSERT INTO users (name, email, password_hash, role, employee_id, is_content_writer, is_video_editor, is_active) "
                    "VALUES (:name, :email, :pwd, :role, :eid, :iw, :ie, 1)"
                ), {"name": ename, "email": email, "pwd": pwd_hash, "role": role, "eid": eid, "iw": is_writer, "ie": is_editor})
                print(f"  + {eid}: {ename} ({role})")
        else:
            db.session.execute(text(
                "UPDATE users SET name=:name, role=:role, is_content_writer=:iw, is_video_editor=:ie WHERE employee_id=:eid"
            ), {"name": ename, "role": role, "iw": is_writer, "ie": is_editor, "eid": eid})
            print(f"  ~ {eid}: {ename} updated")
    db.session.commit()
    print("  ✓ Employees seeded")

    # ─── 4. Monthly Deliverables ────────────────────────────
    print("\n=== Seeding Monthly Deliverables ===")
    # Get activity type IDs
    at_map = {}
    rows = db.session.execute(text("SELECT id, code_id FROM activity_types")).fetchall()
    for row in rows:
        at_map[row[1]] = row[0]

    deliverables = [
        ("C005","AT004",2,2026,8), ("C005","AT001",2,2026,10), ("C005","AT002",2,2026,10), ("C005","AT005",2,2026,4),
        ("C003","AT004",2,2026,5), ("C003","AT001",2,2026,5),  ("C003","AT002",2,2026,5),  ("C003","AT005",2,2026,5),
        ("C004","AT004",2,2026,5), ("C004","AT005",2,2026,2),
        ("C009","AT004",2,2026,8), ("C009","AT001",2,2026,5),  ("C009","AT002",2,2026,8),
        ("C001","AT004",2,2026,31),
        ("C011","AT004",2,2026,8),
        ("C013","AT001",2,2026,5),
        ("C006","AT001",2,2026,10), ("C006","AT002",2,2026,10),
        ("C022","AT004",2,2026,10), ("C022","AT001",2,2026,8), ("C022","AT002",2,2026,6), ("C022","AT005",2,2026,4),
        ("C031","AT004",2,2026,8), ("C031","AT001",2,2026,10), ("C031","AT002",2,2026,10), ("C031","AT005",2,2026,2),
    ]
    count = 0
    for cid, at_code, month, year, target in deliverables:
        at_id = at_map.get(at_code)
        if not at_id:
            print(f"  ⚠ {at_code} not found, skip")
            continue
        db.session.execute(text(
            "INSERT INTO monthly_deliverables (client_id, activity_type_id, month, year, monthly_target, completed_count) "
            "VALUES (:cid, :atid, :month, :year, :target, 0) "
            "ON DUPLICATE KEY UPDATE monthly_target=:target"
        ), {"cid": cid, "atid": at_id, "month": month, "year": year, "target": target})
        count += 1
    db.session.commit()
    print(f"  ✓ {count} monthly deliverables seeded")

    print("\n✅ ALL DONE! Database is ready.")
    print("\nVerification:")
    print("  Clients:", db.session.execute(text("SELECT COUNT(*) FROM clients")).scalar())
    print("  Activity Types:", db.session.execute(text("SELECT COUNT(*) FROM activity_types")).scalar())
    print("  Users:", db.session.execute(text("SELECT COUNT(*) FROM users")).scalar())
    print("  Monthly Deliverables:", db.session.execute(text("SELECT COUNT(*) FROM monthly_deliverables")).scalar())
