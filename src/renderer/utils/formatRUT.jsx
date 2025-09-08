// src/utils/formatRUT.jsx
export function formatRUT(rut) {
    if (!rut) return "";
    
    let cleanRut = rut.replace(/\./g, "").replace(/-/g, "");
    let cuerpo = cleanRut.slice(0, -1);
    let dv = cleanRut.slice(-1);

    let reversed = cuerpo.split("").reverse().join("");
    let withDots = reversed.match(/.{1,3}/g).join(".");
    let formattedCuerpo = withDots.split("").reverse().join("");

    return `${formattedCuerpo}-${dv}`;
}
