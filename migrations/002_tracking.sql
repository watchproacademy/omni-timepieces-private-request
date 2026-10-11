CREATE TABLE IF NOT EXISTS tracking_access (
 token_hash text PRIMARY KEY, role text NOT NULL CHECK(role IN ('owner','customer')),
 inquiry_id text REFERENCES inquiries(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, session boolean NOT NULL DEFAULT false,
 CHECK(role='owner' OR inquiry_id IS NOT NULL)
);
-- statement
CREATE TABLE IF NOT EXISTS watch_progress (
 inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 watch_id text NOT NULL, stage text NOT NULL DEFAULT 'received' CHECK(stage IN ('received','sourcing','quoted','waiting','cancelled')),
 note text NOT NULL DEFAULT '', order_id text, line_id text,
 snapshot jsonb, checked_at timestamptz, version integer NOT NULL DEFAULT 0,
 PRIMARY KEY(inquiry_id,watch_id), CHECK((order_id IS NULL)=(line_id IS NULL))
);
-- statement
CREATE UNIQUE INDEX IF NOT EXISTS tracking_unique_order_line ON watch_progress(order_id,line_id) WHERE order_id IS NOT NULL;
-- statement
CREATE TABLE IF NOT EXISTS tracking_history (
 id bigserial PRIMARY KEY, inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
 watch_id text NOT NULL, stage text NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
