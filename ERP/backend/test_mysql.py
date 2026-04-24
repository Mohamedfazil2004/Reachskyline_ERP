import pymysql

def test_conn(port, password):
    try:
        conn = pymysql.connect(host='127.0.0.1', port=port, user='root', password=password)
        print(f"Port {port} with password '{password}': SUCCESS")
        conn.close()
        return True
    except Exception as e:
        print(f"Port {port} with password '{password}': {e}")
        return False

# Try common pairs
test_conn(3306, 'root')
test_conn(3306, '')
test_conn(3307, 'root')
test_conn(3307, '')
test_conn(3307, 'admin')
test_conn(3307, 'root123')
test_conn(3306, 'admin')
