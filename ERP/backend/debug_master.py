import urllib.request
import csv
import io

MASTER_DATA_URL = "https://docs.google.com/spreadsheets/d/1UoLmX-RdZlLXpF-nK9IurRy9OcpmeqYYTkEC0IDUalI/export?format=csv&gid=0"

try:
    res = urllib.request.urlopen(MASTER_DATA_URL)
    content = res.read().decode('utf-8')
    reader = csv.DictReader(io.StringIO(content))
    print("HEADERS:")
    for f in reader.fieldnames:
        print(f"|{f}|")
except Exception as e:
    print("Error:", e)
