-- V6: what happens after a death. A person's cover (and their premium) ends; if it is the main member, cover for the rest of the family
-- continues for a short while so someone can take over.
alter table policy_members add column deceased_on varchar(255);
alter table policies add column holder_died_on varchar(255);
alter table policies add column continuation_until varchar(255);
