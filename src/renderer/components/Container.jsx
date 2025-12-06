import arrowRightWhite from "../assets/Logos/arrowRightWhite.png";

export function CButton({ children, className }) {
  return (
    <div className={`inline-block ${className}`}>
      {children}
    </div>
  );
}

export function CGrid({ children, rowSizes = "auto 1fr" }) {
  return (
    <div
      className="grid gap-4 min-h-screen p-4"
      style={{ gridTemplateRows: rowSizes }}
    >
      {children}
    </div>
  );
}

export function Card({
  logo = "",
  title,
  description = "",
  onClick,
  hasButton = true,
  content = null,
  contentClassName = "",
  className = ""
}) {
  const hasDescription = description.trim() !== "";

  return (
    <div
      className={`
        bg-gradient-card
        border border-white/5
        shadow-card
        rounded-xl
        p-5
        flex
        ${hasDescription ? "flex-col gap-y-3 relative" : "items-center justify-between"}
        ${content !== null ? "w-auto" : "w-96"}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {logo && (
          <img src={logo} alt="logo" className="w-6 h-6 object-contain" />
        )}
        <h2 className="text-white text-base font-semibold">{title}</h2>
      </div>

      {/* Description */}
      {hasDescription && (
        <p className="text-slate-400 text-sm leading-relaxed max-w-[90%] break-words max-h-72 overflow-y-auto pr-10 scrollbar-custom">
          {description}
        </p>
      )}

      {/* Content */}
      {content !== null && (
        <div className={`w-auto text-white ${contentClassName}`}>
          {content}
        </div>
      )}

      {/* Button */}
      {hasButton && (
        <button
          onClick={onClick}
          className={`
            w-10 h-10
            flex items-center justify-center
            rounded-full
            bg-white/5 hover:bg-white/10 active:bg-white/15
            transition-all duration-200
            group
            ${hasDescription ? "absolute bottom-4 right-4" : ""}
          `}
        >
          <img
            src={arrowRightWhite}
            alt="Continuar"
            className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
          />
        </button>
      )}
    </div>
  );
}

// Table wrapper component for consistent table styling
export function TableContainer({ children, className = "" }) {
  return (
    <div className={`
      bg-gradient-card
      border border-white/5
      rounded-xl
      overflow-hidden
      ${className}
    `}>
      {children}
    </div>
  );
}

// Table header for consistent table styling
export function TableHeader({ children, className = "" }) {
  return (
    <div className={`
      flex items-center
      px-4 py-3
      bg-white/5
      border-b border-white/10
      text-sm font-medium text-slate-300
      ${className}
    `}>
      {children}
    </div>
  );
}

// Table row for consistent table styling
export function TableRow({ children, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center
        px-4 py-3
        text-sm text-white
        border-b border-white/5 last:border-b-0
        hover:bg-white/5
        transition-colors duration-150
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
