import { useTheme } from "../context/ThemeContext";

// Page title component
export function H1Tittle({ text, subtittle = "", className = "" }) {
  const { isLightTheme } = useTheme();

  return (
    <div className={`text-center ${className}`}>
      <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLightTheme ? "text-gray-800" : "text-white"}`}>
        {text}
      </h1>
      {subtittle && (
        <p className={`mt-2 text-base max-w-2xl mx-auto ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>
          {subtittle}
        </p>
      )}
    </div>
  );
}

// Subtitle component
export function PSubtitle({ text, className = "" }) {
  const { isLightTheme } = useTheme();

  return (
    <p className={`text-base text-center max-w-2xl mx-auto ${isLightTheme ? "text-gray-500" : "text-slate-400"} ${className}`}>
      {text}
    </p>
  );
}

// Section title component
export function SectionTitle({ text, className = "" }) {
  const { isLightTheme } = useTheme();

  return (
    <h2 className={`text-lg font-semibold mb-3 ${isLightTheme ? "text-gray-800" : "text-white"} ${className}`}>
      {text}
    </h2>
  );
}

// Label text component
export function LabelText({ text, className = "" }) {
  const { isLightTheme } = useTheme();

  return (
    <span className={`text-sm font-medium ${isLightTheme ? "text-gray-600" : "text-slate-300"} ${className}`}>
      {text}
    </span>
  );
}

// Muted/secondary text component
export function MutedText({ text, className = "" }) {
  const { isLightTheme } = useTheme();

  return (
    <span className={`text-sm ${isLightTheme ? "text-gray-400" : "text-slate-500"} ${className}`}>
      {text}
    </span>
  );
}
