-- Enums
CREATE TYPE role AS ENUM ('ADMIN', 'MANAGER', 'VENDOR', 'PLAYER');
CREATE TYPE injury_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE referral_status AS ENUM ('NONE', 'PENDING', 'REFERRED', 'COMPLETED');
CREATE TYPE fixture_status AS ENUM ('SCHEDULED', 'POSTPONED', 'COMPLETED', 'CANCELLED');
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'REFUNDED');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role role NOT NULL DEFAULT 'PLAYER',
  vendor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendor
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If you want users to be linked to vendors
ALTER TABLE users
  ADD CONSTRAINT fk_users_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- League
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team (linked to a manager user via manager_id)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  league_id UUID NOT NULL,
  manager_id UUID, -- should reference a user with role = MANAGER (enforce in app / via trigger)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_teams_league FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Player
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- optional mapping to a user account
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE,
  team_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_players_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_players_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Fixture
CREATE TABLE fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL,
  home_team_id UUID NOT NULL,
  away_team_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  status fixture_status NOT NULL DEFAULT 'SCHEDULED',
  home_score INT,
  away_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_fixtures_league FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  CONSTRAINT fk_fixtures_home_team FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_fixtures_away_team FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT chk_fixtures_distinct_teams CHECK (home_team_id <> away_team_id)
);

-- Injury (tracks referrals to AO Clinic)
CREATE TABLE injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  reported_by_id UUID, -- user who reported
  injury_type TEXT NOT NULL,
  severity injury_severity NOT NULL DEFAULT 'MEDIUM',
  referral_status referral_status NOT NULL DEFAULT 'NONE',
  referred_to TEXT,        -- e.g., 'AO Clinic'
  referral_date TIMESTAMPTZ,
  referral_reference TEXT, -- clinic ticket / ref #
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_injuries_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  CONSTRAINT fk_injuries_reporter FOREIGN KEY (reported_by_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Product (New Trends kits etc.)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_products_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Orders (for New Trends kits) with commission calculation (10%)
-- commission_amount_cents is a GENERATED column calculated at DB-level:
-- commission_amount_cents = round(order_total_cents * 0.10) (nearest cent)
-- We compute: round(cents/10) = (order_total_cents + 5) / 10 using integer arithmetic
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  order_total_cents INT NOT NULL CHECK (order_total_cents >= 0),
  commission_percentage NUMERIC(5,4) NOT NULL DEFAULT 0.10, -- stored for audit/flexibility
  commission_amount_cents INT GENERATED ALWAYS AS ((order_total_cents + 5) / 10) STORED,
  status order_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for common lookup patterns
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_teams_league_id ON teams(league_id);
CREATE INDEX idx_fixtures_league_id ON fixtures(league_id);
CREATE INDEX idx_injuries_player_id ON injuries(player_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);

-- NOTE:
-- 1) This DDL enforces referential integrity. Enforcement that a team's manager has role = 'MANAGER'
--    is not enforced by the FK alone. Add an application-level check or a DB trigger to enforce role correctness.
-- 2) commission_amount_cents is derived from order_total_cents using integer math and a fixed 10% rate.
--    If you want commission_percentage to be authoritative, you'd use a computed expression with numeric math:
--      commission_amount_cents = ROUND(order_total_cents * commission_percentage)
--    but mixing integer CENTS and NUMERIC expressions requires casting; the current approach keeps cents-integer math simple.