import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

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

const History = () => {
    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemToDelete, setItemToDelete] = useState<AnalysisHistoryItem | null>(null);
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

    const handleDelete = async () => {
        if (!itemToDelete) return;

        const { error } = await supabase
            .from('analysis_history')
            .delete()
            .eq('id', itemToDelete.id);

        if (error) {
            showError('Failed to delete analysis.');
            console.error('Error deleting analysis:', error);
        } else {
            setHistory(history.filter((item) => item.id !== itemToDelete.id));
            showSuccess('Analysis deleted from history.');
        }
        setItemToDelete(null);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
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
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead className="hidden sm:table-cell">Date</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Entry Price</TableHead>
                            <TableHead className="hidden md:table-cell">Take Profit</TableHead>
                            <TableHead className="hidden md:table-cell">Stop Loss</TableHead>
                            <TableHead>
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.symbol.replace('USDT', '/USDT')}</TableCell>
                                <TableCell className="hidden sm:table-cell">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant={item.mode === 'ultra' ? 'default' : 'secondary'}>
                                        {item.mode}
                                    </Badge>
                                </TableCell>
                                <TableCell>{item.result.entryPrice}</TableCell>
                                <TableCell className="hidden md:table-cell">{item.result.takeProfit}</TableCell>
                                <TableCell className="hidden md:table-cell">{item.result.stopLoss}</TableCell>
                                <TableCell>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setItemToDelete(item)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the analysis for {item.symbol.replace('USDT', '/USDT')} from {new Date(item.created_at).toLocaleString()}.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default History;