// Page title component
export function H1Tittle({ text, subtittle = "", className = "" }) {
  return (
    <div className={`text-center ${className}`}>
      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
        {text}
      </h1>
      {subtittle && (
        <p className="mt-2 text-base text-slate-400 max-w-2xl mx-auto">
          {subtittle}
        </p>
      )}
    </div>
  );
}

// Subtitle component
export function PSubtitle({ text, className = "" }) {
  return (
    <p className={`text-base text-slate-400 text-center max-w-2xl mx-auto ${className}`}>
      {text}
    </p>
  );
}

// Section title component
export function SectionTitle({ text, className = "" }) {
  return (
    <h2 className={`text-lg font-semibold text-white mb-3 ${className}`}>
      {text}
    </h2>
  );
}

// Label text component
export function LabelText({ text, className = "" }) {
  return (
    <span className={`text-sm font-medium text-slate-300 ${className}`}>
      {text}
    </span>
  );
}

// Muted/secondary text component
export function MutedText({ text, className = "" }) {
  return (
    <span className={`text-sm text-slate-500 ${className}`}>
      {text}
    </span>
  );
}
