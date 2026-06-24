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
