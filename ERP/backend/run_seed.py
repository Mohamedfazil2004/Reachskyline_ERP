"""Seed data from Google Sheet"""
from app import create_app
from app.extensions import db
from app.models.master import Client, ActivityType
from app.models.user import User
from app.models.automation import MonthlyDeliverable
from sqlalchemy import text

app = create_app()

CLIENTS = [
    ("C001", "Reach Skyline"),("C002", "D-Medva"),("C003", "Gem Hospital Chennai"),
    ("C004", "Dr Senthilnathan"),("C005", "Supreme Speciality Hospital"),("C006", "Spahi"),
    ("C007", "Sooriya Hospital"),("C008", "Cubewire"),("C009", "Madras Coffee House"),
    ("C010", "Healing Earth Ayurveda Hospital"),("C011", "Ramnath Bhagavath"),("C012", "TPPA"),
    ("C013", "Brigantine"),("C014", "King Sessing Ice Cream"),("C015", "Universe Book of World Records"),
    ("C016", "Tamilnad Mercantile Bank"),("C017", "Hercyclopedia"),("C018", "Eye Foundation"),
    ("C019", "Zohaan"),("C020", "TATA Motors"),("C021", "Aradhan Hall"),
    ("C022", "MSPVL Polytechnic College"),("C023", "Mainigar Media"),("C024", "KOKO Fresh"),
    ("C025", "Vee Shapes Designers"),("C026", "IBrand Events"),("C027", "Zing International School"),
    ("C028", "Bixie"),("C029", "NSS"),("C030", "PowerMax Tyre"),
    ("C031", "SCSVMV University"),("C032", "GM Hospital"),("C033", "RK Grande"),
]

# code_id, name, code_letter, writer_mins, editor_mins
ACTIVITY_TYPES = [
    ("AT001", "Post",                        "P", 5,  15),
    ("AT002", "Animated Reel / Card Design", "R", 10, 25),
    ("AT003", "Carousel",                    "C", 10, 25),
    ("AT004", "YouTube Shorts / Flyer",      "S", 20, 60),
    ("AT005", "Long Form / YouTube Long",    "L", 40, 90),
    ("AT007", "Blog & GMB",                 "B", 20, 15),
    ("AT008", "Ad Shorts",                   "A", 10, 90),
]

EMPLOYEES = [
    ("E001", "Rishinesh",        "rishinesh@sky.com",  "pass123", "Editor",         False, True,  480),
    ("E002", "Rajaguru",         "rajaguru@sky.com",   "pass123", "Editor",         False, True,  480),
    ("E003", "Visalam",          "visalam@sky.com",    "pass123", "Editor",         False, True,  480),
    ("E004", "Kesavan",          "kesavan@sky.com",    "pass123", "Editor",         False, True,  480),
    ("E006", "Sri Kunjaravalli", "sri@sky.com",        "pass123", "Content Writer", True,  False, 480),
    ("E007", "Abirami",          "abirami@sky.com",    "pass123", "Content Writer", True,  False, 240),
]

# (client_id, activity_code_id, month, year, target)
MONTHLY_DELIVERABLES = [
    ("C005","AT004",2,2026,8), ("C005","AT001",2,2026,10), ("C005","AT002",2,2026,10), ("C005","AT005",2,2026,4),
    ("C003","AT004",2,2026,5), ("C003","AT001",2,2026,5),  ("C003","AT002",2,2026,5),  ("C003","AT005",2,2026,5),
    ("C004","AT004",2,2026,5), ("C004","AT005",2,2026,2),
    ("C009","AT004",2,2026,8), ("C009","AT001",2,2026,5),  ("C009","AT002",2,2026,8),
    ("C001","AT004",2,2026,31),
    ("C011","AT004",2,2026,8),
    ("C013","AT001",2,2026,5),
    ("C006","AT001",2,2026,10),("C006","AT002",2,2026,10),
    ("C022","AT004",2,2026,10),("C022","AT001",2,2026,8),  ("C022","AT002",2,2026,6),  ("C022","AT005",2,2026,4),
    ("C031","AT004",2,2026,8), ("C031","AT001",2,2026,10), ("C031","AT002",2,2026,10), ("C031","AT005",2,2026,2),
]

with app.app_context():
    # Fix code_letter column default via UPDATE SQL
    try:
        db.session.execute(text("UPDATE activity_types SET code_letter='X' WHERE code_letter IS NULL"))
        db.session.commit()
    except:
        db.session.rollback()

    print("=== Seeding Clients ===")
    for cid, cname in CLIENTS:
        existing = Client.query.get(cid)
        if not existing:
            c = Client(id=cid, name=cname, is_active=True)
            db.session.add(c)
            print(f"  + {cid}: {cname}")
        else:
            existing.name = cname
    db.session.commit()
    print(f"  ✓ {len(CLIENTS)} clients OK")

    print("\n=== Seeding Activity Types ===")
    for code_id, name, code_letter, writer_mins, editor_mins in ACTIVITY_TYPES:
        at = ActivityType.query.filter_by(code_id=code_id).first()
        if not at:
            at = ActivityType(code_id=code_id, name=name, code_letter=code_letter,
                              writer_minutes=writer_mins, editor_minutes=editor_mins,
                              duration_minutes=writer_mins)
            db.session.add(at)
            print(f"  + {code_id}: {name}")
        else:
            at.name = name
            at.code_letter = code_letter
            at.writer_minutes = writer_mins
            at.editor_minutes = editor_mins
    db.session.commit()
    print(f"  ✓ {len(ACTIVITY_TYPES)} activity types OK")

    print("\n=== Seeding Employees ===")
    for eid, ename, email, pwd, role, is_writer, is_editor, daily_mins in EMPLOYEES:
        u = User.query.filter_by(employee_id=eid).first()
        if not u:
            # check if email exists
            u2 = User.query.filter_by(email=email).first()
            if u2:
                u2.employee_id = eid
                u2.role = role
                u2.is_content_writer = is_writer
                u2.is_video_editor = is_editor
                print(f"  ~ {eid}: linked to existing user {u2.name}")
            else:
                u = User(name=ename, email=email, role=role, employee_id=eid,
                         is_content_writer=is_writer, is_video_editor=is_editor, is_active=True)
                u.set_password(pwd)
                db.session.add(u)
                print(f"  + {eid}: {ename} ({role})")
        else:
            u.name = ename
            u.role = role
            u.is_content_writer = is_writer
            u.is_video_editor = is_editor
            print(f"  ~ {eid}: {ename} (updated)")
    db.session.commit()
    print(f"  ✓ Employees OK")

    print("\n=== Seeding Monthly Deliverables ===")
    count = 0
    for cid, at_code_id, month, year, target in MONTHLY_DELIVERABLES:
        at = ActivityType.query.filter_by(code_id=at_code_id).first()
        client = Client.query.get(cid)
        if not at or not client:
            print(f"  ⚠ Skipping {cid}/{at_code_id} — missing records")
            continue
        md = MonthlyDeliverable.query.filter_by(
            client_id=cid, activity_type_id=at.id, month=month, year=year
        ).first()
        if not md:
            md = MonthlyDeliverable(client_id=cid, activity_type_id=at.id,
                                    month=month, year=year, monthly_target=target)
            db.session.add(md)
        else:
            md.monthly_target = target
        count += 1
    db.session.commit()
    print(f"  ✓ {count} monthly deliverables seeded")

    print("\n✅ All seeding complete!")
