// ui/Toast.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationCircle,
  faInfoCircle,
  faExclamationTriangle,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export function ToastProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const scheduleToastRemoval = useCallback(
    (id: string, duration: number) => {
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 5000) => {
      const id = crypto.randomUUID();
      const newToast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);
      scheduleToastRemoval(id, duration);
    },
    [scheduleToastRemoval],
  );

  const contextValue = useMemo(
    () => ({ showToast, toasts }),
    [showToast, toasts],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex flex-col-reverse gap-2 p-4 pt-0 md:bottom-auto md:top-0">
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useAppToast = () => {
  const { showToast } = useToast();

  return {
    success: (message: string, duration?: number) =>
      showToast(message, "success", duration),
    error: (message: string, duration?: number) =>
      showToast(message, "error", duration),
    info: (message: string, duration?: number) =>
      showToast(message, "info", duration),
    warning: (message: string, duration?: number) =>
      showToast(message, "warning", duration),
  };
};

function ToastComponent({
  toast,
  onClose,
}: Readonly<{
  toast: Toast;
  onClose: () => void;
}>) {
  const { type, message } = toast;

  const config = {
    success: {
      bg: "bg-green-500/20",
      border: "border-green-500/50",
      icon: faCheckCircle,
      iconColor: "text-green-400",
      accent: "bg-green-400",
    },
    error: {
      bg: "bg-red-500/20",
      border: "border-red-500/50",
      icon: faExclamationCircle,
      iconColor: "text-red-400",
      accent: "bg-red-400",
    },
    warning: {
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/50",
      icon: faExclamationTriangle,
      iconColor: "text-yellow-400",
      accent: "bg-yellow-400",
    },
    info: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/50",
      icon: faInfoCircle,
      iconColor: "text-blue-400",
      accent: "bg-blue-400",
    },
  };

  const { bg, border, icon: Icon, iconColor, accent } = config[type];

  return (
    <div
      className={`relative min-w-[320px] max-w-[450px] ${bg} ${border} border backdrop-blur-xl animate-in fade-in slide-in-from-right-5 pointer-events-auto rounded-2xl p-4 shadow-2xl transition-all duration-300 md:mt-2`}
    >
      {/* Accent line */}
      <div className={`absolute left-0 top-1/4 h-1/2 w-1.5 rounded-r-full ${accent}`} />

      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex-shrink-0">
          <FontAwesomeIcon
            icon={Icon}
            className={`h-5 w-5 ${iconColor}`}
          />
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-semibold text-white/95 leading-tight">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 text-white/40 transition-colors hover:text-white"
        >
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
