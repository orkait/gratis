-- Gratis as a service: durable state.
--
-- Everything here previously lived in memory or on Railway's EPHEMERAL disk, which meant it was
-- silently destroyed on every deploy. The availability store is the clearest case: the market spent
-- an hour learning which models are dead, and a deploy threw that away - prod carried 291 models
-- while dev, having finished a sweep, carried 270.

create table if not exists api_keys (
    id          uuid primary key default gen_random_uuid(),
    tenant      text        not null,
    name        text        not null,
    -- The raw key is shown ONCE, at creation, and never stored. What we keep is a SHA-256 digest,
    -- so a database leak does not hand an attacker working credentials.
    key_hash    text        not null unique,
    -- Display only ("gr_live_a1b2..."), so a human can identify a key without it being usable.
    key_prefix  text        not null,
    scopes      text[]      not null default '{}',
    created_at  timestamptz not null default now(),
    last_used_at timestamptz,
    revoked_at  timestamptz
);

create index if not exists api_keys_tenant_idx on api_keys (tenant) where revoked_at is null;

-- Metering. Written on every authenticated request so rate limits, quotas and (later) billing have
-- something real to stand on. Retrofitting this would mean no history for the period before it.
create table if not exists usage_events (
    id                bigserial primary key,
    key_id            uuid references api_keys (id) on delete set null,
    endpoint          text        not null,
    model_id          text,
    status            integer     not null,
    prompt_tokens     integer,
    completion_tokens integer,
    latency_ms        integer,
    created_at        timestamptz not null default now()
);

-- The rate limiter and the usage report both read this; without the index they both table-scan.
create index if not exists usage_events_key_time_idx on usage_events (key_id, created_at desc);

-- Was SQLite on an ephemeral disk. Every deploy erased an hour of learning about which models
-- actually answer.
create table if not exists model_availability (
    model_id   text primary key,
    status     text        not null,
    reason     text,
    checked_at timestamptz not null default now(),
    expires_at timestamptz
);

create index if not exists model_availability_live_idx
    on model_availability (status)
    where status = 'unavailable';

-- The assembled market, so a cold instance can answer immediately instead of refetching ~10
-- upstreams (5 provider catalogues + Artificial Analysis + the arena feed) before its first reply.
create table if not exists market_snapshots (
    id          bigserial primary key,
    captured_at timestamptz not null default now(),
    models      jsonb       not null
);

create index if not exists market_snapshots_time_idx on market_snapshots (captured_at desc);

-- Per-model time series. "Did this model get cheaper?" and "is its score drifting?" are questions
-- the market could never answer, because it only ever knew about right now.
create table if not exists model_history (
    model_id     text        not null,
    captured_at  timestamptz not null,
    overall      double precision,
    intelligence double precision,
    price_in     double precision,
    price_out    double precision,
    is_free      boolean,
    primary key (model_id, captured_at)
);

create index if not exists model_history_model_idx on model_history (model_id, captured_at desc);
