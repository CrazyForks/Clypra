/**
 * Transitions API Client
 * Handles all API calls for transition effects
 */

import type { TransitionAsset, TransitionCategory } from "../types";
import { getApiHeaders, getApiBaseUrl } from "@/lib/api";

const API_BASE_URL = getApiBaseUrl();

export class TransitionsApi {
  /**
   * Get all transition categories
   */
  static async getCategories(): Promise<TransitionCategory[]> {
    const response = await fetch(`${API_BASE_URL}/transitions/categories`, {
      headers: getApiHeaders(),
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
      headers: getApiHeaders(),
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
      headers: getApiHeaders(),
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
      headers: getApiHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to search transitions: ${response.statusText}`);
    }
    return response.json();
  }
}
