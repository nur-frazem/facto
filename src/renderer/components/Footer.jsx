export default function Footer() {
  return (
    <footer className="
      bg-surface-dark
      border-t border-white/5
      text-center
      py-3
      w-full
      mt-auto
      flex-shrink-0
    ">
      <p className="text-xs text-slate-500">
        © {new Date().getFullYear()} Powered by Nur — Todos los derechos reservados.
      </p>
    </footer>
  );
}
