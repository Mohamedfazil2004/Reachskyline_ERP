import pymysql
import os

# Assuming dev environment with known DB config
conn = pymysql.connect(
    host='127.0.0.1',
    port=3307,
    user='root',
    password='root123',
    db='erp_system'
)

cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE automation_rough_cuts ADD COLUMN completed_at DATETIME DEFAULT NULL;")
    print("Added completed_at")
except Exception as e:
    print(f"Error adding completed_at: {e}")

try:
    cursor.execute("ALTER TABLE automation_rough_cuts ADD COLUMN work_date DATE DEFAULT NULL;")
    print("Added work_date")
except Exception as e:
    print(f"Error adding work_date: {e}")

try:
    cursor.execute("ALTER TABLE automation_rough_cuts ADD COLUMN minutes INT DEFAULT 30;")
    print("Added minutes")
except Exception as e:
    print(f"Error adding minutes: {e}")

conn.commit()
conn.close()
