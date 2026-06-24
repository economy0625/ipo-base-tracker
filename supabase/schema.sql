create table if not exists companies (
  stock_code text primary key,
  company_name text not null,
  market text not null default 'KOSDAQ',
  listing_date date not null,
  ipo_price numeric not null,
  adjusted_ipo_price numeric not null,
  industry text not null,
  theme_tags text[] not null default '{}',
  business_summary text not null default '',
  is_spac boolean not null default false,
  is_transfer_listing boolean not null default false,
  is_spac_merger boolean not null default false,
  is_tech_special boolean not null default false,
  is_bio boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_prices (
  id bigint generated always as identity primary key,
  stock_code text not null references companies(stock_code) on delete cascade,
  trade_date date not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  adjusted_close numeric not null,
  volume bigint not null,
  trading_value numeric not null,
  created_at timestamptz not null default now(),
  unique (stock_code, trade_date)
);

create table if not exists ipo_metrics (
  stock_code text primary key references companies(stock_code) on delete cascade,
  current_price numeric not null,
  return_vs_ipo numeric not null,
  post_listing_high numeric not null,
  post_listing_low numeric not null,
  drawdown_from_high numeric not null,
  rebound_from_low numeric not null,
  days_since_listing integer not null,
  ma20 numeric not null,
  ma60 numeric not null,
  ma120 numeric not null,
  volume_ratio_20d numeric not null,
  updated_at timestamptz not null default now()
);

create table if not exists group_scores (
  stock_code text primary key references companies(stock_code) on delete cascade,
  current_group text not null check (current_group in ('S', 'A', 'B', 'C', 'D')),
  total_score numeric not null,
  chart_score numeric not null,
  volume_score numeric not null,
  financial_score numeric not null,
  business_score numeric not null,
  risk_score numeric not null,
  group_reason text not null default '',
  is_manual boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists cup_handle_patterns (
  stock_code text primary key references companies(stock_code) on delete cascade,
  cup_left_peak_date date,
  cup_left_peak_price numeric,
  cup_low_date date,
  cup_low_price numeric,
  cup_depth_percent numeric,
  base_days integer not null default 0,
  handle_start_date date,
  handle_end_date date,
  handle_depth_percent numeric,
  pivot_price numeric,
  breakout_date date,
  breakout_close numeric,
  breakout_volume_ratio numeric,
  breakout_maintained_days integer not null default 0,
  pattern_status text not null default 'NONE',
  updated_at timestamptz not null default now()
);

create table if not exists signals (
  stock_code text not null references companies(stock_code) on delete cascade,
  signal_date date not null,
  signal_type text not null,
  strength text check (strength in ('low', 'medium', 'high')),
  current_group text check (current_group in ('S', 'A', 'B', 'C', 'D')),
  close_price numeric,
  volume bigint,
  description text,
  created_at timestamptz not null default now(),
  primary key (stock_code, signal_date, signal_type)
);

create index if not exists idx_companies_listing_date on companies(listing_date desc);
create index if not exists idx_companies_industry on companies(industry);
create index if not exists idx_daily_prices_stock_date on daily_prices(stock_code, trade_date desc);
create index if not exists idx_group_scores_group on group_scores(current_group);
create index if not exists idx_signals_date on signals(signal_date desc);

alter table companies enable row level security;
alter table daily_prices enable row level security;
alter table ipo_metrics enable row level security;
alter table group_scores enable row level security;
alter table cup_handle_patterns enable row level security;
alter table signals enable row level security;

drop policy if exists "Public read companies" on companies;
create policy "Public read companies"
on companies for select
to anon, authenticated
using (true);

drop policy if exists "Public read daily prices" on daily_prices;
create policy "Public read daily prices"
on daily_prices for select
to anon, authenticated
using (true);

drop policy if exists "Public read IPO metrics" on ipo_metrics;
create policy "Public read IPO metrics"
on ipo_metrics for select
to anon, authenticated
using (true);

drop policy if exists "Public read group scores" on group_scores;
create policy "Public read group scores"
on group_scores for select
to anon, authenticated
using (true);

drop policy if exists "Public read cup handle patterns" on cup_handle_patterns;
create policy "Public read cup handle patterns"
on cup_handle_patterns for select
to anon, authenticated
using (true);

drop policy if exists "Public read signals" on signals;
create policy "Public read signals"
on signals for select
to anon, authenticated
using (true);
