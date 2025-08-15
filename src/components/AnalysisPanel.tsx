import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { ChartData } from './TradingChart';

type AnalysisMode = 'normal' | 'ultra';

type AnalysisResult = {
    description: string;
    entryPrice: string;
    takeProfit: string;
    stopLoss: string;
};

const AnalysisResultDisplay = ({ result }: { result: AnalysisResult }) => (
    <div className="prose prose-sm dark:prose-invert max-w-none">
        <p>{result.description}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 not-prose">
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Entry Price</CardDescription>
                    <CardTitle className="text-xl">{result.entryPrice}</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Take Profit</CardDescription>
                    <CardTitle className="text-xl">{result.takeProfit}</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Stop Loss</CardDescription>
                    <CardTitle className="text-xl">{result.stopLoss}</CardTitle>
                </CardHeader>
            </Card>
        </div>
    </div>
);

const AnalysisPanel = ({ chartData, symbol }: { chartData: ChartData[], symbol: string }) => {
    const [mode, setMode] = useState<AnalysisMode>('normal');
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const { user } = useAuth();

    const handleAnalyze = async () => {
        if (chartData.length === 0) {
            showError("Chart data is not available for analysis.");
            return;
        }
        setLoading(true);
        setAnalysisResult(null);

        try {
            const { data: resultData, error: functionError } = await supabase.functions.invoke('analyze-symbol', {
                body: { symbol, chartData },
            });

            if (functionError) {
                throw functionError;
            }
            
            setAnalysisResult(resultData);

            if (user) {
                const { error: insertError } = await supabase
                    .from('analysis_history')
                    .insert({
                        user_id: user.id,
                        symbol: symbol,
                        mode: mode,
                        result: resultData
                    });

                if (insertError) {
                    showError('Failed to save analysis history.');
                    console.error('Error saving analysis:', insertError);
                } else {
                    showSuccess('Analysis saved to history.');
                }
            }
        } catch (error) {
            console.error('Error performing analysis:', error);
            showError('An error occurred during analysis.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
                <CardDescription>Select a mode and click analyze to get an AI-powered trade signal for {symbol.replace('USDT', '/USDT')}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <ToggleGroup
                        type="single"
                        value={mode}
                        onValueChange={(value) => {
                            if (value) setMode(value as AnalysisMode)
                        }}
                        aria-label="Analysis Mode"
                    >
                        <ToggleGroupItem value="normal" aria-label="Normal Mode">
                            Normal (Flash)
                        </ToggleGroupItem>
                        <ToggleGroupItem value="ultra" aria-label="Ultra Mode">
                            Ultra (Pro)
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Button onClick={handleAnalyze} disabled={loading || chartData.length === 0} className="w-full sm:w-auto">
                        <Wand2 className="mr-2 h-4 w-4" />
                        {loading ? 'Analyzing...' : 'Analyze Chart'}
                    </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold">Analysis Result</h4>
                    {loading && (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    )}
                    {analysisResult && !loading && <AnalysisResultDisplay result={analysisResult} />}
                    {!analysisResult && !loading && (
                        <p className="text-sm text-muted-foreground">Click "Analyze Chart" to see the AI's insights.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AnalysisPanel;