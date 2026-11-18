-- V4: a plan's owner can pay for a plan without being covered themselves (for example, siblings covering their parents).
alter table policies add column cover_main_member boolean not null default true;
