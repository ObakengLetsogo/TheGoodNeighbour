-- V8: funeral wishes. What each covered person would like, recorded by the plan's owner, so the family and our team know at the worst moment.
create table funeral_wishes (
    id varchar(255) not null,
    policy_id varchar(255) not null,
    member_key varchar(255) not null,
    disposition varchar(255),
    place varchar(255),
    denomination varchar(255),
    music varchar(1000),
    notes varchar(2000),
    contact_name varchar(255),
    contact_phone varchar(255),
    updated_at timestamp(6) with time zone,
    updated_by varchar(255),
    primary key (id)
);
create unique index uq_funeral_wishes_person on funeral_wishes (policy_id, member_key);
