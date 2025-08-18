-- Create analysis_history table
CREATE TABLE public.analysis_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  symbol TEXT NOT NULL,
  mode TEXT NOT NULL,
  result JSONB NOT NULL
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific access
CREATE POLICY "Users can only see their own analysis history" ON public.analysis_history
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own analysis history" ON public.analysis_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);