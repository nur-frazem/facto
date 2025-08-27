export function Modal({children, onClickOutside, onClickButton}){
    return(
            <div className="fixed inset-0 flex items-center justify-center z-50">
                {/* Fondo semitransparente */}
                <div
                className="absolute inset-0 bg-black/50"
                onClick={onClickOutside}
                ></div>

                {/* Ventana modal */}
                <div className="relative w-auto max-w-2xl p-6 rounded-xl bg-gradient-to-tl from-sky-950 to-sky-900 text-white shadow-lg z-50">
                    {children}
                </div>

            </div>
    );
}