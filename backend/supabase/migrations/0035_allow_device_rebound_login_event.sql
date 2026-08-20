-- 0034 records a distinct audit outcome when an existing user's active device
-- binding is rotated after an app reinstall or APK rebuild. Expand the check
-- constraint without changing or deleting existing login-event data.
alter table public.user_login_events
  drop constraint if exists user_login_events_outcome_check;

alter table public.user_login_events
  add constraint user_login_events_outcome_check
  check (outcome in (
    'otp_requested',
    'otp_verified',
    'device_claimed',
    'device_rebound',
    'rejected'
  ));
