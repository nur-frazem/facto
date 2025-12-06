import { CButton } from "./Container";
import arrowLeftWhite from "../assets/Logos/arrowLeftWhite.png";

// Primary action button (blue)
export function YButton({ onClick, text, className = "", classNameContainer = "", disabled = false }) {
  return (
    <CButton className={classNameContainer}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center
          min-w-[8rem] h-11 px-6
          bg-primary hover:bg-primary-hover active:bg-primary-active
          text-white font-semibold text-sm
          rounded-full shadow-btn
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 focus:ring-offset-surface
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary
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
  return (
    <CButton>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center
          min-w-[8rem] h-11 px-6
          bg-danger hover:bg-danger-hover active:bg-danger-active
          text-white font-semibold text-sm
          rounded-full shadow-btn
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 focus:ring-offset-surface
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-danger
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
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2
        px-3 h-10
        text-white/80 hover:text-white
        rounded-lg
        hover:bg-white/10 active:bg-white/15
        transition-all duration-200
        ${className}
      `}
    >
      <img
        src={arrowLeftWhite}
        alt="Volver"
        className="w-5 h-5 object-contain opacity-80"
      />
      <span className="font-medium text-sm">Volver</span>
    </button>
  );
}

// Text button (ghost style by default, can be overridden with className)
export function TextButton({ onClick, text = "", className = "", classNameText = "", disabled = false }) {
  // Check if a background color is provided in className
  const hasCustomBg = className.includes('bg-');

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        px-4 h-10
        text-white font-medium text-sm
        rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-white/20
        disabled:opacity-50 disabled:cursor-not-allowed
        ${hasCustomBg ? '' : 'bg-transparent hover:bg-white/10 active:bg-white/15 disabled:hover:bg-transparent'}
        ${className}
      `}
    >
      <span className={classNameText}>{text}</span>
    </button>
  );
}

// Icon button
export function ImgButton({ onClick, className = "", src, alt, classNameImg = "", title, disabled = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        w-9 h-9 p-1.5
        rounded-lg
        hover:bg-white/10 active:bg-white/15
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-white/20
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <img src={src} alt={alt} className={`w-full h-full object-contain ${classNameImg}`} />
    </button>
  );
}

// Success button (green)
export function SuccessButton({ onClick, text, className = "", disabled = false }) {
  return (
    <CButton>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center
          min-w-[8rem] h-11 px-6
          bg-success hover:bg-success-hover active:bg-success-active
          text-white font-semibold text-sm
          rounded-full shadow-btn
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 focus:ring-offset-surface
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-success
          ${className}
        `}
      >
        {text}
      </button>
    </CButton>
  );
}
