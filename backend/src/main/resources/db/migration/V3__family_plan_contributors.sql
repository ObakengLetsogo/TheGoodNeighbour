-- V3: family plans. Several people can share the monthly cost of one cover (siblings paying for their parents, for example).
create table policy_contributors (
    id varchar(255) not null,
    policy_id varchar(255) not null,
    user_id varchar(255),
    phone varchar(255) not null,
    name varchar(255) not null,
    status varchar(255) not null,
    share_bps integer not null,
    invited_at timestamp(6) with time zone,
    responded_at timestamp(6) with time zone,
    primary key (id)
);
create index idx_policy_contributors_policy on policy_contributors (policy_id);
create index idx_policy_contributors_phone on policy_contributors (phone);
create index idx_policy_contributors_user on policy_contributors (user_id);

-- Who a payment came from. Empty means the plan's owner.
alter table payment_records add column contributor_user_id varchar(255);
