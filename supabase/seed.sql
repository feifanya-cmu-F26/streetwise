-- Fictional sample issues, not observations or government records. Ported from
-- the deleted src/lib/demo/fixtures.ts so a fresh project has something to show.
-- Run after migrations/0001_init.sql; safe to re-run.
--
-- authority_id values are display metadata resolved through
-- src/lib/geo/authorities.ts. The assignment below is illustrative and is not a
-- verified jurisdiction decision.
insert into issues (
  id, type, severity, lat, lng, address, report_title, report_description,
  authority_status, authority_id, authority_reason, status,
  still_there_count, resolved_count, created_at, updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000001', 'pothole', 'medium',
    37.394, -122.081, 'Castro Street, Mountain View · sample location',
    'Pavement damage near the crossing',
    'Sample report: a damaged section of pavement near a pedestrian crossing.',
    'resolved', 'mountain_view',
    'Illustrative authority assignment, not a verified jurisdiction decision.',
    'ready', 4, 0, '2026-09-18T16:00:00Z', '2026-09-18T16:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000002', 'street_light', 'low',
    37.397, -122.077, 'Downtown Mountain View · sample location',
    'Street light needs a check',
    'Sample report: a street light appears unlit. This is fictional demo evidence.',
    'needs_review', null, 'Ownership has not been verified.',
    'detected', 2, 1, '2026-09-18T17:00:00Z', '2026-09-18T17:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000003', 'sidewalk', 'low',
    37.391, -122.084, 'Old Mountain View · sample location',
    'Uneven sidewalk edge',
    'Sample report: a raised edge between two sidewalk slabs.',
    'needs_review', null,
    'Property and maintenance responsibility need review.',
    'detected', 3, 0, '2026-09-18T18:00:00Z', '2026-09-18T18:00:00Z'
  )
on conflict (id) do nothing;
