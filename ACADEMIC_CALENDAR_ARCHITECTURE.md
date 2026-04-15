# Academic Calendar Architecture - REFACTORED

## ✅ Problem Fixed
The system was:
- Hardcoded to 3 terms only ("Form 1 - Term 1", "Form 1 - Term 2", etc.)
- Creating separate term sets for each form (Forms 1-4 had their own terms)
- Not configurable for different school term structures
- Not compatible with schools using semesters or quarters

## ✅ New Architecture

### 1. **School-Wide Term System** (Not Per-Form)
All students (Forms 1-4) use the **SAME** term structure:
```
School A:      School B:       School C:
Term 1 2026    Semester 1 2026 Quarter 1 2026
Term 2 2026    Semester 2 2026 Quarter 2 2026
Term 3 2026                    Quarter 3 2026
               (Both forms      Quarter 4 2026
                use same
                2 semesters)
```

### 2. **Configurable Structure**
Schools configure in **ACADEMIC_CALENDAR_SETUP template**:
- `periodType`: 'TERMS' | 'SEMESTERS' | 'QUARTERS'
- `termCount`: 2, 3, 4, etc. (flexible, not hardcoded)
- Names: "Term 1 2026", "Semester 1 2026", "Quarter 1 2026"
- Dates: Start and end dates for each
- Mid-terms: Breaks within each term

### 3. **Database Structure** (Terms Table)
```sql
id            | name              | year | start_date | end_date   | school_id
------------------------------------------------------------------------
(UUID)        | Term 1 2026       | 2026 | 2026-01-01 | 2026-04-30 | school-id
(UUID)        | Term 2 2026       | 2026 | 2026-05-01 | 2026-08-30 | school-id
(UUID)        | Term 3 2026       | 2026 | 2026-09-01 | 2026-11-30 | school-id

NOT:
(UUID)        | Form 1 - Term 1   | 2026 | 2026-01-01 | 2026-04-30 | school-id
(UUID)        | Form 1 - Term 2   | 2026 | 2026-05-01 | 2026-08-30 | school-id
(UUID)        | Form 2 - Term 1   | 2026 | 2026-01-01 | 2026-04-30 | school-id  ← WRONG
```

### 4. **Type System** (Now Flexible)
```typescript
// OLD (Hardcoded):
type AcademicTerm = {
  termNumber: 1 | 2 | 3;  // ❌ Only 3 allowed
  name: string;
  startDate: string;
  endDate: string;
}

// NEW (Flexible):
type AcademicTerm = {
  termNumber: number;  // ✅ Any number (1, 2, 3, 4, ...)
  name: string;
  startDate: string;
  endDate: string;
  midTermStart?: string;
  midTermEnd?: string;
}

type AcademicCalendarForm = {
  year: number;
  timezone: string;
  periodType: 'TERMS' | 'SEMESTERS' | 'QUARTERS';  // ✅ Configurable
  termCount: number;  // ✅ Configurable
  terms: AcademicTerm[];
  holidays: AcademicHoliday[];
  events: AcademicEvent[];
}
```

## 📋 Template Configuration Example

```json
{
  "key": "ACADEMIC_CALENDAR_SETUP",
  "config": {
    "year": 2026,
    "timezone": "Africa/Nairobi",
    "periodType": "TERMS",      // School uses 3 terms per year
    "termCount": 3,
    "terms": [
      {
        "termNumber": 1,
        "name": "Term 1 2026",
        "startDate": "2026-01-01",
        "endDate": "2026-04-30",
        "midTermStart": "2026-02-10",
        "midTermEnd": "2026-02-14"
      },
      {
        "termNumber": 2,
        "name": "Term 2 2026",
        "startDate": "2026-05-01",
        "endDate": "2026-08-30",
        "midTermStart": "2026-06-10",
        "midTermEnd": "2026-06-14"
      },
      {
        "termNumber": 3,
        "name": "Term 3 2026",
        "startDate": "2026-09-01",
        "endDate": "2026-11-30"
      }
    ],
    "holidays": [
      {
        "id": "holiday-1",
        "kind": "MID_TERM",
        "termNumber": 1,
        "startDate": "2026-02-10",
        "endDate": "2026-02-14",
        "notes": "Mid-term break"
      }
    ],
    "events": [
      {
        "id": "event-1",
        "title": "Sports Day",
        "eventType": "ASSEMBLY",
        "termNumber": 1,
        "startDate": "2026-03-15",
        "endDate": "2026-03-15"
      }
    ]
  }
}
```

## 🎯 Usage: How Schools Configure Different Structures

### School with 3 Terms:
```json
"periodType": "TERMS",
"termCount": 3,
"termNames": ["Term 1", "Term 2", "Term 3"]
```

### School with 2 Semesters:
```json
"periodType": "SEMESTERS",
"termCount": 2,
"termNames": ["Semester 1", "Semester 2"]
```

### School with 4 Quarters:
```json
"periodType": "QUARTERS",
"termCount": 4,
"termNames": ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"]
```

## 🔄 Data Flow
```
Academic Calendar Template
    ↓
    ├─ Read: termCount, periodType, each term's dates
    │
    ├─ Write to: terms table (school-wide, all forms)
    │   "Term 1 2026", "Term 2 2026", "Term 3 2026"
    │
    └─ Used by: All screens (Forms 1-4, Dashboard, Results, Fees)
       All see the SAME current term
```

## ✅ What Works Now

- **Dashboard**: Shows current term (e.g., "Term 1 2026") for entire school
- **Results Management**: All forms use same term system
- **Fees Management**: Terms apply school-wide
- **Academic Calendar UI**: Configurable for any term count
- **Term Progress**: Calculates correctly for each configured term
- **Mid-term Breaks**: Optional per term
- **School Events**: Can be tied to specific terms or school-wide

## 🛠️ Migration Note

Old data with "Form 1 - Term 1" naming has been replaced with:
- "Term 1 2024", "Term 1 2025", "Term 1 2026"
- "Term 2 2024", "Term 2 2025", "Term 2 2026"
- "Term 3 2024", "Term 3 2025", "Term 3 2026"

All forms now share this school-wide structure.
