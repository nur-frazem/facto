import { Children } from "react";

export function CButton({ children }){
    return(
        <div className="m-2 inline-block">
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


export function Card({ logo, title, description, onClick }) {
    return (
        <div className="bg-[#17183B] rounded-2xl p-4 w-96 flex flex-col gap-y-4">
            <div className="flex items-center gap-3 ">
            <img src={logo} alt="logo" className="w-6 h-6 object-contain" />
            <h2 className="text-white text-lg font-bold">{title}</h2>
            </div>
    
            <div className="flex items-center justify-between mt-2">
            <p className="text-gray-300 text-sm max-w-[70%] break-words max-h-72 overflow-y-auto">
                {description}
            </p>
    
            <button
                onClick={onClick}
                className="bg-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors self-end"
            >
                <p className="text-[#323363]">+</p>
            </button>
        </div>
      </div>
    );
  }