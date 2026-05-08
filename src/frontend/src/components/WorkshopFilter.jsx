import { Card } from "./ui";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "PUBLISHED", label: "PUBLISHED" }
];

export default function WorkshopFilter({ selectedStatuses, onStatusChange }) {
  function toggleStatus(status) {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  }

  const activeCount = selectedStatuses.length;

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-blue-950">Filter</h3>
            <p className="text-sm text-blue-800">View workshops by status.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            {activeCount} active
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleStatus(option.value)}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                selectedStatuses.includes(option.value)
                  ? "bg-blue-900 text-white"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
