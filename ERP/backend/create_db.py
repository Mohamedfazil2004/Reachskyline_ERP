import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def create_database():
    host = os.getenv('DB_HOST', '127.0.0.1')
    port = int(os.getenv('DB_PORT', '3306'))
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    dbname = os.getenv('DB_NAME', 'erp_system')

    try:
        connection = pymysql.connect(host=host, port=port, user=user, password=password)
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {dbname}")
        connection.close()
        print(f"Database '{dbname}' created or already exists.")
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == '__main__':
    create_database()
