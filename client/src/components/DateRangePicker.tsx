import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useState } from "react";

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range?: DateRange) => void;
  placeholder?: string;
}

export default function DateRangePicker({ 
  value, 
  onChange, 
  placeholder = "Select date range" 
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDateRange = (dateRange?: DateRange) => {
    if (!dateRange?.from) return placeholder;
    
    if (!dateRange.to) {
      return format(dateRange.from, "MMM dd, yyyy");
    }
    
    return `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const handleSelect = (range?: DateRange) => {
    onChange(range);
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[280px] justify-start text-left font-normal"
          data-testid="button-date-range-picker"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">
            {formatDateRange(value)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                handleSelect({ from: lastWeek, to: today });
              }}
              data-testid="button-last-week"
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                handleSelect({ from: lastMonth, to: today });
              }}
              data-testid="button-last-month"
            >
              Last 30 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const lastQuarter = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                handleSelect({ from: lastQuarter, to: today });
              }}
              data-testid="button-last-quarter"
            >
              Last 90 days
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}