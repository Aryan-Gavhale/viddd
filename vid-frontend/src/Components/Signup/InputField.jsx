import React from 'react';

export const InputField = ({ label, type, placeholder, value, onChange, error, name }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      name={name} // Make sure the name prop is passed
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`mt-1 block w-full px-3 py-2 border ${
        error ? 'border-red-500' : 'border-gray-300'
      } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
    />
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
);
