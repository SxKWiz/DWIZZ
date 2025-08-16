import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AnalysisHistoryItem } from './HistoryItemCard';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

const RecentHistory = () => {
    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchRecentHistory = async () => {
            if (!user) return;

            setLoading(true);
            const { data, error } = await supabase
                .from('analysis_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error('Error fetching recent history:', error);
            } else {
                setHistory(data as AnalysisHistoryItem[]);
            }
            setLoading(false);
        };

        fetchRecentHistory();
    }, [user]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Analyses</CardTitle>
                    <CardDescription>Your last 5 analyses.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link to="/history">
                        View All <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You haven't performed any analyses yet.</p>
                ) : (
                    <div className="space-y-4">
                        {history.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                                <div className="flex flex-col">
                                    <span className="font-medium">{item.symbol.replace('USDT', '/USDT')}</span>
                                    <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                                </div>
                                <Badge variant={item.mode === 'ultra' ? 'default' : 'secondary'}>
                                    {item.mode}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentHistory;