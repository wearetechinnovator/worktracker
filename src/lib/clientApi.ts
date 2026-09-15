export interface ClientContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  designation?: string;
  label?: string;
}

export interface ClientPayload {
  id?: string;
  qd_id?: string | null;
  name: string;
  emails?: string[];
  address?: string;
  phone?: string;
  contacts?: ClientContactPayload[];
  status?: number;
}

export async function getClients() {
  const response = await fetch("/api/clients", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Failed to load clients"
    );
  }

  return result.data || [];
}

export async function getClient(id: string) {
  const response = await fetch(
    `/api/clients?id=${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Failed to load client"
    );
  }

  return result.data;
}

export async function createClient(
  payload: ClientPayload
) {
  const response = await fetch("/api/clients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Failed to create client"
    );
  }

  return result.data;
}

export async function updateClient(
  id: string,
  data: any
) {
  const response = await fetch(
    `/api/clients?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  const text = await response.text();

  let result: any;

  try {
    result = JSON.parse(text);
  } catch {
    console.error("Update client returned non-JSON:", text);

    throw new Error(
      `Update client failed (${response.status})`
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Failed to update client"
    );
  }

  return result;
}
export async function deleteClient(id: string) {
  const response = await fetch(
    `/api/clients?id=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || "Failed to delete client"
    );
  }

  return result.data;
}