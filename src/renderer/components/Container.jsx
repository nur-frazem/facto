import { Children } from "react";
import arrowRightWhite from "../assets/Logos/arrowRightWhite.png";

export function CButton({ children, className }){
    return(
        <div className={`m-2 inline-block ${className}`}>
            {children}
        </div>
    );
}

export function CGrid({children, rowSizes = "auto 1fr"}){
    return(
        <div 
        className="grid gap-4 min-h-screen p-4"
        style={{gridTemplateRows: rowSizes}}>
            {children}
        </div>
    );
}


export function Card({ logo = "", title, description = "", onClick, hasButton = true, content = null, contentClassName, className }) {
    const hasDescription = description.trim() !== "";

    return (
        <div
            className={`bg-[#062235] shadow-2xl shadow-black rounded-2xl p-4 w-96 flex ${className} ${
                hasDescription ? "flex-col gap-y-2 relative" : "items-center justify-between"
            } h-fit ${content !== null && "w-auto"}`}
        >
            {/* Header */}
            <div className="flex items-center gap-3">
                {logo && (
                    <img src={logo} alt="logo" className="w-6 h-6 object-contain" />
                )}
                <h2 className="text-white text-lg font-bold">{title}</h2>
            </div>

            {/* Descripción si existe */}
            {hasDescription && (
                <p className="text-gray-300 text-sm max-w-[90%] break-words max-h-72 overflow-y-auto pr-12">
                    {description}
                </p>
            )}

            {/* Content */}
            {content !== null && (
                <div className={` w-auto text-white ${contentClassName}`}>
                    {content}
                </div>
            )}

            {/* Botón */}
            {hasButton && (
                <button
                    onClick={onClick}
                    className={` w-10 h-10 flex rounded-full items-center justify-center hover:bg-[#373c8d] active:bg-[#1f2252] transition-colors
                        ${hasDescription ? "absolute bottom-4 right-4" : ""}`}
                >
                    <img
                        src={arrowRightWhite}
                        alt="Continue button arrow"
                        className="w-6 h-6 object-contain"
                    />
                </button>
            )}
            
        </div>
    );
}