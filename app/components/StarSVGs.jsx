// StarSVGs.jsx (or wherever you define your SVG components)

const StarColor = '#2874F0'; // Define the desired star color
const EmptyStarColor = '#ccc'; // Standard light grey for empty stars

const FullStarSVG = ({ size = 15 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={StarColor}
    width={size}
    height={size}
  >
    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.922-7.416 3.922 1.48-8.279-6.064-5.828 8.332-1.151z" />
  </svg>
);

const PartialStarSVG = ({ size = 15, fillPercentage = 0 }) => {
  // Ensure fillPercentage is between 0 and 100
  const actualFill = Math.max(0, Math.min(100, fillPercentage));
  const gradientId = `partialGradient-${Math.random().toString(36).substring(7)}`; // Unique ID for each gradient

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset={`${actualFill}%`} stopColor={StarColor} />
          <stop offset={`${actualFill}%`} stopColor={EmptyStarColor} />
        </linearGradient>
      </defs>
      <path
        d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.922-7.416 3.922 1.48-8.279-6.064-5.828 8.332-1.151z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
};

const EmptyStarSVG = ({ size = 15 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={EmptyStarColor}
    width={size}
    height={size}
  >
    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.922-7.416 3.922 1.48-8.279-6.064-5.828 8.332-1.151z" />
  </svg>
);

export { FullStarSVG, PartialStarSVG, EmptyStarSVG }; // Export PartialStarSVG instead of HalfStarSVG