import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from './ui/badge';
import { Zap, TrendingUp, TrendingDown, Minus, Activity, ShieldQuestion, ShieldCheck } from 'lucide-react';

type DrawingPoint = {
    time: number;
    price: number;
};

type Drawing = {
    type: 'trendline';
    points: DrawingPoint[];
    label: string;
};

export type BaseAnalysisResult = {
    description: string;
    entryPrice: string;
    takeProfit: string;
    stopLoss: string;
    sentiment: string;
    riskRewardRatio: string;
    drawings?: Drawing[];
};

export type UltraAnalysisResult = BaseAnalysisResult & {
    confidence: string;
    summary: string;
    volatility: string;
    tradeManagement: string;
    alternativeScenario: string;
};

export type AnalysisResult = BaseAnalysisResult | UltraAnalysisResult;

export function isUltraResult(result: AnalysisResult): result is UltraAnalysisResult {
    return 'confidence' in result;
}

const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
    const sentimentLower = sentiment.toLowerCase();
    if (sentimentLower.includes('bullish')) {
        return <Badge variant="secondary" className="text-green-500 border-green-500/50"><TrendingUp className="mr-1 h-3 w-3" />{sentiment}</Badge>;
    }
    if (sentimentLower.includes('bearish')) {
        return <Badge variant="secondary" className="text-red-500 border-red-500/50"><TrendingDown className="mr-1 h-3 w-3" />{sentiment}</Badge>;
    }
    return <Badge variant="secondary"><Minus className="mr-1 h-3 w-3" />{sentiment}</Badge>;
};

const VolatilityBadge = ({ volatility }: { volatility: string }) => {
    const volatilityLower = volatility.toLowerCase();
    if (volatilityLower.includes('high')) {
        return <Badge variant="outline"><Activity className="mr-1 h-3 w-3 text-orange-500" />High Volatility</Badge>;
    }
    if (volatilityLower.includes('low')) {
        return <Badge variant="outline"><Activity className="mr-1 h-3 w-3 text-blue-500" />Low Volatility</Badge>;
    }
    return <Badge variant="outline"><Activity className="mr-1 h-3 w-3" />{volatility}</Badge>;
};

export const AnalysisResultDisplay = ({ result }: { result: AnalysisResult }) => (
    <div className="prose prose-sm dark:prose-invert max-w-none">
        {isUltraResult(result) && (
            <div className="mb-4 p-4 bg-muted rounded-lg not-prose">
                <h5 className="font-bold text-primary flex items-center"><Zap className="h-4 w-4 mr-2" />Ultra Analysis Summary</h5>
                <p className="text-sm m-0">{result.summary}</p>
            </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mb-4 not-prose">
            <SentimentBadge sentiment={result.sentiment} />
            {isUltraResult(result) && <VolatilityBadge volatility={result.volatility} />}
            <Badge variant="outline">R/R: {result.riskRewardRatio}</Badge>
            {isUltraResult(result) && <Badge>Confidence: {result.confidence}</Badge>}
        </div>
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
                    <CardTitle className="text-lg text-green-500 dark:text-green-400">{result.takeProfit}</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Stop Loss</CardDescription>
                    <CardTitle className="text-lg text-red-500 dark:text-red-400">{result.stopLoss}</CardTitle>
                </CardHeader>
            </Card>
        </div>
        {isUltraResult(result) && (
            <div className="mt-6 space-y-4">
                <div>
                    <h5 className="font-bold flex items-center not-prose"><ShieldCheck className="mr-2 h-4 w-4 text-blue-500" />Trade Management</h5>
                    <p className="text-sm m-0">{result.tradeManagement}</p>
                </div>
                <div>
                    <h5 className="font-bold flex items-center not-prose"><ShieldQuestion className="mr-2 h-4 w-4 text-orange-500" />Alternative Scenario</h5>
                    <p className="text-sm m-0">{result.alternativeScenario}</p>
                </div>
            </div>
        )}
    </div>
);