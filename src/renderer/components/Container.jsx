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