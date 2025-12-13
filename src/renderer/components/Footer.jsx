import { useTheme } from "../context/ThemeContext";

export default function Footer() {
  const { isLightTheme } = useTheme();

  return (
    <footer className={`
      border-t
      text-center
      py-3
      w-full
      mt-auto
      flex-shrink-0
      ${isLightTheme
        ? "bg-gray-50 border-gray-200"
        : "bg-surface-dark border-white/5"
      }
    `}>
      <p className={`text-xs ${isLightTheme ? "text-gray-400" : "text-slate-500"}`}>
        © {new Date().getFullYear()} Powered by Nur — Todos los derechos reservados.
      </p>
    </footer>
  );
}
