export default function LoadingSpinner({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" className="animate-spin">
        <circle cx="20" cy="20" r="16" fill="none" stroke="#EDE6DF" strokeWidth="3" />
        <circle cx="20" cy="20" r="16" fill="none" stroke="#C25B6E" strokeWidth="3"
          strokeDasharray="60 40" strokeLinecap="round" />
      </svg>
    </div>
  );
}
