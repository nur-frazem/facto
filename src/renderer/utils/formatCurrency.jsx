// src/utils/formatCurrency.jsx
export function formatCLP(number) {
    if (number == null) return "";

    // Asegurarse de que sea número
    const num = Number(number);
    if (isNaN(num)) return "";

    // Formatear a CLP: símbolo $ y separador de miles
    return "$" + num.toLocaleString("es-CL");
}
