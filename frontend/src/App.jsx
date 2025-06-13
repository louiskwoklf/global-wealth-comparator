import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { ChevronDown } from "lucide-react";

// Define countries by region
const regions = {
  "Americas": [
    "United States",
    "Canada",
    "Mexico",
    "Brazil",
    "Argentina",
    "Chile",
    "Colombia",
  ],
  "Africa": [
    "Nigeria",
    "South Africa",
    "Egypt",
    "Kenya",
    "Morocco",
    "Ghana",
    "Ethiopia",
  ],
  "Europe": [
    "United Kingdom",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Netherlands",
    "Sweden",
  ],
  "Asia": [
    "China",
    "India",
    "Japan",
    "South Korea",
    "Indonesia",
    "Saudi Arabia",
    "Turkey",
  ],
  "Oceania": [
    "Australia",
    "New Zealand",
    "Fiji",
    "Papua New Guinea",
    "Samoa",
    "Tonga",
  ],
};

export default function GlobalWealthComparator() {
  const [residence, setResidence] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [netWorth, setNetWorth] = useState("");

  // Render only country buttons grid (no headers)
  const renderCountryGridBody = (onSelect) => (
    <div className="grid grid-cols-5 gap-6">
      {Object.entries(regions).map(([region, countries]) => (
        <div key={region} className="space-y-2">
          {countries.length > 0 ? (
            countries.map((country) => (
              <DialogClose asChild key={country}>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left whitespace-nowrap border rounded-md px-3 py-2"
                  onClick={() => onSelect(country)}
                >
                  {country}
                </Button>
              </DialogClose>
            ))
          ) : (
            <p className="text-xs text-neutral-500">No countries</p>
          )}
        </div>
      ))}
    </div>
  );

  // Generic popup component with headers outside scroll
  const Popup = ({ value, onSelect, label }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {value || label}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[1100px] max-w-none bg-white rounded-2xl shadow-lg p-6 h-[40vh] flex flex-col">
        {/* Region headers row (fixed) */}
        <div className="grid grid-cols-5 gap-6">
          {Object.keys(regions).map((region) => (
            <h3
              key={region}
              className="text-sm font-semibold text-left"
            >
              {region}
            </h3>
          ))}
        </div>
        {/* Scrollable list of country buttons */}
        <div className="flex-1 overflow-y-auto pt-4">
          {renderCountryGridBody(onSelect)}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-[#f9f7f3] text-neutral-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          Global Wealth Comparator
        </h1>

        {/* Country of Residence */}
        <div>
          <label className="block text-sm font-medium mb-1 text-center">
            Country of Residence
          </label>
          <Popup
            value={residence}
            onSelect={setResidence}
            label="Select Country"
          />
        </div>

        {/* Net Worth */}
        <div>
          <label htmlFor="net-worth-input" className="block text-sm font-medium mb-1 text-center">
            Enter Your Net Worth
          </label>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {netWorth ? `${currency} ${netWorth}` : "Enter Net Worth"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white rounded-2xl shadow-lg p-6 max-h-[80vh] overflow-y-auto">
              <div className="pt-8 space-y-4">
                <div className="flex gap-2 mb-4">
                  <select
                    id="currency-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="border rounded px-3 py-2 w-1/3"
                  >
                    {["USD", "EUR", "GBP", "CNY", "INR", "JPY", "CAD", "AUD"].map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                  <Input
                    id="net-worth-input"
                    type="number"
                    value={netWorth}
                    onChange={(e) => setNetWorth(e.target.value)}
                    placeholder="Net Worth"
                    className="w-2/3"
                  />
                </div>
                <DialogClose asChild>
                  <Button className="w-full">Save</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Target Country for Comparison */}
        <div>
          <label className="block text-sm font-medium mb-1 text-center">
            Target Country for Comparison
          </label>
          <Popup
            value={targetCountry}
            onSelect={setTargetCountry}
            label="Select Target Country"
          />
        </div>
      </div>
    </div>
  );
}
