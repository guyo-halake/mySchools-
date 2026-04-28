#!/usr/bin/env node

/**
 * RLS HARDENING DEPLOYMENT SCRIPT
 * 
 * Since the CLI is not linked, we'll provide instructions to apply RLS directly
 * via the Supabase Dashboard SQL Editor.
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
console.log('║  🛡️ RLS HARDENING DEPLOYMENT GUIDE                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260413_comprehensive_rls_hardening.sql');

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found at: ${migrationPath}`);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log('✅ Comprehensive RLS Migration Found');
console.log(`   File: 20260413_comprehensive_rls_hardening.sql`);
console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

console.log('═'.repeat(75));
console.log('\n📝 DEPLOYMENT METHOD 1: SUPABASE DASHBOARD (RECOMMENDED)\n');
console.log('Steps:');
console.log('  1. Go to: https://app.supabase.com/project');
console.log('  2. Click "SQL Editor" in left sidebar');
console.log('  3. Click "+ New Query" button');
console.log('  4. Paste the SQL code below OR upload the file');
console.log('  5. Click "Run" (⌘/Ctrl + Enter)\n');

console.log('═'.repeat(75));
console.log('\n📋 SQL TO EXECUTE:\n');
console.log('---START OF SQL---\n');
console.log(migrationSQL);
console.log('\n---END OF SQL---\n');

console.log('═'.repeat(75));
console.log('\n📝 DEPLOYMENT METHOD 2: COPY TO DASHBOARD\n');
console.log('1. Copy all SQL above');
console.log('2. Go to Supabase Dashboard → SQL Editor');
console.log('3. New Query → Paste → Run\n');

console.log('═'.repeat(75));
console.log('\n✅ AFTER DEPLOYMENT, RUN VERIFICATION:\n');
console.log('  cd c:\\Users\\guyoh\\Desktop\\SchoolSystenm');
console.log('  node scratch/verify_rls_deployment.cjs\n');

console.log('═'.repeat(75));
console.log('\n⏱️  ESTIMATED TIME: 2-5 minutes\n');

// Write SQL to a file for easy copying
const outputPath = path.join(__dirname, '..', 'RLS_MIGRATION_TO_APPLY.sql');
fs.writeFileSync(outputPath, migrationSQL);
console.log(`📥 SQL saved to: RLS_MIGRATION_TO_APPLY.sql`);
console.log('   (You can open this file and copy all content to run in Supabase)\n');
