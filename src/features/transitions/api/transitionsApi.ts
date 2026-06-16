/**
 * Transitions API Client
 * Handles all API calls for transition effects
 */

import type { TransitionAsset, TransitionCategory } from "../types";

const API_BASE_URL = "https://clypra-worker-api.abdulkabirmusa.com";
const API_KEY = import.meta.env.VITE_CLYPRA_API_KEY || "";

// Helper function to create headers with API key
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Clypra-Client": "clypra-desktop-v1",
  };

  if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }

  return headers;
};

export class TransitionsApi {
  /**
   * Get all transition categories
   */
  static async getCategories(): Promise<TransitionCategory[]> {
    const response = await fetch(`${API_BASE_URL}/transitions/categories`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch transition categories: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get transitions by category
   */
  static async getByCategory(category: string): Promise<TransitionAsset[]> {
    const response = await fetch(`${API_BASE_URL}/transitions/${category}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch transitions for category ${category}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get a specific transition by category and ID
   */
  static async getById(category: string, id: string): Promise<TransitionAsset> {
    const response = await fetch(`${API_BASE_URL}/transitions/${category}/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch transition ${id}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Search transitions
   */
  static async search(query: string): Promise<TransitionAsset[]> {
    const response = await fetch(`${API_BASE_URL}/transitions/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to search transitions: ${response.statusText}`);
    }
    return response.json();
  }
}
