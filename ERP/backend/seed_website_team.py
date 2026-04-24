"""
Seed script for Website Team module:
- Creates Website Head and Employee users
- Seeds WebsiteActivity master data from the Google Sheet
"""
from app import create_app, db
from app.models.user import User
from app.models.website_team import WebsiteActivity

app = create_app()

WEBSITE_ACTIVITIES = [
    ("Research", "Requirement Freeze", 30),
    ("Research", "Competitor Scan (2–3 Sites)", 30),
    ("Research", "Industry Structure Review", 20),
    ("Research", "Sitemap Finalisation", 30),
    ("Research", "Client Clarification Call", 20),
    ("Branding", "Positioning Definition", 20),
    ("Branding", "USP Finalisation", 15),
    ("Branding", "Tone & CTA Strategy", 15),
    ("AI Setup", "Master Prompt Creation", 30),
    ("AI Setup", "Design Instruction Structuring", 20),
    ("Page Development", "Primary Page Build", 120),
    ("Page Development", "Primary Page Mobile Optimization", 30),
    ("Page Development", "Primary Page SEO Setup", 20),
    ("Page Development", "Secondary Page Build", 75),
    ("Page Development", "Secondary Page Mobile Optimization", 20),
    ("Page Development", "Secondary Page SEO Setup", 15),
    ("Page Development", "Tertiary Page Build", 45),
    ("Page Development", "Tertiary Page Formatting", 15),
    ("Content", "AI Draft Content Creation", 60),
    ("Content", "Human Editing & Refinement", 45),
    ("Content", "Meta Title & Description Setup", 20),
    ("Content", "Image Selection & Optimization", 30),
    ("Functionality", "Contact Form Setup", 30),
    ("Functionality", "WhatsApp Button Setup", 15),
    ("Functionality", "Email Configuration", 30),
    ("Functionality", "Google Analytics Setup", 30),
    ("Functionality", "Meta Pixel Setup", 30),
    ("Functionality", "Thank You Page Redirect Setup", 20),
    ("Custom Function", "CRM Integration", 60),
    ("Custom Function", "Payment Gateway Integration", 120),
    ("Custom Function", "Custom Form Logic", 60),
    ("Custom Function", "Advanced Animation Setup", 90),
    ("Landing Page", "Landing Page Research", 30),
    ("Landing Page", "Landing Page Structure Setup", 45),
    ("Landing Page", "Landing Page Content Creation", 60),
    ("Landing Page", "Landing Page Development", 120),
    ("Landing Page", "Landing Page Testing", 30),
    ("QC", "Page-Level Review", 15),
    ("QC", "Mobile Responsiveness Check", 20),
    ("QC", "Form Testing", 20),
    ("QC", "Cross Browser Testing", 20),
    ("QC", "Speed Testing", 20),
    ("QC", "Broken Link Check", 15),
    ("QC", "Final Pre-Launch Review", 30),
    ("Correction", "Text Change", 30),
    ("Correction", "Image Replacement", 30),
    ("Correction", "Button Link Update", 20),
    ("Correction", "Small Layout Adjustment", 45),
]

WEBSITE_USERS = [
    {"name": "Mathesh", "email": "mathesh@reachskyline.com", "password": "Mathesh@123", "role": "Website Head", "employee_id": "W001"},
    {"name": "Kousic", "email": "kousic@reachskyline.com", "password": "Kousic@123", "role": "Website Employee", "employee_id": "W002"},
    {"name": "Dharan", "email": "dharan@reachskyline.com", "password": "Dharan@123", "role": "Website Employee", "employee_id": "W003"},
    {"name": "Mohamed Fazil", "email": "fazil@reachskyline.com", "password": "Fazil@123", "role": "Website Employee", "employee_id": "W004"},
]

with app.app_context():
    # Create tables if not exist
    db.create_all()

    # Seed users
    print("\n--- Seeding Website Users ---")
    for u_data in WEBSITE_USERS:
        existing = User.query.filter_by(email=u_data['email']).first()
        if existing:
            print(f"  User already exists: {u_data['name']} — skipping")
            continue
        user = User(
            name=u_data['name'],
            email=u_data['email'],
            role=u_data['role'],
            employee_id=u_data['employee_id'],
            daily_available_minutes=480,
            is_active=True
        )
        user.set_password(u_data['password'])
        db.session.add(user)
        print(f"  Created: {u_data['name']} ({u_data['role']}) — {u_data['email']} / {u_data['password']}")

    # Seed activities
    print("\n--- Seeding Website Activities ---")
    for (activity, activity_type, mins) in WEBSITE_ACTIVITIES:
        existing = WebsiteActivity.query.filter_by(
            activity=activity, activity_type=activity_type
        ).first()
        if existing:
            print(f"  Already exists: {activity} > {activity_type} — skipping")
            continue
        a = WebsiteActivity(
            activity=activity,
            activity_type=activity_type,
            standard_minutes=mins
        )
        db.session.add(a)
        print(f"  Created: {activity} > {activity_type} ({mins} min)")

    db.session.commit()
    print("\n* Website Team seeding complete!")
    print("\nLogin Credentials:")
    print("  Mathesh (Website Head):  mathesh@reachskyline.com / Mathesh@123")
    print("  Kousic (Website Emp):    kousic@reachskyline.com / Kousic@123")
    print("  Dharan (Website Emp):    dharan@reachskyline.com / Dharan@123")
    print("  Mohamed Fazil:           fazil@reachskyline.com / Fazil@123")
