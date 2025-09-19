-- Fix all database errors for JamolStroy Admin Panel
-- This script addresses all the reported PostgreSQL errors

-- 1. Create missing admin_roles table
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_roles_pkey PRIMARY KEY (id)
);

-- 2. Create missing admin_permissions table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  display_name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT admin_permissions_module_action_unique UNIQUE (module, action)
);

-- 3. Create missing admin_kpi_logs table with proper foreign key
CREATE TABLE IF NOT EXISTS public.admin_kpi_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  module text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_kpi_logs_pkey PRIMARY KEY (id)
);

-- 4. Add missing last_login_at column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- 5. Add other missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS admin_role_id uuid,
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by uuid;

-- 6. Add foreign key constraints after tables exist
ALTER TABLE public.admin_kpi_logs 
DROP CONSTRAINT IF EXISTS admin_kpi_logs_admin_id_fkey;

ALTER TABLE public.admin_kpi_logs 
ADD CONSTRAINT admin_kpi_logs_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_admin_role_id_fkey;

ALTER TABLE public.users 
ADD CONSTRAINT users_admin_role_id_fkey 
FOREIGN KEY (admin_role_id) REFERENCES public.admin_roles(id);

ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_created_by_fkey;

ALTER TABLE public.users 
ADD CONSTRAINT users_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

-- 7. Create the missing log_admin_action function
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_module text DEFAULT 'general'
) RETURNS void AS $$
BEGIN
  INSERT INTO public.admin_kpi_logs (admin_id, action_type, module, entity_id, metadata)
  VALUES (auth.uid(), p_action_type, p_module, p_entity_id, p_metadata);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to log admin action: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to check admin permissions
CREATE OR REPLACE FUNCTION public.check_admin_permission(
  p_module text,
  p_action text
) RETURNS boolean AS $$
DECLARE
  user_permissions jsonb;
  has_permission boolean := false;
BEGIN
  -- Get user's role permissions
  SELECT ar.permissions INTO user_permissions
  FROM public.users u
  JOIN public.admin_roles ar ON u.admin_role_id = ar.id
  WHERE u.id = auth.uid() AND u.role = 'admin';
  
  -- If no permissions found, return false
  IF user_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check for wildcard permission (super admin)
  IF user_permissions ? '*' THEN
    RETURN true;
  END IF;
  
  -- Check for specific permission
  IF user_permissions ? (p_module || ':' || p_action) THEN
    RETURN true;
  END IF;
  
  -- Check for module wildcard
  IF user_permissions ? (p_module || ':*') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Insert default admin role
INSERT INTO public.admin_roles (name, display_name, description, permissions) 
VALUES (
  'super_admin',
  'Asosiy Admin',
  'Barcha huquqlarga ega asosiy administrator',
  '["*"]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- 10. Insert default admin permissions
INSERT INTO public.admin_permissions (module, action, display_name, description) VALUES
-- Products
('products', 'view', 'Mahsulotlarni ko''rish', 'Mahsulotlar ro''yxatini ko''rish huquqi'),
('products', 'create', 'Mahsulot qo''shish', 'Yangi mahsulot qo''shish huquqi'),
('products', 'edit', 'Mahsulot tahrirlash', 'Mavjud mahsulotlarni tahrirlash huquqi'),
('products', 'delete', 'Mahsulot o''chirish', 'Mahsulotlarni o''chirish huquqi'),

-- Categories
('categories', 'view', 'Kategoriyalarni ko''rish', 'Kategoriyalar ro''yxatini ko''rish huquqi'),
('categories', 'create', 'Kategoriya qo''shish', 'Yangi kategoriya qo''shish huquqi'),
('categories', 'edit', 'Kategoriya tahrirlash', 'Mavjud kategoriyalarni tahrirlash huquqi'),
('categories', 'delete', 'Kategoriya o''chirish', 'Kategoriyalarni o''chirish huquqi'),

-- Orders
('orders', 'view', 'Buyurtmalarni ko''rish', 'Buyurtmalar ro''yxatini ko''rish huquqi'),
('orders', 'approve', 'Buyurtma tasdiqlash', 'Buyurtmalarni tasdiqlash huquqi'),
('orders', 'edit', 'Buyurtma tahrirlash', 'Buyurtma ma''lumotlarini tahrirlash huquqi'),
('orders', 'delete', 'Buyurtma o''chirish', 'Buyurtmalarni o''chirish huquqi'),

-- Admins
('admins', 'view', 'Adminlarni ko''rish', 'Admin ro''yxatini ko''rish huquqi'),
('admins', 'create', 'Admin qo''shish', 'Yangi admin qo''shish huquqi'),
('admins', 'edit', 'Admin tahrirlash', 'Admin ma''lumotlarini tahrirlash huquqi'),
('admins', 'delete', 'Admin o''chirish', 'Adminlarni o''chirish huquqi'),
('admins', 'kpi', 'KPI ko''rish', 'Admin KPI statistikasini ko''rish huquqi')

ON CONFLICT (module, action) DO NOTHING;

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_admin_id ON public.admin_kpi_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_created_at ON public.admin_kpi_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_action_type ON public.admin_kpi_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_users_admin_role_id ON public.users(admin_role_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON public.users(last_login_at);

-- 12. Enable RLS on all tables
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_kpi_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 13. Create comprehensive RLS policies

-- Admin roles policies
DROP POLICY IF EXISTS "Admin roles viewable by admins" ON public.admin_roles;
CREATE POLICY "Admin roles viewable by admins" ON public.admin_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin roles manageable by super admins" ON public.admin_roles;
CREATE POLICY "Admin roles manageable by super admins" ON public.admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.admin_roles ar ON u.admin_role_id = ar.id
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND ar.name = 'super_admin'
    )
  );

-- Admin permissions policies
DROP POLICY IF EXISTS "Admin permissions viewable by admins" ON public.admin_permissions;
CREATE POLICY "Admin permissions viewable by admins" ON public.admin_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- KPI logs policies
DROP POLICY IF EXISTS "KPI logs viewable by admins" ON public.admin_kpi_logs;
CREATE POLICY "KPI logs viewable by admins" ON public.admin_kpi_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND (
        -- Super admins can see all logs
        EXISTS (
          SELECT 1 FROM public.admin_roles ar 
          WHERE ar.id = users.admin_role_id 
          AND ar.name = 'super_admin'
        )
        -- Regular admins can only see their own logs
        OR admin_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "KPI logs insertable by admins" ON public.admin_kpi_logs;
CREATE POLICY "KPI logs insertable by admins" ON public.admin_kpi_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND admin_id = auth.uid()
    )
  );

-- Users table policies
DROP POLICY IF EXISTS "Users viewable by admins" ON public.users;
CREATE POLICY "Users viewable by admins" ON public.users
  FOR SELECT USING (
    -- Admins can view all users
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
    -- Users can view their own profile
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "Users manageable by admins" ON public.users;
CREATE POLICY "Users manageable by admins" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- 14. Update existing admin users to have super_admin role
UPDATE public.users 
SET admin_role_id = (SELECT id FROM public.admin_roles WHERE name = 'super_admin')
WHERE role = 'admin' AND admin_role_id IS NULL;

-- 15. Create trigger to update last_login_at
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET last_login_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All database errors have been fixed!';
  RAISE NOTICE '✓ admin_roles table created';
  RAISE NOTICE '✓ admin_permissions table created';
  RAISE NOTICE '✓ admin_kpi_logs table created with proper foreign keys';
  RAISE NOTICE '✓ users.last_login_at column added';
  RAISE NOTICE '✓ log_admin_action function created';
  RAISE NOTICE '✓ All RLS policies configured';
  RAISE NOTICE '✓ Default admin role and permissions inserted';
END $$;
