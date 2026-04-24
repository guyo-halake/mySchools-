# DATABASE ARCHITECTURE AUDIT

## Table: schools
Fields detected:
- id
- name
- subdomain
- email
- location
- phone_numbers
- bank_name
- bank_acc
- paybill_no
- created_at
- logo_url

## Table: terms
Fields detected:
- id
- school_id
- name
- year
- start_date
- end_date

## Table: classes
Fields detected:
- id
- school_id
- name
- level

## Table: streams
Fields detected:
- id
- school_id
- class_id
- name
- class_teacher_id

## Table: subjects
Fields detected:
- id
- school_id
- name
- code
- is_compulsory
- subject_group
- department
- is_elective
- offered_from_class
- offered_to_class
- weekly_lessons
- pass_mark
- display_order
- active

## Table: exam_results
Fields detected:
- id
- school_id
- student_id
- exam_id
- subject_id
- marks
- grade
- created_at
- teacher_id
- status
- reviewed_by
- review_note
- published_by
- published_at
- updated_at
- is_absent
- absence_reason
- is_makeup
- score_weight
- weighted_score
- source_batch_id
- attempt_no
- locked

## Table: exam_windows
Fields detected:
- id
- school_id
- term_id
- exam_type
- name
- is_open
- is_current
- created_at
- updated_at

## Table: school_result_controls
Fields detected:
- school_id
- active_term_id
- enforce_teacher_scope
- enforce_active_term
- enforce_exam_window
- updated_at

