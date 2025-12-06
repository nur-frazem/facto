export default function Footer() {
  return (
    <footer className="
      bg-surface-dark
      border-t border-white/5
      text-center
      py-3
      absolute bottom-0 left-0 w-full
      z-10
    ">
      <p className="text-xs text-slate-500">
        © {new Date().getFullYear()} Powered by Nur — Todos los derechos reservados.
      </p>
    </footer>
  );
}
