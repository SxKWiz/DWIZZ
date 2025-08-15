import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2 } from 'lucide-react';

type AnalysisMode = 'normal' | 'ultra';

const AnalysisResultDisplay = () => (
    <div className="prose prose-sm dark:prose-invert max-w-none">
        <p>Based on the multi-timeframe analysis, the current market structure for BTC/USDT appears to be consolidating within a bullish trend. Key support is identified near the $67,000 level, with resistance at $72,000.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 not-prose">
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Entry Price</CardDescription>
                    <CardTitle className="text-xl">$68,000 - $68,500</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Take Profit</CardDescription>
                    <CardTitle className="text-xl">$72,000</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader className="p-4">
                    <CardDescription>Stop Loss</CardDescription>
                    <CardTitle className="text-xl">$67,000</CardTitle>
                </CardHeader>
            </Card>
        </div>
    </div>
);

const AnalysisPanel = () => {
    const [mode, setMode] = useState<AnalysisMode>('normal');
    const [loading, setLoading] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const handleAnalyze = () => {
        setLoading(true);
        setShowResult(false);
        // Simulate AI analysis API call
        setTimeout(() => {
            setShowResult(true);
            setLoading(false);
        }, 1500);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
                <CardDescription>Select a mode and click analyze to get an AI-powered trade signal.</CardDescription>
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
                    <Button onClick={handleAnalyze} disabled={loading} className="w-full sm:w-auto">
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
                    {showResult && !loading && <AnalysisResultDisplay />}
                    {!showResult && !loading && (
                        <p className="text-sm text-muted-foreground">Click "Analyze Chart" to see the AI's insights.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AnalysisPanel;