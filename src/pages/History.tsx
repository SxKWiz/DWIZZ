import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { HistoryItemCard, AnalysisHistoryItem } from '@/components/HistoryItemCard';

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

    const handleDelete = async (itemId: string) => {
        const { error } = await supabase
            .from('analysis_history')
            .delete()
            .eq('id', itemId);

        if (error) {
            showError('Failed to delete analysis.');
            console.error('Error deleting analysis:', error);
        } else {
            setHistory(history.filter((item) => item.id !== itemId));
            showSuccess('Analysis deleted from history.');
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                ))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {history.map((item) => (
                    <HistoryItemCard
                        key={item.id}
                        item={item}
                        onDelete={() => handleDelete(item.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default History;