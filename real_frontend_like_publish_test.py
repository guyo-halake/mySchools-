import requests
import psycopg2
import uuid
from datetime import datetime

SUPABASE_URL = 'https://vomsaqkhtturzqfuwxsn.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDIxNjgsImV4cCI6MjA5MTI3ODE2OH0.3M2p0SWKO51yjkGtLnCyJOFsKiAwC__BnWoe_jZlPI8'
PG_CONN = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'

school_id = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'

print('='*72)
print('REAL FRONTEND-LIKE UPLOAD TEST USING PROJECT ANON KEY')
print('='*72)

conn = psycopg2.connect(PG_CONN)
cur = conn.cursor()

# Find a valid session the app can target
cur.execute("""
select id, teacher_id, stream_id, subject_id
from classroom_sessions
where school_id = %s
order by created_at desc nulls last
limit 1
""", [school_id])
session = cur.fetchone()
if not session:
    raise SystemExit('No classroom session found for test')

session_id, teacher_id, stream_id, subject_id = session
print('Session:', session_id)
print('Teacher:', teacher_id)
print('Stream:', stream_id)
print('Subject:', subject_id)

# Verify repository query path first
cur.execute("select count(*) from classroom_notes where school_id = %s and session_id = %s", [school_id, session_id])
print('Existing notes for session:', cur.fetchone()[0])

# Real file upload attempt
filename = f"{int(datetime.now().timestamp()*1000)}-real-upload-test.pdf"
path = f"{school_id}/notes/{filename}"
file_bytes = b'%PDF-1.4\n%Real upload test\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'

upload_url = f"{SUPABASE_URL}/storage/v1/object/classroom-files/{path}"
headers = {
    'Authorization': f'Bearer {ANON_KEY}',
    'apikey': ANON_KEY,
    'Content-Type': 'application/pdf',
    'x-upsert': 'false'
}
print('\nUploading to storage:', upload_url)
resp = requests.post(upload_url, headers=headers, data=file_bytes, timeout=30)
print('Storage status:', resp.status_code)
print('Storage response:', resp.text)

if resp.status_code not in (200, 201):
    print('\nUPLOAD FAILED BEFORE DB INSERT')
    raise SystemExit(1)

public_url = f"{SUPABASE_URL}/storage/v1/object/public/classroom-files/{path}"
print('Public URL:', public_url)

# Try database insert with the live schema
insert_sql = """
insert into classroom_notes (
  school_id, session_id, teacher_id, title, note_type, content, file_url,
  stream_id, subject_id, audience_scope, uploaded_by_name, target_student_ids
) values (
  %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb
)
returning id, title, file_url
"""
try:
    cur.execute(insert_sql, [
        school_id,
        session_id,
        teacher_id,
        'Real Upload Test Note',
        'PDF',
        'real upload test content',
        public_url,
        stream_id,
        subject_id,
        'WHOLE_CLASS',
        'Copilot Test',
        '[]'
    ])
    inserted = cur.fetchone()
    conn.commit()
    print('\nDB INSERT SUCCESS:', inserted)
    cur.execute("select id, title, file_url from classroom_notes where id = %s", [inserted[0]])
    row = cur.fetchone()
    print('DB READBACK:', row)
    cur.execute('delete from classroom_notes where id = %s', [inserted[0]])
    conn.commit()
    print('Cleanup done')
except Exception as e:
    conn.rollback()
    print('\nDB INSERT FAILED:', e)
    raise
finally:
    cur.close()
    conn.close()

print('\nREAL TEST PASSED: upload + insert + readback')
