-- Complete Security Setup with RLS for Jamol Stroy Admin Panel
-- This script creates all necessary tables, policies, and security measures

-- Enable RLS on all existing tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create admin_roles table if not exists
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- Create admin_kpi_logs table if not exists
CREATE TABLE IF NOT EXISTS public.admin_kpi_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    action_details JSONB DEFAULT '{}',
    target_table VARCHAR(100),
    target_id UUID,
    performance_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_sessions table for tracking
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Insert default admin roles
INSERT INTO public.admin_roles (name, display_name, description, permissions) VALUES
('admin', 'Asosiy Admin', 'Barcha huquqlarga ega asosiy administrator', '{
    "users": {"create": true, "read": true, "update": true, "delete": true},
    "products": {"create": true, "read": true, "update": true, "delete": true},
    "categories": {"create": true, "read": true, "update": true, "delete": true},
    "orders": {"create": true, "read": true, "update": true, "delete": true, "approve": true, "cancel": true},
    "debtors": {"create": true, "read": true, "update": true, "delete": true, "mark_paid": true},
    "sms": {"send": true, "read": true, "statistics": true},
    "rentals": {"create": true, "read": true, "update": true, "delete": true},
    "workers": {"create": true, "read": true, "update": true, "delete": true},
    "ads": {"create": true, "read": true, "update": true, "delete": true},
    "kpi": {"read_all": true, "read_own": true},
    "admin_management": {"create": true, "read": true, "update": true, "delete": true}
}'),
('admin_product_manager', 'Mahsulot Menejeri', 'Mahsulotlar va kategoriyalar bilan ishlaydi', '{
    "products": {"create": true, "read": true, "update": true, "delete": true},
    "categories": {"create": true, "read": true, "update": true, "delete": true},
    "orders": {"read": true, "update": true},
    "kpi": {"read_own": true}
}'),
('admin_order_manager', 'Buyurtma Menejeri', 'Buyurtmalar va to''lovlar bilan ishlaydi', '{
    "orders": {"create": true, "read": true, "update": true, "approve": true, "cancel": true},
    "debtors": {"create": true, "read": true, "update": true, "mark_paid": true},
    "products": {"read": true},
    "categories": {"read": true},
    "kpi": {"read_own": true}
}'),
('admin_sms_manager', 'SMS Menejeri', 'SMS xabarlari va aloqa bilan ishlaydi', '{
    "sms": {"send": true, "read": true, "statistics": true},
    "debtors": {"read": true, "update": true},
    "orders": {"read": true},
    "kpi": {"read_own": true}
}')
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- RLS Policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'admin_product_manager', 'admin_order_manager', 'admin_sms_manager')
        )
    );

CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for products table
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'products')::jsonb ? 'read'
        )
    );

-- RLS Policies for categories table
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'categories')::jsonb ? 'read'
        )
    );

-- RLS Policies for orders table
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'orders')::jsonb ? 'read'
        )
    );

-- RLS Policies for order_items table
DROP POLICY IF EXISTS "Admins can manage order_items" ON public.order_items;
CREATE POLICY "Admins can manage order_items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'orders')::jsonb ? 'read'
        )
    );

-- RLS Policies for debtors table
DROP POLICY IF EXISTS "Admins can manage debtors" ON public.debtors;
CREATE POLICY "Admins can manage debtors" ON public.debtors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'debtors')::jsonb ? 'read'
        )
    );

-- RLS Policies for sms_logs table
DROP POLICY IF EXISTS "Admins can manage sms_logs" ON public.sms_logs;
CREATE POLICY "Admins can manage sms_logs" ON public.sms_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'sms')::jsonb ? 'read'
        )
    );

-- RLS Policies for rentals table
DROP POLICY IF EXISTS "Admins can manage rentals" ON public.rentals;
CREATE POLICY "Admins can manage rentals" ON public.rentals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'rentals')::jsonb ? 'read'
        )
    );

-- RLS Policies for workers table
DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;
CREATE POLICY "Admins can manage workers" ON public.workers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'workers')::jsonb ? 'read'
        )
    );

-- RLS Policies for ads table
DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;
CREATE POLICY "Admins can manage ads" ON public.ads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.name
            WHERE u.id = auth.uid() 
            AND (ar.permissions->>'ads')::jsonb ? 'read'
        )
    );

-- RLS Policies for admin_roles table
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only main admin can manage roles" ON public.admin_roles;
CREATE POLICY "Only main admin can manage roles" ON public.admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for admin_kpi_logs table
ALTER TABLE public.admin_kpi_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view own KPI" ON public.admin_kpi_logs;
DROP POLICY IF EXISTS "Main admin can view all KPI" ON public.admin_kpi_logs;

CREATE POLICY "Admins can view own KPI" ON public.admin_kpi_logs
    FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "Main admin can view all KPI" ON public.admin_kpi_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "System can insert KPI logs" ON public.admin_kpi_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for admin_sessions table
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view own sessions" ON public.admin_sessions;
DROP POLICY IF EXISTS "Main admin can view all sessions" ON public.admin_sessions;

CREATE POLICY "Admins can view own sessions" ON public.admin_sessions
    FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "Main admin can view all sessions" ON public.admin_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "System can manage sessions" ON public.admin_sessions
    FOR ALL WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_admin_id ON public.admin_kpi_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_created_at ON public.admin_kpi_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_kpi_logs_action_type ON public.admin_kpi_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON public.admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_active ON public.admin_sessions(is_active);

-- Create functions for KPI tracking
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_admin_id UUID,
    p_action_type VARCHAR(100),
    p_action_details JSONB DEFAULT '{}',
    p_target_table VARCHAR(100) DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_performance_score INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.admin_kpi_logs (
        admin_id, action_type, action_details, target_table, target_id, performance_score
    ) VALUES (
        p_admin_id, p_action_type, p_action_details, p_target_table, p_target_id, p_performance_score
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check admin permissions
CREATE OR REPLACE FUNCTION public.check_admin_permission(
    p_admin_id UUID,
    p_resource VARCHAR(100),
    p_action VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    SELECT 
        CASE 
            WHEN u.role = 'admin' THEN true
            ELSE (ar.permissions->p_resource->p_action)::boolean
        END INTO has_permission
    FROM public.users u
    LEFT JOIN public.admin_roles ar ON u.role = ar.name
    WHERE u.id = p_admin_id;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update users table to ensure proper role structure
UPDATE public.users SET role = 'admin' WHERE role IS NULL OR role = '';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
