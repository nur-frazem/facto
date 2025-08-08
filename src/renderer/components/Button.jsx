import { CButton } from "./Container";

export function YButton({ onClick, text, className="" }) {
    return (
        <CButton>
            <button
                onClick={onClick}
                className={`bg-orange-400 hover:bg-orange-600 active:bg-gray-700 
                            text-white font-semibold py-2 px-4 rounded-3xl transition-colors duration-200 ${className}`}>
                    {text}
            </button>
        </CButton>
        
    );
}

export function XButton({ onClick, text, className="" }) {
    return (
        <CButton>
            <button
            onClick={onClick}
            className={`bg-red-500 hover:bg-red-600 active:bg-gray-700 text-white font-semibold py-2 px-4 rounded-3xl transition-colors duration-200 ${className}`}
            >
                {text}
            </button>
        </CButton>
    );
}