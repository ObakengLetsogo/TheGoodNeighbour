-- V7: a guardrail on family plans. Every payer costs a collection fee, so each contributor's share must be worth at least this much a month.
alter table cover_config add column min_contribution_cents bigint not null default 5000;
