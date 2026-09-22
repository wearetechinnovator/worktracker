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
  duration?: string;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  projects?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function getClients(userId?: string): Promise<ApiResponse<any[]>> {
  try {
    const url = userId ? `/api/clients?userId=${encodeURIComponent(userId)}` : "/api/clients";
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      return {
        success: false,
        message: result.message || "Failed to load clients",
        data: [],
      };
    }

    return {
      success: true,
      data: result.data || [],
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to load clients",
      data: [],
    };
  }
}

export async function getClient(id: string): Promise<ApiResponse<any>> {
  try {
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
      return {
        success: false,
        message: result.message || "Failed to load client",
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to load client",
    };
  }
}

export async function createClient(
  payload: ClientPayload
): Promise<ApiResponse<any>> {
  try {
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      return {
        success: false,
        message: result.message || "Failed to create client",
      };
    }

    return {
      success: true,
      message: result.message || "Client created successfully",
      data: result.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to create client",
    };
  }
}

export async function updateClient(
  id: string,
  data: any
): Promise<ApiResponse<any>> {
  try {
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
      return {
        success: false,
        message: `Update client failed (${response.status})`,
      };
    }

    if (!response.ok || result.success === false) {
      return {
        success: false,
        message: result.message || "Failed to update client",
      };
    }

    return {
      success: true,
      message: result.message || "Client updated successfully",
      data: result.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to update client",
    };
  }
}

export async function deleteClient(id: string): Promise<ApiResponse<any>> {
  try {
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
      return {
        success: false,
        message: result.message || "Failed to delete client",
      };
    }

    return {
      success: true,
      message: result.message || "Client deleted successfully",
      data: result.data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to delete client",
    };
  }
}