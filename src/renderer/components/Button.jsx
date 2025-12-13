import { CButton } from "./Container";
import arrowLeftWhite from "../assets/Logos/arrowLeftWhite.png";
import { useTheme } from "../context/ThemeContext";

// Primary action button (blue)
export function YButton({ onClick, text, className = "", classNameContainer = "", disabled = false }) {
  const { isLightTheme } = useTheme();

  return (
    <CButton className={classNameContainer}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center
          min-w-[8rem] h-11 px-6
          text-white font-semibold text-sm
          rounded-full shadow-btn
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isLightTheme
            ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-400 focus:ring-offset-white disabled:hover:bg-blue-600"
            : "bg-primary hover:bg-primary-hover active:bg-primary-active focus:ring-primary-light focus:ring-offset-surface disabled:hover:bg-primary"
          }
          ${className}
        `}
      >
        {text}
      </button>
    </CButton>
  );
}

// Danger/Cancel button (red)
export function XButton({ onClick, text, className = "", disabled = false }) {
  const { isLightTheme } = useTheme();

  return (
    <CButton>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center
          min-w-[8rem] h-11 px-6
          text-white font-semibold text-sm
          rounded-full shadow-btn
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isLightTheme
            ? "bg-red-500 hover:bg-red-600 active:bg-red-700 focus:ring-red-400 focus:ring-offset-white disabled:hover:bg-red-500"
            : "bg-danger hover:bg-danger-hover active:bg-danger-active focus:ring-danger focus:ring-offset-surface disabled:hover:bg-danger"
          }
          ${className}
        `}
      >
        {text}
      </button>
    </CButton>
  );
}

// Back navigation button
export function VolverButton({ onClick, className = "" }) {
  const { isLightTheme } = useTheme();

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2
        px-3 h-10
        rounded-lg
        transition-all duration-200
        ${isLightTheme
          ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200"
          : "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15"
        }
        ${className}
      `}
    >
      <img
        src={arrowLeftWhite}
        alt="Volver"
        className={`w-5 h-5 object-contain opacity-80 ${isLightTheme ? "invert" : ""}`}
      />
      <span className="font-medium text-sm">Volver</span>
    </button>
  );
}

// Text button (ghost style by default, can be overridden with className)
export function TextButton({ onClick, text = "", className = "", classNameText = "", disabled = false }) {
  const { isLightTheme } = useTheme();

  // Check if a background color is provided in className
  const hasCustomBg = className.includes('bg-');

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        px-4 h-10
        font-medium text-sm
        rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${hasCustomBg
          ? ''
          : isLightTheme
            ? 'bg-transparent hover:bg-gray-100 active:bg-gray-200 disabled:hover:bg-transparent'
            : 'bg-transparent hover:bg-white/10 active:bg-white/15 disabled:hover:bg-transparent'
        }
        ${hasCustomBg ? '' : (isLightTheme ? 'text-gray-700' : 'text-white')}
        ${isLightTheme ? 'focus:ring-gray-300' : 'focus:ring-white/20'}
        ${className}
      `}
    >
      <span className={classNameText}>{text}</span>
    </button>
  );
}

// Icon button
export function ImgButton({ onClick, className = "", src, alt, classNameImg = "", title, disabled = false }) {
  const { isLightTheme } = useTheme();

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        w-9 h-9 p-1.5
        rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isLightTheme
          ? "hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-300"
          : "hover:bg-white/10 active:bg-white/15 focus:ring-white/20"
        }
        ${className}
      `}
    >
      <img src={src} alt={alt} className={`w-full h-full object-contain ${isLightTheme ? 'invert' : ''} ${classNameImg}`} />
    </button>
  );
}

// Success button (green)
export function SuccessButton({ onClick, text, className = "", disabled = false }) {
  const { isLightTheme } = useTheme();

  return (
    <CButton>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center
          min-w-[8rem] h-11 px-6
          text-white font-semibold text-sm
          rounded-full shadow-btn
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isLightTheme
            ? "bg-green-600 hover:bg-green-700 active:bg-green-800 focus:ring-green-400 focus:ring-offset-white disabled:hover:bg-green-600"
            : "bg-success hover:bg-success-hover active:bg-success-active focus:ring-success focus:ring-offset-surface disabled:hover:bg-success"
          }
          ${className}
        `}
      >
        {text}
      </button>
    </CButton>
  );
}
