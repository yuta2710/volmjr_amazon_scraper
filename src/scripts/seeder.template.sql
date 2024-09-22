-- psql -h aws-0-ap-southeast-1.pooler.supabase.com -U postgres.pbrravmvyawomfjjzhde -d postgres -a -f seed.sql

create table grandparent (
  id serial primary key,
  name text
);

create table parent (
  id serial primary key,
  name text,
  parent_id integer references grandparent (id)
    on delete cascade
);

create table child (
  id serial primary key,
  name text,
  father integer references parent (id)
    on delete restrict
);


