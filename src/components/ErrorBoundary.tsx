"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="rounded-2xl border border-red-500/20 bg-red-950/10 backdrop-blur-md w-full h-[400px] flex items-center justify-center">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
            <h2 className="text-lg font-bold text-red-400 mb-2">Erro no Componente</h2>
            <p className="text-sm text-red-400/80 max-w-[300px]">
              {this.props.fallbackMessage || "Houve uma falha ao renderizar os dados. O restante do sistema continua operacional."}
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
