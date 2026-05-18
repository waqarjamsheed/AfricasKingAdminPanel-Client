export default function SportsPage() {
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-24 pb-10">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'var(--ak-card)' }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f44335" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--ak-text)' }}>
        Sports
      </h1>
      <p className="text-sm font-semibold mb-1" style={{ color: '#f44335' }}>
        Coming Soon
      </p>
      <p className="text-xs text-center max-w-xs leading-relaxed" style={{ color: 'var(--ak-muted)' }}>
        Search daily sports to find out what channels are playing what race or game
      </p>
    </div>
  );
}
