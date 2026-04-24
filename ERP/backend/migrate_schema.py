import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def update_schema():
    host = os.getenv('DB_HOST', '127.0.0.1')
    port = int(os.getenv('DB_PORT', '3306'))
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    dbname = os.getenv('DB_NAME', 'erp_system')

    try:
        connection = pymysql.connect(host=host, port=port, user=user, password=password, database=dbname)
        with connection.cursor() as cursor:
            # Add columns to users table
            columns_to_add = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) UNIQUE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS efficiency_score INT DEFAULT 5",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS max_daily_capacity INT DEFAULT 5",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_workload INT DEFAULT 0",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'Available'",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_video_editor BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_content_writer BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_graphic_designer BOOLEAN DEFAULT FALSE"
            ]
            
            for sql in columns_to_add:
                try:
                    cursor.execute(sql)
                    print(f"Executed: {sql}")
                except Exception as e:
                    print(f"Skipped or error in {sql}: {e}")
            
            connection.commit()
        connection.close()
        print("Schema updated successfully.")
    except Exception as e:
        print(f"Error updating schema: {e}")

if __name__ == '__main__':
    update_schema()
