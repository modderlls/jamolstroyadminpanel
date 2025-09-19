-- Complete security setup based on actual database schema
-- This script sets up RLS policies and admin permissions for the existing tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (is_admin());

-- Orders table policies (includes rental orders data)
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (is_admin());

-- Order items policies
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

CREATE POLICY "Users can view their order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL USING (is_admin());

-- Rental orders policies
DROP POLICY IF EXISTS "Users can view their rental orders" ON public.rental_orders;
DROP POLICY IF EXISTS "Admins can view all rental orders" ON public.rental_orders;
DROP POLICY IF EXISTS "Admins can manage all rental orders" ON public.rental_orders;

CREATE POLICY "Users can view their rental orders" ON public.rental_orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all rental orders" ON public.rental_orders
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage all rental orders" ON public.rental_orders
  FOR ALL USING (is_admin());

-- Products policies
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;

CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT USING (is_available = true OR is_admin());

CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (is_admin());

-- Categories policies
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage all categories" ON public.categories;

CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage all categories" ON public.categories
  FOR ALL USING (is_admin());

-- Workers policies
DROP POLICY IF EXISTS "Anyone can view available workers" ON public.workers;
DROP POLICY IF EXISTS "Admins can manage all workers" ON public.workers;

CREATE POLICY "Anyone can view available workers" ON public.workers
  FOR SELECT USING (is_available = true OR is_admin());

CREATE POLICY "Admins can manage all workers" ON public.workers
  FOR ALL USING (is_admin());

-- Workers documents policies (sensitive data)
DROP POLICY IF EXISTS "Only admins can view worker documents" ON public.workers_documents;
DROP POLICY IF EXISTS "Only admins can manage worker documents" ON public.workers_documents;

CREATE POLICY "Only admins can view worker documents" ON public.workers_documents
  FOR SELECT USING (is_admin());

CREATE POLICY "Only admins can manage worker documents" ON public.workers_documents
  FOR ALL USING (is_admin());

-- Payments policies
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

CREATE POLICY "Users can view their payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = payments.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage all payments" ON public.payments
  FOR ALL USING (is_admin());

-- Ads policies
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can manage all ads" ON public.ads;

CREATE POLICY "Anyone can view active ads" ON public.ads
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage all ads" ON public.ads
  FOR ALL USING (is_admin());

-- Company policies
DROP POLICY IF EXISTS "Anyone can view active company info" ON public.company;
DROP POLICY IF EXISTS "Admins can manage company info" ON public.company;

CREATE POLICY "Anyone can view active company info" ON public.company
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage company info" ON public.company
  FOR ALL USING (is_admin());

-- Addresses policies
DROP POLICY IF EXISTS "Users can manage their addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;

CREATE POLICY "Users can manage their addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all addresses" ON public.addresses
  FOR SELECT USING (is_admin());

-- Cart items policies
DROP POLICY IF EXISTS "Users can manage their cart" ON public.cart_items;
DROP POLICY IF EXISTS "Admins can view all cart items" ON public.cart_items;

CREATE POLICY "Users can manage their cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = customer_id);

CREATE POLICY "Admins can view all cart items" ON public.cart_items
  FOR SELECT USING (is_admin());

-- Product reviews policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can manage their reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.product_reviews;

CREATE POLICY "Anyone can view reviews" ON public.product_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their reviews" ON public.product_reviews
  FOR ALL USING (auth.uid() = customer_id OR auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews" ON public.product_reviews
  FOR ALL USING (is_admin());

-- Reviews policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can manage their reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;

CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their reviews" ON public.reviews
  FOR ALL USING (auth.uid() = reviewer_id OR auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews" ON public.reviews
  FOR ALL USING (is_admin());

-- Create admin activity tracking table
CREATE TABLE IF NOT EXISTS public.admin_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.users(id),
  activity_type text NOT NULL,
  description text,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin activities
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin activities" ON public.admin_activities
  FOR SELECT USING (is_admin());

CREATE POLICY "Only admins can create admin activities" ON public.admin_activities
  FOR INSERT WITH CHECK (is_admin());

-- Create KPI tracking table
CREATE TABLE IF NOT EXISTS public.admin_kpis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.users(id),
  date date DEFAULT CURRENT_DATE,
  orders_processed integer DEFAULT 0,
  payments_confirmed integer DEFAULT 0,
  rentals_managed integer DEFAULT 0,
  workers_assigned integer DEFAULT 0,
  debt_cases_resolved integer DEFAULT 0,
  customer_issues_resolved integer DEFAULT 0,
  products_added integer DEFAULT 0,
  categories_managed integer DEFAULT 0,
  total_revenue_processed numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(admin_id, date)
);

-- Enable RLS on KPIs
ALTER TABLE public.admin_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all KPIs" ON public.admin_kpis
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage their KPIs" ON public.admin_kpis
  FOR ALL USING (is_admin());

-- Create function to update KPIs
CREATE OR REPLACE FUNCTION public.update_admin_kpi(
  p_admin_id uuid,
  p_activity_type text,
  p_amount numeric DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.admin_kpis (admin_id, date)
  VALUES (p_admin_id, CURRENT_DATE)
  ON CONFLICT (admin_id, date) DO NOTHING;
  
  CASE p_activity_type
    WHEN 'order_processed' THEN
      UPDATE public.admin_kpis 
      SET orders_processed = orders_processed + 1,
          updated_at = now()
      WHERE admin_id = p_admin_id AND date = CURRENT_DATE;
    
    WHEN 'payment_confirmed' THEN
      UPDATE public.admin_kpis 
      SET payments_confirmed = payments_confirmed + 1,
          total_revenue_processed = total_revenue_processed + p_amount,
          updated_at = now()
      WHERE admin_id = p_admin_id AND date = CURRENT_DATE;
    
    WHEN 'rental_managed' THEN
      UPDATE public.admin_kpis 
      SET rentals_managed = rentals_managed + 1,
          updated_at = now()
      WHERE admin_id = p_admin_id AND date = CURRENT_DATE;
    
    WHEN 'worker_assigned' THEN
      UPDATE public.admin_kpis 
      SET workers_assigned = workers_assigned + 1,
          updated_at = now()
      WHERE admin_id = p_admin_id AND date = CURRENT_DATE;
    
    WHEN 'debt_resolved' THEN
      UPDATE public.admin_kpis 
      SET debt_cases_resolved = debt_cases_resolved + 1,
          updated_at = now()
      WHERE admin_id = p_admin_id AND date = CURRENT_DATE;
    
    WHEN 'customer_issue_resolved' THEN
      UPDATE public.admin_kpis 
      SET customer_issues_resolved = customer_issues_resolved + 1,
          updated_at = now()
      WHERE admin_id = p_admin_id AND date = CURRENT_DATE;
    
    WHEN 'product_added' THEN
      UPDATE public.admin_kpis 
      SET products_added = products_added + 1,
          updated_at = now()
      WHERE admin_id = p_admin_id AND date = CURRENT_DATE;
    
    WHEN 'category_managed' THEN
      UPDATE public.admin_kpis 
      SET categories_managed = categories_managed + 1,
          updated_at = now()
      WHERE admin_id = p_admin_id AND date = CURRENT_DATE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_product_type ON public.orders(product_type);
CREATE INDEX IF NOT EXISTS idx_rental_orders_customer_id ON public.rental_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON public.rental_orders(status);
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON public.admin_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_kpis_admin_id_date ON public.admin_kpis(admin_id, date);

-- Insert default admin user if not exists
INSERT INTO public.users (
  id,
  first_name,
  last_name,
  role,
  phone_number,
  email,
  is_verified
) 
SELECT 
  gen_random_uuid(),
  'Super',
  'Admin',
  'super_admin',
  '+998901234567',
  'admin@jamolstroy.uz',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE role = 'super_admin'
);

COMMIT;
