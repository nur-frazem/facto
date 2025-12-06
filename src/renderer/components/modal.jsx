export function Modal({ children, onClickOutside, className = "", classNameContainer = "" }) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 animate-fade-in ${classNameContainer}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClickOutside}
      />

      {/* Modal window */}
      <div
        className={`
          relative
          w-auto max-w-4xl
          mx-4
          p-6
          bg-gradient-to-br from-surface-light to-surface
          border border-white/10
          rounded-xl
          shadow-modal
          text-white
          z-50
          animate-slide-up
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
}

// Confirmation modal component
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar acción",
  message = "¿Está seguro que desea continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger" // danger | warning | info
}) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: "bg-danger hover:bg-danger-hover",
    warning: "bg-yellow-500 hover:bg-yellow-600",
    info: "bg-accent-blue hover:bg-blue-600"
  };

  return (
    <Modal onClickOutside={onClose} className="max-w-md">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <p className="text-slate-300 text-sm mb-6">{message}</p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="
              px-5 py-2.5
              bg-white/10 hover:bg-white/20
              text-white text-sm font-medium
              rounded-full
              transition-all duration-200
            "
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`
              px-5 py-2.5
              text-white text-sm font-medium
              rounded-full
              transition-all duration-200
              ${variantStyles[variant]}
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Loading modal component
export function LoadingModal({ isOpen, message = "Cargando..." }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Loading card */}
      <div className="relative z-50 flex flex-col items-center justify-center px-10 py-8 bg-gradient-to-br from-surface-light to-surface border border-white/10 rounded-2xl shadow-modal min-w-[200px]">
        {/* Spinner */}
        <div className="relative w-14 h-14 mb-5">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent-blue animate-spin" />
          {/* Inner glow */}
          <div className="absolute inset-2 rounded-full bg-accent-blue/10" />
        </div>

        {/* Message */}
        <p className="text-base font-medium text-white">{message}</p>

        {/* Subtle dots animation */}
        <div className="flex gap-1 mt-3">
          <span className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// Alert/Message modal component
export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = "info" // success | error | warning | info
}) {
  if (!isOpen) return null;

  const iconStyles = {
    success: { bg: "bg-success/20", text: "text-success", icon: "M5 13l4 4L19 7" },
    error: { bg: "bg-danger/20", text: "text-danger", icon: "M6 18L18 6M6 6l12 12" },
    warning: { bg: "bg-yellow-500/20", text: "text-yellow-500", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 17.333 3.532 19 5.072 19z" },
    info: { bg: "bg-accent-blue/20", text: "text-accent-blue", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }
  };

  const style = iconStyles[variant];

  return (
    <Modal onClickOutside={onClose} className="max-w-sm">
      <div className="text-center">
        <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${style.bg}`}>
          <svg className={`w-6 h-6 ${style.text}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
          </svg>
        </div>

        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <p className="text-slate-300 text-sm mb-5">{message}</p>

        <button
          onClick={onClose}
          className="
            px-6 py-2.5
            bg-white/10 hover:bg-white/20
            text-white text-sm font-medium
            rounded-full
            transition-all duration-200
          "
        >
          Aceptar
        </button>
      </div>
    </Modal>
  );
}
