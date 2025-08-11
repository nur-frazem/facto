import { CButton } from "./Container";

export function YButton({ onClick, text, className="" }) {
    return (
        <CButton>
            <button
                onClick={onClick}
                className={`bg-[#17183B] hover:bg-[#2b2e5f] active:bg-[#080813] min-w-32 h-12 leading-none
                            text-white font-semibold flex items-center justify-center px-4 rounded-full transition-colors duration-200 ${className}`}>
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
            className={`bg-[#CC2936] hover:bg-[#ec3f4e] active:bg-[#8b1b24] text-white min-w-32 h-12 leading-none font-semibold flex items-center justify-center px-4 rounded-full transition-colors duration-200 ${className}`}
            >
                {text}
            </button>
        </CButton>
    );
}