import psycopg2

PG_CONN = 'postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
SCHOOL_ID = 'f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5'

print('='*72)
print('DIRECT DATABASE PUBLISH TEST')
print('='*72)

conn = psycopg2.connect(PG_CONN)
cur = conn.cursor()

try:
    cur.execute("""
        select id, teacher_id, stream_id, subject_id
        from classroom_sessions
        where school_id = %s
        order by created_at desc nulls last
        limit 1
    """, [SCHOOL_ID])
    session = cur.fetchone()
    if not session:
        raise SystemExit('No session found')

    session_id, teacher_id, stream_id, subject_id = session
    print('Session:', session_id)
    print('Teacher:', teacher_id)
    print('Stream:', stream_id)
    print('Subject:', subject_id)

    cur.execute("""
        select count(*)
        from classroom_notes
        where school_id = %s and session_id = %s
    """, [SCHOOL_ID, session_id])
    before_count = cur.fetchone()[0]
    print('Existing notes for session:', before_count)

    cur.execute("""
        insert into classroom_notes (
            school_id, session_id, teacher_id, title, note_type, content, file_url,
            stream_id, class_id, subject_id, audience_scope, target_student_ids, uploaded_by_name
        ) values (
            %s, %s, %s, %s, %s, %s, %s,
            %s, null, %s, %s, %s::jsonb, %s
        )
        returning id, title, file_url
    """, [
        SCHOOL_ID,
        session_id,
        teacher_id,
        'Direct DB Test Note',
        'PDF',
        'direct db test',
        'https://example.com/direct-db-test.pdf',
        stream_id,
        subject_id,
        'WHOLE_CLASS',
        '[]',
        'Direct Test'
    ])
    row = cur.fetchone()
    conn.commit()
    print('Inserted note:', row)

    cur.execute("""
        select id, title, file_url, audience_scope, uploaded_by_name
        from classroom_notes
        where id = %s
    """, [row[0]])
    readback = cur.fetchone()
    print('Readback:', readback)

    cur.execute('delete from classroom_notes where id = %s', [row[0]])
    conn.commit()
    print('Cleanup complete')

    print('\nDIRECT DATABASE TEST PASSED')
finally:
    cur.close()
    conn.close()
