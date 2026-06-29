"use client";

import {
  COMMON_ERRORS,
  getErrorCode,
  getErrorMessagePt,
  getValidationErrors,
} from "@/lib/errors";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import * as React from "react";

export type ErrorSeverity = "error" | "warning" | "info" | "success";

interface ErrorAlertProps {
  error: unknown;
  severity?: ErrorSeverity;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const severityConfig: Record<
  ErrorSeverity,
  { icon: React.ElementType; className: string }
> = {
  error: {
    icon: XCircle,
    className:
      "border-red-200 bg-red-50 text-red-900 dark:bg-red-950 dark:border-red-900 dark:text-red-200",
  },
  warning: {
    icon: AlertCircle,
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-900 dark:text-yellow-200",
  },
  info: {
    icon: Info,
    className:
      "border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-200",
  },
  success: {
    icon: CheckCircle,
    className:
      "border-green-200 bg-green-50 text-green-900 dark:bg-green-950 dark:border-green-900 dark:text-green-200",
  },
};

export function ErrorAlert({
  error,
  severity = "error",
  title,
  dismissible = false,
  onDismiss,
  className,
}: ErrorAlertProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  const message = getErrorMessagePt(error);
  const code = getErrorCode(error);

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-lg border p-4",
        config.className,
        className,
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-medium">{title}</h4>}
        <p className="text-sm">{message}</p>
        {code && <p className="text-xs opacity-70 mt-1">Código: {code}</p>}
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>
      )}
    </div>
  );
}

interface ErrorListProps {
  errors: unknown[];
  className?: string;
}

export function ErrorList({ errors, className }: ErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div
      className={cn("space-y-2", className)}
      role="list"
      aria-label="Lista de erros"
    >
      {errors.map((error, index) => (
        <ErrorAlert key={index} error={error} dismissible />
      ))}
    </div>
  );
}

interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p
      className={cn("text-sm text-red-600 dark:text-red-400", className)}
      role="alert"
    >
      {error}
    </p>
  );
}

interface FormErrorProps {
  error?: string | null;
  className?: string;
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null;

  return (
    <div
      className={cn(
        "rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-3",
        className,
      )}
      role="alert"
    >
      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
    </div>
  );
}

export function NetworkError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950",
        className,
      )}
      role="alert"
    >
      <XCircle className="h-10 w-10 text-red-500 mb-3" />
      <h3 className="font-medium text-red-900 dark:text-red-200 mb-1">
        Erro de conexão
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 mb-4">
        {COMMON_ERRORS.NETWORK_ERROR}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function ServerError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
      <h3 className="font-medium text-red-900 dark:text-red-200 mb-1">
        Erro no servidor
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 mb-4">
        {COMMON_ERRORS.SERVER_ERROR}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function NotFoundError({
  resource = "Recurso",
  className,
}: {
  resource?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-950",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-10 w-10 text-gray-500 mb-3" />
      <h3 className="font-medium text-gray-900 dark:text-gray-200 mb-1">
        {resource} não encontrado
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        O {resource.toLowerCase()} que você procura não existe ou foi removido.
      </p>
    </div>
  );
}

export function UnauthorizedError({
  onLogin,
  className,
}: {
  onLogin?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center dark:border-yellow-900 dark:bg-yellow-950",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-10 w-10 text-yellow-500 mb-3" />
      <h3 className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
        Acesso não autorizado
      </h3>
      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
        {COMMON_ERRORS.UNAUTHORIZED}
      </p>
      {onLogin && (
        <button
          type="button"
          onClick={onLogin}
          className="text-sm font-medium text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
        >
          Fazer login
        </button>
      )}
    </div>
  );
}

interface ValidationSummaryProps {
  errors: Record<string, string[]> | undefined;
  className?: string;
  showFieldNames?: boolean;
}

/**
 * Displays a summary of validation errors with field names
 * Example output:
 * - O campo "nome" é obrigatório
 * - "e-mail" deve ser um e-mail válido
 * - "preço" deve ser maior ou igual a 0
 */
export function ValidationSummary({
  errors,
  className,
  showFieldNames = true,
}: ValidationSummaryProps) {
  if (!errors || Object.keys(errors).length === 0) return null;

  const validationErrors = getValidationErrors(errors);

  if (validationErrors.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950",
        className,
      )}
      role="alert"
      aria-label="Erros de validação"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">
            Corrija os seguintes erros:
          </h4>
          <ul className="space-y-1.5">
            {validationErrors.map((error, index) => (
              <li
                key={`${error.field}-${index}`}
                className="text-sm text-red-800 dark:text-red-300 flex items-start gap-2"
              >
                <span className="text-red-500">•</span>
                <span>{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface FieldValidationErrorProps {
  errors: Record<string, string[]> | undefined;
  field: string;
  className?: string;
}

/**
 * Display validation error for a specific form field
 * Use this next to individual form inputs
 */
export function FieldValidationError({
  errors,
  field,
  className,
}: FieldValidationErrorProps) {
  if (!errors || !errors[field] || errors[field].length === 0) {
    return null;
  }

  const fieldErrors = getValidationErrors(errors).filter(
    (e) => e.field === field,
  );

  if (fieldErrors.length === 0) return null;

  return (
    <div
      className={cn("text-sm text-red-600 dark:text-red-400 mt-1", className)}
      role="alert"
    >
      {fieldErrors.map((error, index) => (
        <span key={index}>
          {error.message}
          {index < fieldErrors.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}
