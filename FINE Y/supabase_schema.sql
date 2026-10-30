-- FarmProfit Database Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
create extension if not exists "uuid-ossp";

-- Users table
create table users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  password_hash text not null,
  role text check (role in ('farmer', 'buyer', 'admin')) not null,
  name text not null,
  verified boolean default false,
  created_at timestamptz default now()
);

-- Crop listings
create table crop_listings (
  id uuid default uuid_generate_v4() primary key,
  farmer_id uuid references users(id) on delete cascade,
  farmer_name text,
  crop_name text not null,
  variety text,
  quantity numeric not null,
  quality_grade text check (quality_grade in ('A', 'B+', 'B', 'C')),
  unit text check (unit in ('kg', 'quintal', 'ton')),
  harvest_date date,
  location text,
  expected_price numeric,
  storage_available boolean default false,
  photo_url text,
  voice_input text,
  status text check (status in ('active', 'sold', 'reserved')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Buyer requirements
create table buyer_requirements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) on delete cascade,
  buyer_name text,
  required_crop text not null,
  required_quantity numeric not null,
  quality_requirement text,
  location text,
  deadline date,
  max_price numeric,
  status text check (status in ('active', 'fulfilled', 'cancelled')) default 'active',
  created_at timestamptz default now()
);

-- Offers
create table offers (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references crop_listings(id) on delete cascade,
  buyer_id uuid references users(id) on delete cascade,
  buyer_name text,
  farmer_id uuid references users(id) on delete cascade,
  offered_price numeric not null,
  required_quantity numeric not null,
  total_offer_value numeric,
  estimated_net_income numeric,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transactions / Orders
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  offer_id uuid references offers(id) on delete cascade,
  listing_id uuid references crop_listings(id) on delete cascade,
  buyer_id uuid references users(id) on delete cascade,
  farmer_id uuid references users(id) on delete cascade,
  amount numeric not null,
  status text check (status in ('accepted', 'completed', 'cancelled')) default 'accepted',
  order_stage text check (order_stage in ('accepted', 'pickup_scheduled', 'picked_up', 'delivered', 'quality_verified', 'payment_pending', 'payment_completed')) default 'accepted',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Storage options
create table storage_options (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text,
  available_capacity numeric,
  cost_per_quintal_per_day numeric,
  spoilage_risk text check (spoilage_risk in ('low', 'medium', 'high')),
  distance_km numeric,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Transport rates
create table transport_rates (
  id uuid default uuid_generate_v4() primary key,
  transporter_name text not null,
  location text,
  vehicle_capacity numeric,
  pickup_cost numeric,
  estimated_delivery_hours numeric,
  distance_km numeric,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Market prices
create table market_prices (
  id uuid default uuid_generate_v4() primary key,
  crop_name text not null,
  variety text,
  price_per_quintal numeric not null,
  location text,
  date date default current_date,
  created_at timestamptz default now()
);

-- Sync queue for offline actions
create table sync_queue (
  id uuid default uuid_generate_v4() primary key,
  client_id text,
  action_type text not null,
  action_data jsonb,
  local_id text,
  timestamp timestamptz,
  status text check (status in ('pending', 'synced', 'failed')) default 'pending',
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security
alter table users enable row level security;
alter table crop_listings enable row level security;
alter table buyer_requirements enable row level security;
alter table offers enable row level security;
alter table transactions enable row level security;
alter table storage_options enable row level security;
alter table transport_rates enable row level security;
alter table market_prices enable row level security;
alter table sync_queue enable row level security;

-- Policies (allow all for hackathon demo - restrict in production)
create policy "Allow all on users" on users for all using (true);
create policy "Allow all on crop_listings" on crop_listings for all using (true);
create policy "Allow all on buyer_requirements" on buyer_requirements for all using (true);
create policy "Allow all on offers" on offers for all using (true);
create policy "Allow all on transactions" on transactions for all using (true);
create policy "Allow all on storage_options" on storage_options for all using (true);
create policy "Allow all on transport_rates" on transport_rates for all using (true);
create policy "Allow all on market_prices" on market_prices for all using (true);
create policy "Allow all on sync_queue" on sync_queue for all using (true);

-- Insert demo data
insert into users (email, password_hash, role, name, verified) values
  ('demo@farmprofit.com', 'demo123', 'farmer', 'Demo Farmer', true),
  ('buyer@farmprofit.com', 'demo123', 'buyer', 'Demo Buyer', true),
  ('admin@farmprofit.com', 'admin123', 'admin', 'Admin', true);

insert into storage_options (name, location, available_capacity, cost_per_quintal_per_day, spoilage_risk, distance_km) values
  ('ColdStore Punjab', 'Punjab, India', 450, 8, 'low', 8),
  ('AgriWarehouse North', 'Haryana, India', 1200, 6, 'medium', 15),
  ('HarvestSafe Silos', 'Punjab, India', 800, 7, 'low', 22);

insert into transport_rates (transporter_name, location, vehicle_capacity, pickup_cost, estimated_delivery_hours, distance_km) values
  ('Kisan Logistics', 'Punjab, India', 10, 4500, 12, 10),
  ('GreenMove Trucking', 'Haryana, India', 20, 7200, 18, 18),
  ('AgriHaul Carriers', 'Punjab, India', 15, 5800, 14, 25);

insert into market_prices (crop_name, variety, price_per_quintal, location, date) values
  ('Basmati Rice', 'Pusa Basmati 1121', 2400, 'Punjab, India', current_date),
  ('Wheat', 'HD-2967', 2100, 'Punjab, India', current_date),
  ('Mustard Seeds', 'Varuna', 5200, 'Rajasthan, India', current_date),
  ('Tur Dal', 'TT-401', 3200, 'Karnataka, India', current_date);

-- Indexes for performance
create index idx_crop_listings_farmer_id on crop_listings(farmer_id);
create index idx_crop_listings_status on crop_listings(status);
create index idx_offers_listing_id on offers(listing_id);
create index idx_offers_status on offers(status);
create index idx_transactions_farmer_id on transactions(farmer_id);
create index idx_transactions_buyer_id on transactions(buyer_id);
create index idx_sync_queue_status on sync_queue(status);