
    export function Input({ label, error, className = '', ...props }) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          {...props}
          className={`
            w-full px-4 py-2 rounded-lg border border-gray-300
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
  
  