-- Cloud compatibility arbiters for every explicit ON CONFLICT target.
-- CampusSphere-specific names prevent stale legacy index names from masking
-- incompatible definitions.
create unique index if not exists campusphere_event_registrations_pair_uidx on public.event_registrations (event_id, user_id);
create unique index if not exists campusphere_team_members_pair_uidx on public.team_members (team_request_id, user_id);
create unique index if not exists campusphere_team_applications_active_uidx on public.team_applications (team_request_id, applicant_id) where status in ('pending', 'accepted');
create unique index if not exists campusphere_profiles_user_uidx on public.profiles (user_id);
create unique index if not exists campusphere_skills_name_uidx on public.skills (name);
create unique index if not exists campusphere_interests_name_uidx on public.interests (name);
create unique index if not exists campusphere_notification_dedupe_uidx on public.notifications (dedupe_key) where dedupe_key is not null;
create unique index if not exists campusphere_notification_outbox_dedupe_uidx on public.notification_outbox (dedupe_key);
create unique index if not exists campusphere_restrictions_active_uidx on public.user_restrictions (user_id, restriction) where revoked_at is null;
create unique index if not exists campusphere_notification_preferences_user_uidx on public.notification_preferences (user_id);
create unique index if not exists campusphere_user_devices_label_uidx on public.user_devices (user_id, device_label);
create unique index if not exists campusphere_event_bookmarks_pair_uidx on public.event_bookmarks (event_id, user_id);
create unique index if not exists campusphere_event_reminders_pair_uidx on public.event_reminders (event_id, user_id);
create unique index if not exists campusphere_post_bookmarks_pair_uidx on public.post_bookmarks (post_id, user_id);
create unique index if not exists campusphere_post_reactions_pair_uidx on public.post_reactions (post_id, user_id);
create unique index if not exists campusphere_post_poll_votes_pair_uidx on public.post_poll_votes (option_id, user_id);
create unique index if not exists campusphere_following_pair_uidx on public.following (follower_id, followee_id);
create unique index if not exists campusphere_user_blocks_pair_uidx on public.user_blocks (blocker_id, blocked_id);
create unique index if not exists campusphere_rate_limit_bucket_uidx on public.rate_limit_buckets (user_id, action, window_started_at);

