import { useState } from "react";
import { ChevronDown } from "lucide-react";

const SUPPORTED_CURRENCIES = [
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "RWF", name: "Rwandan Franc", symbol: "RF" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
];

export default function CurrencySelector({ value, onChange, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = SUPPORTED_CURRENCIES.find((c) => c.code === value) || SUPPORTED_CURRENCIES[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] hover:border-slate-400"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium">{selected.code}</span>
          <span className="text-slate-500 text-xs">({selected.symbol})</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {SUPPORTED_CURRENCIES.map((currency) => (
              <button
                key={currency.code}
                type="button"
                onClick={() => {
                  onChange(currency.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  value === currency.code ? "bg-[#E6F0FF] text-[#1e40af]" : "text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{currency.code}</div>
                    <div className="text-xs text-slate-500">{currency.name}</div>
                  </div>
                  <span className="text-xs text-slate-400">{currency.symbol}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export { SUPPORTED_CURRENCIES };

