import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect if a session already exists
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/');
            }
        });

        // Listen for authentication events (like signing in)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                navigate('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    return (
        <div className="flex justify-center items-center min-h-screen bg-background">
            <div className="w-full max-w-md p-8 space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                        Sign in to your account
                    </h2>
                </div>
                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={[]}
                    theme="light"
                />
                <div className="flex items-center justify-center pt-4 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />
                    <span>Your session is automatically remembered for you.</span>
                </div>
            </div>
        </div>
    );
};

export default Login;