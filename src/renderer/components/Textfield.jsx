export function Textfield ({ label, type = "text", value, onChange, placeholder, className="w-full" }) {
    return (
        <div className={`flex flex-col space-y-1 ${className}`}>
        {label && <label className="text-sm font-medium text-white">{label}</label>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="px-4 py-2 rounded-lg hover:border-blue-400 bg-white/10 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
            />
        </div>
    );
}