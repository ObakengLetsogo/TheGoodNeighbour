-- V5: a claim can be taken as the bundle or as cash. The cash alternative is worked out from our cost of the bundle when the claim is made.
alter table cover_config add column cash_alternative_bps integer not null default 10000;
alter table claims add column benefit_choice varchar(255) not null default 'bundle';
alter table claims add column cash_alternative_cents bigint not null default 0;
alter table claims add column our_cost_cents bigint not null default 0;
