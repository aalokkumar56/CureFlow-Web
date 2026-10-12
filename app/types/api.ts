export interface ApiClient {
  getVersioned<T = unknown>(url: string): Promise<{ data: T; etag?: string }>
  download(url: string, options?: { signal?: AbortSignal }): Promise<Blob>
  get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<T>

  post<T = unknown>(
    url: string,
    data?: unknown,
    options?: { ifMatch?: string; idempotencyKey?: string },
  ): Promise<T>

  put<T = unknown>(
    url: string,
    data?: unknown,
  ): Promise<T>

  patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: { ifMatch?: string },
  ): Promise<T>

  delete<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
  ): Promise<T>
}

declare module '#app' {
  interface NuxtApp {
    $api: ApiClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: ApiClient
  }
}

export {}
