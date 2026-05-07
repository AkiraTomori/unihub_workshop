import { useState } from "react";
import { Card } from "./ui";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "DRAFT", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "PUBLISHED", label: "PUBLISHED", color: "bg-green-100 text-green-800 border-green-300" }
];

export default function WorkshopFilter({ selectedStatuses, onStatusChange }) {
  const [isOpen, setIsOpen] = useState(false);

  function toggleStatus(status) {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  }

  const hasActiveFilters = selectedStatuses.length > 0 && selectedStatuses.length < STATUS_OPTIONS.length;

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-blue-950">Filter</h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {selectedStatuses.length} active
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg px-2 py-1 text-sm font-medium text-blue-900 hover:bg-blue-50"
          >
            {isOpen ? "−" : "+"}
          </button>
        </div>

        {isOpen && (
          <div className="space-y-2 border-t border-blue-200 pt-3">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Status (Active Workshops)</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleStatus(option.value)}
                  className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                    selectedStatuses.includes(option.value)
                      ? option.color
                      : "border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="border-t border-blue-200 pt-2">
              <button
                onClick={() => onStatusChange(STATUS_OPTIONS.map(o => o.value))}
                className="text-xs font-semibold text-blue-600 hover:text-blue-900"
              >
                Select All
              </button>
              {" • "}
              <button
                onClick={() => onStatusChange([])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-900"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
