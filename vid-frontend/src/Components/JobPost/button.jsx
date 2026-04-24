import PropTypes from 'prop-types';

export function Button({ 
  variant, 
  className, 
  children, 
  ...props 
}) {
  const baseStyles = 'px-6 py-2 rounded-lg font-medium transition-all duration-200';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 hover:bg-gray-50',
  };

  return (
    <button
      {...props}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

Button.defaultProps = {
  variant: 'primary',
  className: '',
};
