import pymysql
import json

conn = pymysql.connect(host='127.0.0.1', port=3307, user='root', password='root123', db='erp_system')
cursor = conn.cursor()

# 1. Add reactions column to chat_messages if missing
for col_sql in [
    "ALTER TABLE chat_messages ADD COLUMN reactions TEXT DEFAULT NULL;",
    "ALTER TABLE chat_messages MODIFY COLUMN attachment_path VARCHAR(500);",
]:
    try:
        cursor.execute(col_sql)
        print(f"OK: {col_sql[:60]}")
    except Exception as e:
        print(f"Skip ({e})")

# 2. Create group tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS chat_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '👥',
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS chat_group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS chat_group_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT,
    attachment_path VARCHAR(500),
    attachment_type VARCHAR(50),
    reactions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
""")
print("Tables created.")

# Fetch user IDs by name
cursor.execute("SELECT id, name FROM users")
users = {row[1]: row[0] for row in cursor.fetchall()}
print("Users:", users)

ADMIN_ID   = users.get('System Admin', 1)   # Branch Manager / System Admin
MATHESH_ID = users.get('Mathesh', 16)
FAZIL_ID   = users.get('Mohamed Fazil', 20)
KOUSIC_ID  = users.get('Kousic', 18)
DHARAN_ID  = users.get('Dharan', 19)
DHARSHAN_ID = users.get('Dharshan', 8)       # Brand Manager
SRI_ID     = users.get('Sri Kunjaravalli', 6)
ABIRAMI_ID = users.get('Abirami', 7)
RAJAGURU_ID = users.get('Rajaguru', 11)
RISHINESH_ID = users.get('Rishinesh', 10)
VISALAM_ID  = users.get('Visalam', 12)
KESAVAN_ID  = users.get('Kesavan', 13)
SASI_ID    = users.get('Sasi', 14)
SWETHA_ID  = users.get('Swetha', 15)

# Clear old groups to avoid duplicates
cursor.execute("DELETE FROM chat_group_members")
cursor.execute("DELETE FROM chat_groups")

# Define groups
groups = [
    {
        'name': '🌐 Website Team',
        'icon': '🌐',
        'members': [MATHESH_ID, FAZIL_ID, KOUSIC_ID, DHARAN_ID, ADMIN_ID],
    },
    {
        'name': '📣 Social Media Team',
        'icon': '📣',
        'members': [DHARSHAN_ID, SRI_ID, ABIRAMI_ID, RAJAGURU_ID, RISHINESH_ID, VISALAM_ID, KESAVAN_ID, ADMIN_ID],
    },
    {
        'name': '🏆 Team Leaders',
        'icon': '🏆',
        'members': [MATHESH_ID, SASI_ID, SWETHA_ID, ADMIN_ID, DHARSHAN_ID],
    },
]

for g in groups:
    cursor.execute("INSERT INTO chat_groups (name, icon, created_by) VALUES (%s, %s, %s)",
                   (g['name'], g['icon'], ADMIN_ID))
    gid = cursor.lastrowid
    for uid in g['members']:
        if uid:
            cursor.execute("INSERT INTO chat_group_members (group_id, user_id) VALUES (%s, %s)", (gid, uid))
    print(f"Created group '{g['name']}' with {len(g['members'])} members")

conn.commit()
conn.close()
print("Done.")
