"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}
export class SceneErrorBoundary extends Component<Props, State> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Quisqueya 3D scene error", error, info);
  }
  render() {
    if (this.state.hasError)
      return (
        <div className="flex h-full items-center justify-center bg-[#071323] p-8 text-center">
          <div>
            <p className="display text-3xl">La vista 3D no está disponible</p>
            <p className="mt-3 max-w-md text-sm text-white/60">
              Puedes continuar usando la lista accesible de secciones.
            </p>
          </div>
        </div>
      );
    return this.props.children;
  }
}
