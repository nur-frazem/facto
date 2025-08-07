export default function ContinuarButton({ onClick }) {
    return (
        <button
        onClick={onClick}
        className="bg-orange-400 hover:bg-orange-600 active:bg-gray-700 text-white font-semibold py-2 px-4 rounded-3xl transition-colors duration-200"
        >
            Continuar
        </button>
    )
}