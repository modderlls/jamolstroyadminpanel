-- Create admin roles and permissions system
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

-- Create admin permissions table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  module text NOT NULL, -- products, categories, orders, users, etc.
  action text NOT NULL, -- view, create, edit, delete, approve, etc.
  display_name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT admin_permissions_module_action_unique UNIQUE (module, action)
);

-- Create KPI tracking table
CREATE TABLE IF NOT EXISTS public.admin_kpi_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL, -- login, product_create, order_approve, etc.
  module text NOT NULL, -- products, orders, users, etc.
  entity_id uuid, -- ID of the affected entity
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_kpi_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_kpi_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Update users table to support admin roles
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS admin_role_id uuid,
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS created_by uuid;

-- Add foreign key constraint for admin role
ALTER TABLE public.users 
ADD CONSTRAINT users_admin_role_id_fkey 
FOREIGN KEY (admin_role_id) REFERENCES public.admin_roles(id);

-- Add foreign key constraint for created_by
ALTER TABLE public.users 
ADD CONSTRAINT users_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Insert default admin role
INSERT INTO public.admin_roles (name, display_name, description, permissions) 
VALUES (
  'super_admin',
  'Asosiy Admin',
  'Barcha huquqlarga ega asosiy administrator',
  '["*"]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Insert default admin permissions
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
('orders', 'mark_paid', 'To''landi belgilash', 'Buyurtmani to''landi deb belgilash huquqi'),
('orders', 'mark_debt', 'Qarz belgilash', 'Buyurtmani qarz deb belgilash huquqi'),
('orders', 'cancel', 'Buyurtma bekor qilish', 'Buyurtmalarni bekor qilish huquqi'),
('orders', 'notifications', 'Bildirishnomalar', 'Real-time bildirishnomalarni olish huquqi'),

-- Users
('users', 'view', 'Foydalanuvchilarni ko''rish', 'Foydalanuvchilar ro''yxatini ko''rish huquqi'),
('users', 'edit', 'Foydalanuvchi tahrirlash', 'Foydalanuvchi ma''lumotlarini tahrirlash huquqi'),
('users', 'delete', 'Foydalanuvchi o''chirish', 'Foydalanuvchilarni o''chirish huquqi'),

-- Debtors
('debtors', 'view', 'Qarzdorlarni ko''rish', 'Qarzdorlar ro''yxatini ko''rish huquqi'),
('debtors', 'delete', 'Qarzdor o''chirish', 'Qarzdorlarni ro''yxatdan o''chirish huquqi'),
('debtors', 'mark_paid', 'To''landi belgilash', 'Qarzni to''landi deb belgilash huquqi'),

-- SMS
('sms', 'send', 'SMS yuborish', 'SMS yuborish huquqi'),
('sms', 'view', 'SMS ko''rish', 'Yuborilgan SMS''larni ko''rish huquqi'),
('sms', 'statistics', 'SMS statistika', 'SMS statistikasini ko''rish huquqi'),

-- Statistics
('statistics', 'view', 'Statistika ko''rish', 'Umumiy statistikani ko''rish huquqi'),

-- Rentals
('rentals', 'view', 'Ijaralarni ko''rish', 'Ijara buyurtmalarini ko''rish huquqi'),
('rentals', 'approve', 'Ijara tasdiqlash', 'Ijara buyurtmalarini tasdiqlash huquqi'),
('rentals', 'edit', 'Ijara tahrirlash', 'Ijara ma''lumotlarini tahrirlash huquqi'),

-- Workers/Masters
('workers', 'view', 'Ustalarni ko''rish', 'Ustalar ro''yxatini ko''rish huquqi'),
('workers', 'create', 'Usta qo''shish', 'Yangi usta qo''shish huquqi'),
('workers', 'edit', 'Usta tahrirlash', 'Usta ma''lumotlarini tahrirlash huquqi'),
('workers', 'delete', 'Usta o''chirish', 'Ustalarni o''chirish huquqi'),

-- Ads
('ads', 'view', 'Reklamalarni ko''rish', 'Reklamalar ro''yxatini ko''rish huquqi'),
('ads', 'create', 'Reklama qo''shish', 'Yangi reklama qo''shish huquqi'),
('ads', 'edit', 'Reklama tahrirlash', 'Reklama ma''lumotlarini tahrirlash huquqi'),
('ads', 'delete', 'Reklama o''chirish', 'Reklamalarni o''chirish huquqi'),

-- Admin Management
('admins', 'view', 'Adminlarni ko''rish', 'Admin ro''yxatini ko''rish huquqi'),
('admins', 'create', 'Admin qo''shish', 'Yangi admin qo''shish huquqi'),
('admins', 'edit', 'Admin tahrirlash', 'Admin ma''lumotlarini tahrirlash huquqi'),
('admins', 'delete', 'Admin o''chirish', 'Adminlarni o''chirish huquqi'),
('admins', 'kpi', 'KPI ko''rish', 'Admin KPI statistikasini ko''rish huquqi')

ON CONFLICT (module, action) DO NOTHING;

-- Update existing admin users to have super_admin role
UPDATE public.users 
SET admin_role_id = (SELECT id FROM public.admin_roles WHERE name = 'super_admin')
WHERE role = 'admin' AND admin_role_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_admin_id ON public.admin_kpi_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_created_at ON public.admin_kpi_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_action_type ON public.admin_kpi_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_users_admin_role_id ON public.users(admin_role_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Enable RLS on new tables
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_kpi_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_roles
CREATE POLICY "Admin roles viewable by admins" ON public.admin_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

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

-- Create RLS policies for admin_permissions
CREATE POLICY "Admin permissions viewable by admins" ON public.admin_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create RLS policies for admin_kpi_logs
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

CREATE POLICY "KPI logs insertable by admins" ON public.admin_kpi_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND admin_id = auth.uid()
    )
  );

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type text,
  p_module text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.admin_kpi_logs (admin_id, action_type, module, entity_id, metadata)
  VALUES (auth.uid(), p_action_type, p_module, p_entity_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check admin permissions
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
