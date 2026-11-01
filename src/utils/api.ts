export const apiFetch = (url: string, init: RequestInit = {}) =>
  fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "X-Requested-With": "life-os", ...init.headers },
  });
