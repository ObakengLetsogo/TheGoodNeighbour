-- V2: indexes for the lookups the app does on every request. Foreign keys do not get an index automatically in PostgreSQL.
create index idx_policies_user on policies (user_id);
create index idx_policies_status on policies (status);
create index idx_policy_members_policy on policy_members (policy_id);
create index idx_claims_user on claims (user_id);
create index idx_claims_policy on claims (policy_id);
create index idx_payment_records_policy on payment_records (policy_id);
create index idx_auth_tokens_user on auth_tokens (user_id);
create index idx_support_requests_user on support_requests (user_id);
create index idx_waitlist_phone on waitlist_entries (phone);
create index idx_waitlist_email on waitlist_entries (email);
