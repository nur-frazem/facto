import { CButton } from "./Container";
import arrowLeftWhite from "../assets/Logos/arrowLeftWhite.png";

export function YButton({ onClick, text, className="", classNameContainer="" }) {
    return (
        <CButton className={`${classNameContainer}`}>
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

export function VolverButton({onClick, className=""}){
    return (
        <button
            onClick={onClick}
            className="px-2 h-10 flex rounded-2xl items-center justify-start hover:bg-[#393c6d] active:bg-[#1f2252] transition-colors gap-2"
        >
            <img
                src={arrowLeftWhite}
                alt="Continue button arrow"
                className="w-6 h-6 object-contain"
            />
            <p className="text-white font-medium">Volver</p>
            
        </button>
    );
}

export function TextButton({onClick, text="", className="", classNameText="", disabled}){
    return (
        <button
            onClick={onClick}
            className={`px-2 h-10 flex rounded-2xl items-center justify-start hover:bg-[#393c6d] active:bg-[#1f2252] transition-colors gap-2 disabled:bg-gray-400 ${className}`}
            disabled={disabled}
        >
            <p className={`${classNameText}`}>{text}</p>
        </button>
    );
}

export function ImgButton({onClick, className="", src, alt, classNameImg="", title}){
    return(
        <button
            onClick={onClick}
            title={title}
            className={`h-fit w-fit p-1 rounded-2xl hover:bg-white/30 active:bg-white/50 transition-colors ${className}`}
        >
            <img src={src} alt={alt} className={classNameImg} />
        </button>
    )
}