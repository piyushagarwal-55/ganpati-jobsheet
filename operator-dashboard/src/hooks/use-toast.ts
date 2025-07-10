import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  className?: string;
}

const toasts: Toast[] = [];
const listeners: Array<(toasts: Toast[]) => void> = [];

let toastCounter = 0;

function genId() {
  toastCounter = (toastCounter + 1) % Number.MAX_VALUE;
  return toastCounter.toString();
}

const addToast = (toast: Omit<Toast, "id">) => {
  const id = genId();
  const newToast = {
    ...toast,
    id,
  };
  toasts.push(newToast);
  listeners.forEach((listener) => listener(toasts));

  // Auto remove after 5 seconds
  setTimeout(() => {
    removeToast(id);
  }, 5000);

  return id;
};

const removeToast = (id: string) => {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    listeners.forEach((listener) => listener(toasts));
  }
};

export function useToast() {
  const [toastList, setToastList] = useState<Toast[]>([...toasts]);

  const subscribe = useCallback((listener: (toasts: Toast[]) => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribe(setToastList);
    return unsubscribe;
  }, [subscribe]);

  const toast = useCallback((props: Omit<Toast, "id">) => {
    return addToast(props);
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      removeToast(toastId);
    } else {
      toasts.splice(0, toasts.length);
      listeners.forEach((listener) => listener([]));
    }
  }, []);

  return {
    toast,
    dismiss,
    toasts: toastList,
  };
}

// Add React import for useEffect
import * as React from "react";
