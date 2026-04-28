import psycopg2

conn = psycopg2.connect('postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()
cur.execute("select id, full_name, email, role, school_id, password from profiles order by created_at desc nulls last limit 20")
for row in cur.fetchall():
    print(row)
cur.close()
conn.close()
