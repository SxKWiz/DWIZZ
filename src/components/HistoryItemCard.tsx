import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Trash2, Eye } from "lucide-react";
import { AnalysisResult } from './AnalysisResultDisplay';
import HistoryDetailView from './HistoryDetailView';

export type AnalysisHistoryItem = {
    id: string;
    created_at: string;
    symbol: string;
    mode: string;
    result: AnalysisResult;
    timeframe?: string;
};

interface HistoryItemCardProps {
    item: AnalysisHistoryItem;
    onDelete: () => void;
}

export const HistoryItemCard = ({ item, onDelete }: HistoryItemCardProps) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{item.symbol.replace('USDT', '/USDT')}</CardTitle>
                        <CardDescription>{new Date(item.created_at).toLocaleString()}</CardDescription>
                    </div>
                    <Badge variant={item.mode === 'ultra' ? 'default' : 'secondary'}>
                        {item.mode}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex flex-col">
                    <span className="text-muted-foreground">Entry</span>
                    <span>{item.result.entryPrice}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-muted-foreground">Take Profit</span>
                    <span>{item.result.takeProfit}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-muted-foreground">Stop Loss</span>
                    <span>{item.result.stopLoss}</span>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Analysis Details</DialogTitle>
                            <DialogDescription>
                                {item.symbol.replace('USDT', '/USDT')} analysis from {new Date(item.created_at).toLocaleString()}
                            </DialogDescription>
                        </DialogHeader>
                        <HistoryDetailView 
                            symbol={item.symbol}
                            timeframe={item.timeframe}
                            createdAt={item.created_at}
                            result={item.result}
                        />
                    </DialogContent>
                </Dialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this analysis from your history.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
};