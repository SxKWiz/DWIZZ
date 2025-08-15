import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HistoryFiltersProps {
    symbolFilter: string;
    onSymbolFilterChange: (value: string) => void;
    modeFilter: string;
    onModeFilterChange: (value: string) => void;
}

export const HistoryFilters = ({
    symbolFilter,
    onSymbolFilterChange,
    modeFilter,
    onModeFilterChange,
}: HistoryFiltersProps) => {
    return (
        <div className="flex flex-col sm:flex-row gap-4">
            <Input
                placeholder="Filter by symbol (e.g., BTC)..."
                value={symbolFilter}
                onChange={(e) => onSymbolFilterChange(e.target.value)}
                className="max-w-sm"
            />
            <Select value={modeFilter} onValueChange={onModeFilterChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by mode" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
};