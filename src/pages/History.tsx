import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

type AnalysisHistoryItem = {
    id: string;
    created_at: string;
    symbol: string;
    mode: string;
    result: {
        description: string;
        entryPrice: string;
        takeProfit: string;
        stopLoss: string;
    };
};

const HistoryCard = ({ item }: { item: AnalysisHistoryItem }) => (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{item.symbol}</CardTitle>
                    <CardDescription>
                        {new Date(item.created_at).toLocaleString()}
                    </CardDescription>
                </div>
                <Badge variant={item.mode === 'ultra' ? 'default' : 'secondary'}>
                    {item.mode}
                </Badge>
            </div>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{item.result.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Entry Price</p>
                    <p className="font-semibold">{item.result.entryPrice}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Take Profit</p>
                    <p className="font-semibold">{item.result.takeProfit}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Stop Loss</p>
                    <p className="font-semibold">{item.result.stopLoss}</p>
                </div>
            </div>
        </CardContent>
    </Card>
);

const History = () => {
    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) return;

            setLoading(true);
            const { data, error } = await supabase
                .from('analysis_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching history:', error);
                showError('Failed to load analysis history.');
            } else {
                setHistory(data as AnalysisHistoryItem[]);
            }
            setLoading(false);
        };

        fetchHistory();
    }, [user]);

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full">
                <div className="flex flex-col items-center gap-1 text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        No Analysis History
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Go to the Home page to run your first analysis.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Analysis History</h1>
            <div className="space-y-4">
                {history.map((item) => (
                    <HistoryCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
};

export default History;