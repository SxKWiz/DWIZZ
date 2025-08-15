import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { ChartData } from './TradingChart';
import { AnalysisResult, AnalysisResultDisplay } from './AnalysisResultDisplay';

type AnalysisMode = 'normal' | 'ultra';

const modeDescriptions: Record<AnalysisMode, string> = {
    normal: 'Normal mode provides a quick analysis based on recent price action and key patterns.',
    ultra: 'Ultra mode conducts a deep, institutional-grade analysis of the broader market structure.'
};

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

        const functionName = mode === 'ultra' ? 'analyze-symbol-ultra' : 'analyze-symbol';

        try {
            const { data: resultData, error: functionError } = await supabase.functions.invoke(functionName, {
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-grow">
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
                                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                                Ultra (Pro)
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <p className="text-xs text-muted-foreground mt-2 h-8 sm:h-auto">
                            {modeDescriptions[mode]}
                        </p>
                    </div>
                    <Button onClick={handleAnalyze} disabled={loading || chartData.length === 0} className="w-full sm:w-auto flex-shrink-0">
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