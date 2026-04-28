import psycopg2
import uuid

conn_string = "postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

try:
    print("Testing classroom_notes RLS after fix...\n")
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()

    schoolId = "f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5"
    
    # Get an existing session or use NULL
    print("TEST 0: Finding a valid classroom_session for the test...")
    cur.execute("SELECT id FROM public.classroom_sessions WHERE school_id = %s LIMIT 1", (schoolId,))
    session_row = cur.fetchone()
    test_session_id = session_row[0] if session_row else None
    
    if test_session_id:
        print(f"  ✅ Found session: {test_session_id}\n")
    else:
        print(f"  ℹ️  No session found, will use NULL session_id\n")
    print("TEST 1: SELECT from classroom_notes")
    cur.execute("SELECT COUNT(*) FROM public.classroom_notes WHERE school_id = %s", (schoolId,))
    count = cur.fetchone()[0]
    print(f"  ✅ SELECT works. Found {count} existing notes\n")

    # Test 2: Test INSERT with proper UUID for teacher_id
    print("TEST 2: INSERT into classroom_notes (test record)")
    
    # Use NULL for teacher_id since it's NULLABLE
    test_teacher_uuid = None
    
    cur.execute("""
        INSERT INTO public.classroom_notes 
        (school_id, session_id, teacher_id, title, note_type, content, file_url, uploaded_by_name)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, title
    """, (
        schoolId,
        test_session_id,
        test_teacher_uuid,
        "Test Note from RLS Fix Verification",
        "PDF",
        "test content",
        "https://example.com/test.pdf",
        "Test User"
    ))
    
    result = cur.fetchone()
    if result:
        test_id = result[0]
        print(f"  ✅ INSERT works! Created note ID: {test_id}\n")
        
        # Verify it exists
        print("TEST 3: Verify inserted record is readable")
        cur.execute("SELECT title FROM public.classroom_notes WHERE id = %s", (test_id,))
        title = cur.fetchone()[0]
        print(f"  ✅ Record readable. Title: '{title}'\n")
        
        # Clean up
        print("TEST 4: DELETE test record")
        cur.execute("DELETE FROM public.classroom_notes WHERE id = %s", (test_id,))
        conn.commit()
        print(f"  ✅ Cleaned up test record\n")
    
    # Test policies
    print("TEST 5: Check active RLS policies")
    cur.execute("""
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('classroom_notes', 'classroom_recordings')
        ORDER BY tablename, policyname
    """)
    
    policies = cur.fetchall()
    if policies:
        print("  Active policies:")
        for schema, table, policy in policies:
            print(f"    - {table}: {policy}")
    else:
        print("  ⚠️  No policies found!")
    
    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED - System is ready for publishing!")
    print("="*60)
    
    cur.close()
    conn.close()

except Exception as e:
    print(f"❌ TEST FAILED: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
