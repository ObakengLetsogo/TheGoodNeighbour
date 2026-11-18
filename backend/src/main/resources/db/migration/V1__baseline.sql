-- TGN baseline schema (V1).
--
-- This is the schema the application's entities describe today, written out as SQL. From here on the database only changes
-- through new numbered files in this folder (V3__..., V4__...). NEVER edit a migration that has already run anywhere:
-- add a new one. The app starts with ddl-auto=validate, so an entity that doesn't match the migrations fails the tests.

create table audit_events (
    at timestamp(6) with time zone,
    detail varchar(2000),
    action varchar(255),
    actor varchar(255),
    entity_id varchar(255),
    entity_type varchar(255),
    id varchar(255) not null,
    primary key (id)
);

create table auth_tokens (
    staff boolean not null,
    expires_at timestamp(6) with time zone,
    token_hash varchar(255) not null,
    user_id varchar(255),
    primary key (token_hash)
);

create table benefit_item_contents (
    position integer not null check ((position>=0)),
    line varchar(200),
    item_id varchar(255) not null,
    primary key (position, item_id)
);

create table benefit_items (
    active boolean not null,
    max_qty integer not null,
    on_farm integer,
    sort_order integer not null,
    cost_cents bigint not null,
    value_cents bigint not null,
    description varchar(1000),
    group_id varchar(255),
    id varchar(255) not null,
    kind varchar(255),
    name varchar(255),
    unit_label varchar(255),
    primary key (id)
);

create table claim_documents (
    created_at timestamp(6) with time zone,
    size_bytes bigint not null,
    claim_id varchar(255),
    content_type varchar(255),
    doc_type varchar(255),
    file_name varchar(255),
    id varchar(255) not null,
    storage_key varchar(255),
    primary key (id)
);

create table claims (
    deceased_id_required boolean not null,
    over_age_limit boolean not null,
    within_waiting_period boolean not null,
    created_at timestamp(6) with time zone,
    delivered_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    delivery_note varchar(1000),
    instructions varchar(1000),
    staff_note varchar(2000),
    address_line varchar(255),
    bundle_json text,
    cause_of_death varchar(255),
    city varchar(255),
    claimant_name varchar(255),
    claimant_phone varchar(255),
    date_of_death varchar(255),
    deceased_name varchar(255),
    delivery_date varchar(255),
    delivery_window varchar(255),
    id varchar(255) not null,
    member_id varchar(255),
    policy_id varchar(255),
    postal_code varchar(255),
    province varchar(255),
    recipient_name varchar(255),
    recipient_phone varchar(255),
    reference varchar(255) unique,
    status varchar(255),
    suburb varchar(255),
    user_id varchar(255),
    primary key (id)
);

create table cover_age_bands (
    from_age integer,
    multiplier_bps integer,
    position integer not null check ((position>=0)),
    to_age integer,
    config_id varchar(255) not null,
    primary key (position, config_id)
);

create table cover_config (
    accidental_waiting_days integer not null,
    base_rate_bps integer not null,
    cooling_off_days integer not null,
    escalation_cap_bps integer not null,
    lapse_after_missed_payments integer not null,
    main_cover_end_age integer not null,
    main_max_age integer not null,
    main_min_age integer not null,
    max_commitment_multiple integer not null,
    max_members integer not null,
    natural_waiting_days integer not null,
    reinstate_within_days integer not null,
    upgrade_waiting_days integer not null,
    min_bundle_value_cents bigint not null,
    id varchar(255) not null,
    primary key (id)
);

create table cover_relationship_rules (
    cover_end_age integer,
    max_age integer,
    max_count integer,
    min_age integer,
    multiplier_bps integer,
    config_id varchar(255) not null,
    relationship varchar(255)
);

create table legal_documents (
    draft boolean not null,
    version integer not null,
    updated_at timestamp(6) with time zone,
    body text,
    slug varchar(255) not null,
    title varchar(255),
    primary key (slug)
);

create table notifications (
    created_at timestamp(6) with time zone,
    read_at timestamp(6) with time zone,
    body varchar(1000),
    category varchar(255),
    id varchar(255) not null,
    ref_id varchar(255),
    ref_type varchar(255),
    title varchar(255),
    user_id varchar(255),
    primary key (id)
);

create table otp_codes (
    attempts integer not null,
    created_at timestamp(6) with time zone,
    expires_at timestamp(6) with time zone,
    used_at timestamp(6) with time zone,
    code_hash varchar(255),
    id varchar(255) not null,
    phone varchar(255),
    purpose varchar(255),
    salt varchar(255),
    primary key (id)
);

create table payment_records (
    amount_cents bigint not null,
    created_at timestamp(6) with time zone,
    id varchar(255) not null,
    paid_on varchar(255),
    policy_id varchar(255),
    recorded_by varchar(255),
    reference varchar(255),
    source varchar(255),
    status varchar(255),
    primary key (id)
);

create table policies (
    debit_day integer not null,
    main_age_bps integer not null,
    privacy_version integer,
    terms_version integer,
    base_monthly_cents bigint not null,
    cancel_requested_at timestamp(6) with time zone,
    consent_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone,
    main_fee_cents bigint not null,
    monthly_total_cents bigint not null,
    reinstate_requested_at timestamp(6) with time zone,
    reviewed_at timestamp(6) with time zone,
    bundle_versions_json text,
    cancelled_at varchar(255),
    holder_dob varchar(255),
    holder_id_number varchar(255),
    holder_name varchar(255),
    id varchar(255) not null,
    lapsed_at varchar(255),
    mandate_status varchar(255),
    reference varchar(255) unique,
    start_date varchar(255),
    status varchar(255),
    user_id varchar(255),
    waiting_ends_on varchar(255),
    primary key (id)
);

create table policy_members (
    age_bps integer not null,
    multiplier_bps integer not null,
    position integer not null,
    fee_cents bigint not null,
    added_on varchar(255),
    cover_starts_on varchar(255),
    date_of_birth varchar(255),
    full_name varchar(255),
    id varchar(255) not null,
    id_number varchar(255),
    policy_id varchar(255) not null,
    relationship varchar(255),
    status varchar(255),
    primary key (id)
);

create table staff_users (
    email varchar(255) not null unique,
    full_name varchar(255),
    id varchar(255) not null,
    password_hash varchar(255) not null,
    role varchar(255),
    primary key (id)
);

create table support_requests (
    created_at timestamp(6) with time zone,
    updated_at timestamp(6) with time zone,
    staff_note varchar(2000),
    message varchar(4000),
    contact_phone varchar(255),
    id varchar(255) not null,
    kind varchar(255),
    order_ref varchar(255),
    status varchar(255),
    user_id varchar(255),
    primary key (id)
);

create table users (
    failed_logins integer not null,
    notify_claims boolean not null,
    notify_news boolean not null,
    notify_payments boolean not null,
    phone_verified boolean not null,
    created_at timestamp(6) with time zone,
    locked_until timestamp(6) with time zone,
    email varchar(255),
    full_name varchar(255),
    id varchar(255) not null,
    password_hash varchar(255) not null,
    phone varchar(255) not null unique,
    primary key (id)
);

create table waitlist_entries (
    consent_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone,
    email varchar(255),
    first_name varchar(255),
    id varchar(255) not null,
    phone varchar(255),
    province varchar(255),
    primary key (id)
);

create index idx_claim_documents_claim on claim_documents (claim_id);
create index idx_notifications_user_created on notifications (user_id, created_at);
create index idx_otp_codes_phone_purpose on otp_codes (phone, purpose);
alter table if exists benefit_item_contents add constraint fk_benefit_item_contents_item foreign key (item_id) references benefit_items;
alter table if exists cover_age_bands add constraint fk_cover_age_bands_config foreign key (config_id) references cover_config;
alter table if exists cover_relationship_rules add constraint fk_cover_relationship_rules_config foreign key (config_id) references cover_config;
alter table if exists policy_members add constraint fk_policy_members_policy foreign key (policy_id) references policies;
