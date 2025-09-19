-- Creating comprehensive RLS policies for admin panel security
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Main admin can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Main admin can update users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Main admin can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin roles policies
CREATE POLICY "Admins can view admin roles" ON public.admin_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND (role = 'admin' OR role LIKE 'admin_%')
        )
    );

CREATE POLICY "Main admin can manage admin roles" ON public.admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admin permissions policies
CREATE POLICY "Admins can view their permissions" ON public.admin_permissions
    FOR SELECT USING (
        admin_role_id IN (
            SELECT id FROM public.admin_roles ar
            JOIN public.users u ON u.role = ar.role_name
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Main admin can manage all permissions" ON public.admin_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- KPI logs policies
CREATE POLICY "Admins can view their own KPI logs" ON public.kpi_logs
    FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "Main admin can view all KPI logs" ON public.kpi_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "System can insert KPI logs" ON public.kpi_logs
    FOR INSERT WITH CHECK (admin_id = auth.uid());

-- Products policies
CREATE POLICY "Everyone can view products" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Admins with product permissions can manage products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'products'
            AND (ap.actions ? 'create' OR ap.actions ? 'update' OR ap.actions ? 'delete')
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Categories policies
CREATE POLICY "Everyone can view categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Admins with category permissions can manage categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'categories'
            AND (ap.actions ? 'create' OR ap.actions ? 'update' OR ap.actions ? 'delete')
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Orders policies
CREATE POLICY "Admins can view orders based on permissions" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'orders'
            AND ap.actions ? 'view'
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage orders based on permissions" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'orders'
            AND (ap.actions ? 'create' OR ap.actions ? 'update' OR ap.actions ? 'delete' OR ap.actions ? 'approve')
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Order items policies
CREATE POLICY "Admins can view order items if they can view orders" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'orders'
            AND ap.actions ? 'view'
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Debts policies
CREATE POLICY "Admins can view debts based on permissions" ON public.debts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'debts'
            AND ap.actions ? 'view'
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage debts based on permissions" ON public.debts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'debts'
            AND (ap.actions ? 'create' OR ap.actions ? 'update' OR ap.actions ? 'delete' OR ap.actions ? 'mark_paid')
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- SMS logs policies
CREATE POLICY "Admins can view SMS logs based on permissions" ON public.sms_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'sms'
            AND ap.actions ? 'view'
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can send SMS based on permissions" ON public.sms_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'sms'
            AND ap.actions ? 'send'
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Workers policies
CREATE POLICY "Admins can view workers based on permissions" ON public.workers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'workers'
            AND ap.actions ? 'view'
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage workers based on permissions" ON public.workers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'workers'
            AND (ap.actions ? 'create' OR ap.actions ? 'update' OR ap.actions ? 'delete')
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Ads policies
CREATE POLICY "Admins can view ads based on permissions" ON public.ads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'ads'
            AND ap.actions ? 'view'
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage ads based on permissions" ON public.ads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.admin_roles ar ON u.role = ar.role_name
            JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
            WHERE u.id = auth.uid() 
            AND ap.resource = 'ads'
            AND (ap.actions ? 'create' OR ap.actions ? 'update' OR ap.actions ? 'delete')
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to check admin permissions
CREATE OR REPLACE FUNCTION check_admin_permission(resource_name text, action_name text)
RETURNS boolean AS $$
BEGIN
    -- Main admin has all permissions
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN true;
    END IF;
    
    -- Check specific permission
    RETURN EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.admin_roles ar ON u.role = ar.role_name
        JOIN public.admin_permissions ap ON ar.id = ap.admin_role_id
        WHERE u.id = auth.uid() 
        AND ap.resource = resource_name
        AND ap.actions ? action_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
