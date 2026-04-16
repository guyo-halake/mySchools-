import psycopg2

PG_CONN = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'

conn = psycopg2.connect(PG_CONN)
cur = conn.cursor()
cur.execute("""
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'classroom-files'
""")
row = cur.fetchone()
print(row)
cur.close()
conn.close()
