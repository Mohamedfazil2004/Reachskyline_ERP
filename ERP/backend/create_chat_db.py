import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

# Assuming dev environment with known DB config
conn = pymysql.connect(
    host=os.getenv('DB_HOST', '127.0.0.1'),
    port=int(os.getenv('DB_PORT', 3307)),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', 'root123'),
    db=os.getenv('DB_NAME', 'erp_system')
)

cursor = conn.cursor()
try:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message TEXT,
        attachment_path VARCHAR(255),
        attachment_type VARCHAR(50),
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    """)
    print("Created chat_messages table")
except Exception as e:
    print(f"Error: {e}")

conn.commit()
conn.close()
