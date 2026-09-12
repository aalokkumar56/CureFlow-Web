export interface ApiClient {
  get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
  ): Promise<T>

  post<T = unknown>(
    url: string,
    data?: unknown,
  ): Promise<T>

  put<T = unknown>(
    url: string,
    data?: unknown,
  ): Promise<T>

  patch<T = unknown>(
    url: string,
    data?: unknown,
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