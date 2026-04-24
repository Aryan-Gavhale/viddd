import React from 'react';

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  // Add more countries as needed
];

export const CountrySelect = ({ value, onChange, error }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Country</label>
      <select
        value={value}
        onChange={onChange}
        className={`
          w-full px-4 py-2 rounded-lg border bg-white appearance-none
          transition-all duration-300 ease-in-out
          ${error ? 'border-red-500' : 'border-gray-300'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          hover:border-blue-300
        `}
      >
        <option value="">Select a country</option>
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
