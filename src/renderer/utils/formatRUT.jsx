// src/utils/formatRUT.jsx
export function formatRUT(rut) {
    if (!rut) return "";

    const cleanRut = rut.replace(/\./g, "").replace(/-/g, "");
    const cuerpo = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);

    const reversed = cuerpo.split("").reverse().join("");
    const withDots = reversed.match(/.{1,3}/g).join(".");
    const formattedCuerpo = withDots.split("").reverse().join("");

    return `${formattedCuerpo}-${dv}`;
}

export function cleanRUT(rut) {
    if (!rut) return "";
    return rut.replace(/\./g, "").replace(/-/g, "");
}