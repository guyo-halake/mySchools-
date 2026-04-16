import psycopg2

pg_conn = "postgresql://postgres.vomsaqkhtturzqfuwxsn:Guyesa_10333@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

try:
    print("Checking storage bucket RLS policies...\n")
    conn = psycopg2.connect(pg_conn)
    cur = conn.cursor()

    # Check storage object policies
    print("[1] Storage bucket policies:")
    cur.execute("""
        SELECT
            schemaname,
            tablename,
            policyname,
            qual as condition,
            with_check
        FROM pg_policies
        WHERE tablename = 'objects'
        ORDER BY tablename, policyname;
    """)
    
    policies = cur.fetchall()
    if policies:
        for schema, table, policy, condition, with_check in policies:
            print(f"\n  Policy: {policy}")
            print(f"  Table: {schema}.{table}")
            if condition:
                print(f"  USING: {condition}")
            if with_check:
                print(f"  WITH CHECK: {with_check}")
    else:
        print("  ⚠️  No policies found on storage.objects table!")
        print("  This could be the issue.")

    # Check if storage.objects table has RLS enabled
    print("\n[2] Storage RLS Status:")
    cur.execute("""
        SELECT schemaname, tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'storage' AND tablename = 'objects';
    """)
    
    result = cur.fetchone()
    if result:
        schema, table, rls = result
        print(f"  Table: {schema}.{table}")
        print(f"  RLS Enabled: {rls}")
    else:
        print("  Storage table not found!")

    # List all storage policies
    print("\n[3] All storage policies:")
    cur.execute("""
        SELECT tablename, policyname, cmd
        FROM pg_policies
        WHERE schemaname = 'storage'
        ORDER BY tablename, policyname;
    """)
    
    all_policies = cur.fetchall()
    if all_policies:
        for table, policy, cmd in all_policies:
            print(f"  - {table}.{policy} ({cmd})")
    else:
        print("  No storage policies configured!")

    cur.close()
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
