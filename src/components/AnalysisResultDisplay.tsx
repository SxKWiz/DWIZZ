import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from './ui/badge';
import { Zap } from 'lucide-react';

export type BaseAnalysisResult = {
    description: string;
    entryPrice: string;
    takeProfit: string;
    stopLoss: string;
};

export type UltraAnalysisResult = BaseAnalysisResult & {
    confidence: string;
    summary: string;
};

export type AnalysisResult = BaseAnalysisResult | UltraAnalysisResult;

export function isUltraResult(result: AnalysisResult): result is UltraAnalysisResult {
    return 'confidence' in result;
}

export const AnalysisResultDisplay = ({ result }: { result: AnalysisResult }) => (
    <div className="prose prose-sm dark:prose-invert max-w-none">
        {isUltraResult(result) && (
            <div className="mb-4 p-4 bg-muted rounded-lg not-prose">
                <h5 className="font-bold text-primary flex items-center"><Zap className="h-4 w-4 mr-2" />Ultra Analysis Summary</h5>
                <p className="text-sm m-0">{result.summary}</p>
            </div>
        )}
        <div className="whitespace-pre-line">{result.description}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 not-prose">
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Entry Price</CardDescription>
                    <CardTitle className="text-lg">{result.entryPrice}</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Take Profit</CardDescription>
                    <CardTitle className="text-lg">{result.takeProfit}</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Stop Loss</CardDescription>
                    <CardTitle className="text-lg">{result.stopLoss}</CardTitle>
                </CardHeader>
            </Card>
        </div>
        {isUltraResult(result) && (
            <div className="mt-4 flex justify-end">
                <Badge>Confidence: {result.confidence}</Badge>
            </div>
        )}
    </div>
);