export default function Footer() {
    return (
      <footer className="bg-[#030f18] text-white text-center py-4 mt-4 absolute bottom-0 left-0 w-full z-10">
        <p className="text-sm">
          © {new Date().getFullYear()} Powered by Nur — Todos los derechos reservados.
        </p>
      </footer>
    );
  }
  