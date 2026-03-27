School Results System (Kenyan High School)

This project is a role-based school portal for parents, students, teachers, and admin users.

Current focus areas implemented in branch update1:
- Secure login using account email and password (no manual role selection)
- Session timeout with automatic logout
- Role-based route protection
- Class CRUD foundations
- Teacher-restricted input workflow with moderation stages
- KCSE-style projection card and moderation status in results
- Fees penalties, receipt export flow, and reconciliation widgets
- Incident metadata for discipline workflow
- Event recurrence and iCal export
- Targeted/pinned announcements
- Safer parent communication logs and consent checks

Kenyan High School Readiness Checklist

1. Academic structure
- [x] Forms and streams baseline
- [x] Class/form ranking
- [x] KCSE projection (grade + points)
- [ ] Full KCSE weighted points by subject cluster
- [ ] Report card locking with signatures

2. Fees
- [x] KES currency display
- [x] Statement table and balances
- [x] Receipt numbering + print-to-PDF flow
- [x] Penalty reminder view
- [ ] M-Pesa callback and automatic reconciliation
- [ ] Receipt PDF service and reference validation

3. Discipline and welfare
- [x] Incident status tracking
- [x] Category, escalation, and notes fields
- [ ] Counseling session records
- [ ] Parent meeting follow-up workflow

4. Communication
- [x] Role-targeted announcements
- [x] In-app communication log scaffold
- [x] WhatsApp templates and compliance consent check
- [ ] SMS/email delivery status tracking
- [ ] Read receipts by parent/guardian

5. Governance
- [x] Role-based permissions for pages/routes
- [x] Session expiry guard
- [ ] Backend auth provider
- [ ] Audit logs and immutable change history
- [ ] Encrypted backups and restore

Suggested next implementation phases

Phase 1 (done/in progress)
- Frontend policy enforcement and role guards
- Workflow scaffolding for results moderation

Phase 2
- Backend API (auth, students, results, fees)
- PostgreSQL data model + migrations
- M-Pesa callback endpoint + reconciler

Phase 3
- Reporting engine (transcripts/report cards)
- Notification service (SMS/email/WhatsApp)
- Full governance (audit, backups, approvals)

