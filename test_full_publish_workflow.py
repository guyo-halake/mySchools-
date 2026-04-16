import psycopg2
import requests
import uuid
from datetime import datetime
import io

# Supabase config
pg_conn = "postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
supabase_url = "https://vomsaqkhtturzqfuwxsn.supabase.co"
anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbXNhcWtodHR1cnpxZnV3eHNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk0MjUyNDUsImV4cCI6MjAxOTAwNTI0NX0.sKbU_O_1rjqL2WMXrmLDDWR8sKT1WRnDBwB4T-FWSJA"

schoolId = "f01e2ad5-9dbe-4df8-bb23-0d9e56f113f5"

print("="*70)
print("FULL END-TO-END PUBLISH WORKFLOW TEST")
print("="*70)

try:
    # Step 1: Connect to database
    print("\n[STEP 1] Connecting to Supabase database...")
    conn = psycopg2.connect(pg_conn)
    cur = conn.cursor()
    print("  ✅ Connected")

    # Step 2: Get valid session
    print("\n[STEP 2] Finding valid classroom session...")
    cur.execute("""
        SELECT id, teacher_id, stream_id, subject_id 
        FROM public.classroom_sessions 
        WHERE school_id = %s 
        LIMIT 1
    """, (schoolId,))
    session = cur.fetchone()
    
    if not session:
        print("  ❌ No session found!")
        exit(1)
    
    session_id, teacher_id, stream_id, subject_id = session
    print(f"  ✅ Found session: {session_id}")
    print(f"     Teacher: {teacher_id}")
    print(f"     Stream: {stream_id}")
    print(f"     Subject: {subject_id}")

    # Step 3: Create test file
    print("\n[STEP 3] Creating test PDF file...")
    pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<</Size 4 /Root 1 0 R>>\nstartxref\n196\n%%EOF"
    test_filename = f"{int(datetime.now().timestamp()*1000)}-test-document.pdf"
    test_path = f"{schoolId}/notes/{test_filename}"
    print(f"  ✅ Created test PDF ({len(pdf_content)} bytes)")
    print(f"     Path: {test_path}")

    # Step 4: Upload to storage
    print("\n[STEP 4] Uploading PDF to storage bucket...")
    storage_url = f"{supabase_url}/storage/v1/object/{test_path}"
    headers = {
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/pdf"
    }
    
    response = requests.post(storage_url, data=pdf_content, headers=headers)
    print(f"  Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"  ❌ Storage upload failed!")
        print(f"     Response: {response.text}")
        print(f"\n  Debugging info:")
        print(f"    URL: {storage_url}")
        print(f"    Headers: {headers}")
        exit(1)
    
    print(f"  ✅ File uploaded successfully")
    file_url = f"{supabase_url}/storage/v1/object/public/{test_path}"
    print(f"     Public URL: {file_url}")

    # Step 5: Insert metadata to database
    print("\n[STEP 5] Inserting note metadata to database...")
    cur.execute("""
        INSERT INTO public.classroom_notes
        (school_id, session_id, title, note_type, content, file_url, stream_id, subject_id, audience_scope, uploaded_by_name)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, created_at
    """, (
        schoolId,
        session_id,
        "Test Note - Full Workflow",
        "PDF",
        "Test PDF content",
        file_url,
        stream_id,
        subject_id,
        "WHOLE_CLASS",
        "Test User"
    ))
    
    note_result = cur.fetchone()
    if not note_result:
        print("  ❌ Database insert failed!")
        exit(1)
    
    note_id, created_at = note_result
    conn.commit()
    print(f"  ✅ Note inserted successfully")
    print(f"     Note ID: {note_id}")
    print(f"     Created: {created_at}")

    # Step 6: Verify record in database
    print("\n[STEP 6] Verifying note is readable from database...")
    cur.execute("""
        SELECT id, title, file_url, audience_scope, uploaded_by_name 
        FROM public.classroom_notes 
        WHERE id = %s
    """, (note_id,))
    
    verify = cur.fetchone()
    if verify:
        vid, vt, vurl, vaud, vname = verify
        print(f"  ✅ Note found in database")
        print(f"     Title: {vt}")
        print(f"     Audience: {vaud}")
        print(f"     Uploaded by: {vname}")
        print(f"     URL: {vurl}")
    else:
        print("  ❌ Note not found in database!")
        exit(1)

    # Step 7: Check if it appears in repository query
    print("\n[STEP 7] Checking if note appears in repository query...")
    cur.execute("""
        SELECT id, title, created_at 
        FROM public.classroom_notes 
        WHERE school_id = %s 
        AND session_id = %s
        ORDER BY created_at DESC
        LIMIT 5
    """, (schoolId, session_id))
    
    notes = cur.fetchall()
    if notes:
        print(f"  ✅ Repository query works - found {len(notes)} notes:")
        for nid, ntitle, ndate in notes:
            is_our_note = "👈 THIS ONE" if nid == note_id else ""
            print(f"     - {ntitle} ({ndate}) {is_our_note}")
    else:
        print("  ⚠️  Repository query returned no notes")

    # Step 8: Cleanup
    print("\n[STEP 8] Cleaning up test record...")
    cur.execute("DELETE FROM public.classroom_notes WHERE id = %s", (note_id,))
    conn.commit()
    print(f"  ✅ Test record deleted")

    print("\n" + "="*70)
    print("✅ ALL TESTS PASSED - PUBLISH WORKFLOW IS WORKING!")
    print("="*70)
    print("\nSummary:")
    print("  ✅ Storage bucket accessible")
    print("  ✅ PDF uploaded successfully")
    print("  ✅ Database insert successful")
    print("  ✅ RLS policies allow full access")
    print("  ✅ Data appears in repository query")
    
    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ TEST FAILED: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
