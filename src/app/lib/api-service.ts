export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface ApiClientOptions {
  baseURL?: string;
  timeoutMs?: number;
  defaultHeaders?: HeadersInit;
  getAccessToken?: () => string | null | Promise<string | null>;
  refreshAccessToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
  retry?: { attempts: number; baseDelayMs: number };
  /** Fetch credentials policy (Next.js/CSR): "omit" | "same-origin" | "include" */
  credentials?: RequestInit["credentials"];
}

/** Giữ headers để đọc Retry-After/bối cảnh lỗi */
export class ApiError<T = unknown> extends Error {
  status: number;
  data?: T;
  url: string;
  headers?: Headers;
  constructor(
    message: string,
    status: number,
    url: string,
    data?: T,
    headers?: Headers
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
    this.data = data;
    this.headers = headers;
  }
}

const isBrowser = typeof window !== "undefined";

/** buildURL: xử lý slug tuyệt đối, base rỗng và query đa dạng */
function buildURL(base: string, slug: string, query?: Record<string, unknown>) {
  // 1) Nếu slug đã là tuyệt đối -> dùng luôn
  const isAbsolute = /^https?:\/\//i.test(slug);

  // 2) Tạo URL tạm để thao tác searchParams an toàn
  let u: URL;
  if (isAbsolute) {
    u = new URL(slug);
  } else if (base) {
    const normalizedBase = base.endsWith("/") ? base : base + "/";
    const normalizedSlug = slug.replace(/^\//, "");
    u = new URL(normalizedSlug, normalizedBase);
  } else {
    // base rỗng + slug tương đối -> dùng host giả rồi sẽ loại bỏ
    u = new URL(slug, "http://dummy");
  }

  // 3) Gắn query
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v == null) return;
      if (Array.isArray(v)) {
        v.forEach((item) => u.searchParams.append(k, String(item)));
      } else if (v instanceof Date) {
        u.searchParams.set(k, v.toISOString());
      } else {
        u.searchParams.set(k, String(v));
      }
    });
  }

  // 4) Trả kết quả
  if (!isAbsolute && !base) {
    // Loại bỏ host giả, giữ nguyên đường dẫn tương đối
    return u.toString().replace(/^https?:\/\/dummy/, "");
  }
  return u.toString();
}

async function parseResponse<T>(res: Response): Promise<T | undefined> {
  if (res.status === 204) return undefined;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : undefined;
  }
  return (await res.text()) as unknown as T;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isApiError(e: unknown): e is ApiError {
  return e instanceof Error && (e as Partial<ApiError>).name === "ApiError";
}

export function createApiClient(options: ApiClientOptions = {}) {
  const {
    baseURL = (isBrowser
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : process.env.API_BASE_URL) || "",
    timeoutMs = 30_000,
    defaultHeaders,
    getAccessToken,
    refreshAccessToken,
    onUnauthorized,
    retry = { attempts: 2, baseDelayMs: 300 },
    credentials = "same-origin",
  } = options;

  if (!baseURL) {
    console.warn(
      "[apiClient] baseURL is empty – check env NEXT_PUBLIC_API_BASE_URL/API_BASE_URL"
    );
  }

  async function _fetchWithTimeout(
    input: RequestInfo,
    init: RequestInit,
    timeout = timeoutMs,
    externalController?: AbortController
  ): Promise<Response> {
    const controller = externalController ?? new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  async function _authorizedHeaders(contentType?: string): Promise<Headers> {
    const headers = new Headers({ ...(defaultHeaders || {}) });
    if (contentType) headers.set("Content-Type", contentType);

    const token = getAccessToken
      ? await getAccessToken()
      : isBrowser
      ? localStorage.getItem("token")
      : null;

    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }

  type BodyLike =
    | JsonValue
    | FormData
    | URLSearchParams
    | Blob
    | ArrayBufferView
    | string
    | null
    | undefined;

  // Overloads
  async function _request<T>(
    method: HttpMethod,
    slug: string,
    opts?: {
      query?: Record<string, unknown>;
      body?: BodyLike;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
      expectBlob?: false;
      expectText?: false;
      retryEnabled?: boolean;
    }
  ): Promise<T>;
  async function _request(
    method: HttpMethod,
    slug: string,
    opts: {
      query?: Record<string, unknown>;
      body?: BodyLike;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
      expectBlob: true;
      expectText?: false;
      retryEnabled?: boolean;
    }
  ): Promise<Blob>;
  async function _request(
    method: HttpMethod,
    slug: string,
    opts: {
      query?: Record<string, unknown>;
      body?: BodyLike;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
      expectBlob?: false;
      expectText: true;
      retryEnabled?: boolean;
    }
  ): Promise<string>;

  async function _request<T>(
    method: HttpMethod,
    slug: string,
    {
      query,
      body,
      headers,
      controller,
      timeout,
      expectBlob = false,
      expectText = false,
      retryEnabled,
    }: {
      query?: Record<string, unknown>;
      body?: BodyLike;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
      expectBlob?: boolean;
      expectText?: boolean;
      retryEnabled?: boolean;
    } = {}
  ): Promise<T | Blob | string> {
    const url = buildURL(baseURL, slug, query);

    let finalBody: BodyInit | undefined;
    let contentType: string | undefined;

    if (body instanceof FormData) {
      finalBody = body;
    } else if (body instanceof URLSearchParams) {
      contentType = "application/x-www-form-urlencoded;charset=UTF-8";
      finalBody = body.toString();
    } else if (body instanceof Blob || typeof body === "string") {
      finalBody = body;
    } else if (body && typeof body === "object") {
      contentType = "application/json";
      finalBody = JSON.stringify(body as JsonValue);
    }

    const baseHeaders = await _authorizedHeaders(contentType);
    const mergedHeaders = new Headers(baseHeaders);
    if (!expectBlob && !expectText && !mergedHeaders.has("Accept")) {
      mergedHeaders.set("Accept", "application/json");
    }
    if (headers) {
      Object.entries(headers).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        mergedHeaders.set(k, String(v));
      });
    }

    const doRetry = retryEnabled ?? (method === "GET" || method === "HEAD");
    let attempt = 0;
    let lastErr: unknown;

    // #1: chặn vòng lặp 401 khi refresh token thất bại/lặp lại
    let didRefresh = false;

    while (attempt <= retry.attempts) {
      try {
        const res = await _fetchWithTimeout(
          url,
          { method, headers: mergedHeaders, body: finalBody, credentials },
          timeout ?? timeoutMs,
          controller
        );

        if (res.status === 401 && refreshAccessToken && !didRefresh) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            mergedHeaders.set("Authorization", `Bearer ${newToken}`);
            didRefresh = true; // refresh chỉ 1 lần
            continue; // thử lại ngay
          }
          onUnauthorized?.();
        }

        if (!res.ok) {
          // cố gắng đọc lỗi (json hoặc text)
          let errData: unknown = undefined;
          try {
            const ct = res.headers.get("content-type") ?? "";
            if (ct.includes("application/json")) errData = await res.json();
            else errData = await res.text();
          } catch {
            /* ignore */
          }
          throw new ApiError(
            `[${res.status}] ${res.statusText || "Request failed"}`,
            res.status,
            url,
            errData,
            res.headers
          );
        }

        if (expectBlob) return await res.blob();
        if (expectText) return await res.text();

        return (await parseResponse<T>(res)) as T;
      } catch (err: unknown) {
        lastErr = err;

        // #2: Retry-After + jitter + chỉ retry lỗi mạng/5xx/408/429
        const status = isApiError(err) ? err.status : undefined;
        const retriableStatus =
          status !== undefined
            ? status >= 500 || status === 408 || status === 429
            : true;

        if (!doRetry || !retriableStatus || attempt === retry.attempts) break;

        let backoff = retry.baseDelayMs * Math.pow(2, attempt);

        // Đọc Retry-After nếu có
        if (isApiError(err) && err.headers) {
          const ra = err.headers.get("retry-after");
          if (ra) {
            const seconds = Number(ra);
            if (!Number.isNaN(seconds)) {
              backoff = Math.max(backoff, seconds * 1000);
            } else {
              const when = Date.parse(ra);
              if (!Number.isNaN(when)) {
                const ms = when - Date.now();
                if (ms > 0) backoff = Math.max(backoff, ms);
              }
            }
          }
        }

        const jitter = Math.floor(Math.random() * 100);
        await delay(backoff + jitter);
        attempt += 1;
        continue;
      }
    }

    throw lastErr;
  }

  // ===== Public APIs =====
  function get<T>(
    slug: string,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
      retryEnabled?: boolean;
    }
  ) {
    return _request<T>("GET", slug, opts);
  }

  function getId<T>(
    slug: string,
    id: string | number,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
    }
  ) {
    return _request<T>("GET", `${slug}/${id}`, opts);
  }

  function post<T>(
    slug: string,
    data?:
      | JsonValue
      | FormData
      | URLSearchParams
      | Blob
      | ArrayBufferView
      | string
      | null,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
      retryEnabled?: boolean;
    }
  ) {
    return _request<T>("POST", slug, { ...opts, body: data });
  }

  function put<T>(
    slug: string,
    data?:
      | JsonValue
      | FormData
      | URLSearchParams
      | Blob
      | ArrayBufferView
      | string
      | null,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
    }
  ) {
    return _request<T>("PUT", slug, {
      ...opts,
      body: data,
      retryEnabled: false,
    });
  }

  function putId<T>(
    slug: string,
    id: string | number,
    data?:
      | JsonValue
      | FormData
      | URLSearchParams
      | Blob
      | ArrayBufferView
      | string
      | null,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
    }
  ) {
    return _request<T>("PUT", `${slug}/${id}`, {
      ...opts,
      body: data,
      retryEnabled: false,
    });
  }

  function patch<T>(
    slug: string,
    data?:
      | JsonValue
      | FormData
      | URLSearchParams
      | Blob
      | ArrayBufferView
      | string
      | null,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
    }
  ) {
    return _request<T>("PATCH", slug, {
      ...opts,
      body: data,
      retryEnabled: false,
    });
  }

  function del<T>(
    slug: string,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
    }
  ) {
    return _request<T>("DELETE", slug, { ...opts, retryEnabled: false });
  }

  function postForm<T>(
    slug: string,
    data: Record<string, string>,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
    }
  ) {
    const params = new URLSearchParams(data);
    return _request<T>("POST", slug, { ...opts, body: params });
  }

  function postMultipart<T>(
    slug: string,
    form: FormData,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
    }
  ) {
    return _request<T>("POST", slug, { ...opts, body: form });
  }

  async function download(
    slug: string,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
      retryEnabled?: boolean;
    }
  ): Promise<Blob> {
    return _request("GET", slug, {
      ...opts,
      expectBlob: true,
    });
  }

  function text(
    slug: string,
    opts?: {
      query?: Record<string, unknown>;
      headers?: HeadersInit;
      controller?: AbortController;
      timeout?: number;
    }
  ): Promise<string> {
    return _request("GET", slug, { ...opts, expectText: true });
  }

  return {
    get,
    post,
    put,
    patch,
    del,
    postForm,
    postMultipart,
    download,
    text,
    getId,
    putId,
    buildURL: (slug: string, query?: Record<string, unknown>) =>
      buildURL(baseURL, slug, query),
  };
}
