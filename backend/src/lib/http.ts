export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export function ok<T>(message: string, data: T): ApiEnvelope<T> {
  return { success: true, message, data };
}

export function fail<T>(message: string, data: T): ApiEnvelope<T> {
  return { success: false, message, data };
}
