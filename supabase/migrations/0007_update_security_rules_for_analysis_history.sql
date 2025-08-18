-- Drop the existing, insecure insert policy
DROP POLICY "Users can only insert their own analysis history" ON public.analysis_history;

-- Recreate a secure insert policy that ensures users can only add to their own history
CREATE POLICY "Users can only insert their own analysis history"
ON public.analysis_history
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add a policy to allow users to delete their own history
CREATE POLICY "Users can delete their own analysis history"
ON public.analysis_history
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add a policy to allow users to update their own history
CREATE POLICY "Users can update their own analysis history"
ON public.analysis_history
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);