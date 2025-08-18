-- Create price_alerts table
CREATE TABLE public.price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_history_id UUID REFERENCES public.analysis_history(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  take_profit NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  is_long BOOLEAN NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_entered BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for clarity
COMMENT ON TABLE public.price_alerts IS 'Stores active price alerts for users.';
COMMENT ON COLUMN public.price_alerts.is_active IS 'True if the alert is currently being monitored.';
COMMENT ON COLUMN public.price_alerts.is_entered IS 'True if the entry price has been triggered.';

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "Users can manage their own price alerts" ON public.price_alerts
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can access all alerts" ON public.price_alerts
FOR SELECT
TO service_role
USING (true);