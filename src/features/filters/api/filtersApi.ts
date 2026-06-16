/**
 * Filters API Client
 * Handles all API calls for color grading filters
 */

import type { FilterAsset, FilterCategory } from "../types";

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

export class FiltersApi {
  /**
   * Get all filter categories
   */
  static async getCategories(): Promise<FilterCategory[]> {
    const response = await fetch(`${API_BASE_URL}/filters/categories`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch filter categories: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get filters by category
   */
  static async getByCategory(category: string): Promise<FilterAsset[]> {
    const response = await fetch(`${API_BASE_URL}/filters/${category}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch filters for category ${category}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get a specific filter by category and ID
   */
  static async getById(category: string, id: string): Promise<FilterAsset> {
    const response = await fetch(`${API_BASE_URL}/filters/${category}/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch filter ${id}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Search filters
   */
  static async search(query: string): Promise<FilterAsset[]> {
    const response = await fetch(`${API_BASE_URL}/filters/search?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to search filters: ${response.statusText}`);
    }
    return response.json();
  }
}
