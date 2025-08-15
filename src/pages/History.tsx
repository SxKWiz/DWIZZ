import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { HistoryItemCard, AnalysisHistoryItem } from '@/components/HistoryItemCard';
import { HistoryFilters } from '@/components/HistoryFilters';
import { useDebounce } from '@/hooks/use-debounce';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 9;

const History = () => {
    const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [symbolFilter, setSymbolFilter] = useState('');
    const [modeFilter, setModeFilter] = useState('all');
    const { user } = useAuth();

    const debouncedSymbolFilter = useDebounce(symbolFilter, 500);

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    const fetchHistory = useCallback(async () => {
        if (!user) return;

        setLoading(true);

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        // Base query for data
        let query = supabase
            .from('analysis_history')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, to);

        // Apply filters
        if (debouncedSymbolFilter) {
            query = query.ilike('symbol', `%${debouncedSymbolFilter.toUpperCase()}%`);
        }
        if (modeFilter !== 'all') {
            query = query.eq('mode', modeFilter);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching history:', error);
            showError('Failed to load analysis history.');
        } else {
            setHistory(data as AnalysisHistoryItem[]);
            setTotalItems(count || 0);
        }
        setLoading(false);
    }, [user, currentPage, debouncedSymbolFilter, modeFilter]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSymbolFilter, modeFilter]);


    const handleDelete = async (itemId: string) => {
        const { error } = await supabase
            .from('analysis_history')
            .delete()
            .eq('id', itemId);

        if (error) {
            showError('Failed to delete analysis.');
            console.error('Error deleting analysis:', error);
        } else {
            showSuccess('Analysis deleted from history.');
            // Refetch data to update list and pagination
            fetchHistory();
        }
    };

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold">Analysis History</h1>
                <HistoryFilters
                    symbolFilter={symbolFilter}
                    onSymbolFilterChange={setSymbolFilter}
                    modeFilter={modeFilter}
                    onModeFilterChange={setModeFilter}
                />
            </div>
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full" />
                    ))}
                </div>
            ) : history.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full min-h-[400px]">
                    <div className="flex flex-col items-center gap-1 text-center">
                        <h3 className="text-2xl font-bold tracking-tight">
                            No Results Found
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Try adjusting your filters or run a new analysis.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {history.map((item) => (
                            <HistoryItemCard
                                key={item.id}
                                item={item}
                                onDelete={() => handleDelete(item.id)}
                            />
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                                {[...Array(totalPages)].map((_, i) => (
                                    <PaginationItem key={i}>
                                        <PaginationLink
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }}
                                            isActive={currentPage === i + 1}
                                        >
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    )}
                </>
            )}
        </div>
    );
};

export default History;