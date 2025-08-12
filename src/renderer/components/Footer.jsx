export default function Footer() {
    return (
      <footer className="bg-gray-900 text-white text-center py-4 mt-4 sticky bottom-0 z-50">
        <p className="text-sm">
          © {new Date().getFullYear()} Powered by Nur — Todos los derechos reservados.
        </p>
      </footer>
    );
  }
  