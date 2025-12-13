import arrowRightWhite from "../assets/Logos/arrowRightWhite.png";
import { useTheme } from "../context/ThemeContext";

export function CButton({ children, className }) {
  return (
    <div className={`inline-block ${className}`}>
      {children}
    </div>
  );
}

export function CGrid({ children, rowSizes: _rowSizes = "auto 1fr" }) {
  return (
    <div className="flex flex-col min-h-screen p-4 gap-4">
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
  className = "",
  disabled = false,
  hidden = false
}) {
  const { isLightTheme } = useTheme();

  // Si está oculto, no renderizar
  if (hidden) return null;

  const hasDescription = description.trim() !== "";

  return (
    <div
      className={`
        rounded-xl
        p-4 sm:p-5
        flex
        transition-all duration-200
        ${hasDescription ? "flex-col gap-y-3 relative" : "items-center justify-between"}
        ${content !== null ? "w-auto" : "w-full max-w-[calc(100vw-2rem)] sm:w-80 md:w-96"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${isLightTheme
          ? "bg-white border border-gray-200 shadow-lg"
          : "bg-gradient-card border border-white/5 shadow-card"
        }
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {logo && (
          <img src={logo} alt="logo" className={`w-6 h-6 object-contain ${disabled ? "opacity-50" : ""} ${isLightTheme ? "invert" : ""}`} />
        )}
        <h2 className={`text-base font-semibold ${
          disabled
            ? (isLightTheme ? "text-gray-400" : "text-slate-400")
            : (isLightTheme ? "text-gray-800" : "text-white")
        }`}>{title}</h2>
      </div>

      {/* Description */}
      {hasDescription && (
        <p className={`text-sm leading-relaxed max-w-[90%] break-words max-h-72 overflow-y-auto pr-10 scrollbar-custom ${
          isLightTheme ? "text-gray-500" : "text-slate-400"
        }`}>
          {description}
        </p>
      )}

      {/* Content */}
      {content !== null && (
        <div className={`w-auto ${isLightTheme ? "text-gray-800" : "text-white"} ${contentClassName}`}>
          {content}
        </div>
      )}

      {/* Button */}
      {hasButton && (
        <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          className={`
            w-10 h-10
            flex items-center justify-center
            rounded-full
            transition-all duration-200
            group
            ${hasDescription ? "absolute bottom-4 right-4" : ""}
            ${disabled
              ? (isLightTheme ? "bg-gray-100 cursor-not-allowed" : "bg-white/5 cursor-not-allowed")
              : (isLightTheme
                  ? "bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
                  : "bg-white/5 hover:bg-white/10 active:bg-white/15"
                )
            }
          `}
        >
          <img
            src={arrowRightWhite}
            alt="Continuar"
            className={`w-5 h-5 object-contain transition-opacity ${
              disabled ? "opacity-30" : "opacity-70 group-hover:opacity-100"
            } ${isLightTheme ? "invert" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

// Table wrapper component for consistent table styling
export function TableContainer({ children, className = "" }) {
  const { isLightTheme } = useTheme();

  return (
    <div className={`
      rounded-xl
      overflow-hidden
      ${isLightTheme
        ? "bg-white border border-gray-200 shadow-md"
        : "bg-gradient-card border border-white/5"
      }
      ${className}
    `}>
      {children}
    </div>
  );
}

// Table header for consistent table styling
export function TableHeader({ children, className = "" }) {
  const { isLightTheme } = useTheme();

  return (
    <div className={`
      flex items-center
      px-4 py-3
      text-sm font-medium
      ${isLightTheme
        ? "bg-gray-50 border-b border-gray-200 text-gray-600"
        : "bg-white/5 border-b border-white/10 text-slate-300"
      }
      ${className}
    `}>
      {children}
    </div>
  );
}

// Table row for consistent table styling
export function TableRow({ children, className = "", onClick }) {
  const { isLightTheme } = useTheme();

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center
        px-4 py-3
        text-sm
        transition-colors duration-150
        ${onClick ? 'cursor-pointer' : ''}
        ${isLightTheme
          ? "text-gray-800 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
          : "text-white border-b border-white/5 last:border-b-0 hover:bg-white/5"
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}
