/**
 * WordPress: Get Posts
 * 
 * Retrieve WordPress posts via REST API
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface GetPostsInput {
  per_page?: number;
  page?: number;
  search?: string;
  categories?: number;
  tags?: number;
}

interface Post {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: Record<string, any>;
  categories: number[];
  tags: number[];
}

interface GetPostsResponse {
  posts: Post[];
  total: number;
  totalPages: number;
}

/**
 * Get WordPress posts
 * 
 * @param input - Query parameters for filtering posts
 * @returns List of posts with pagination info
 */
export async function getPosts(input: GetPostsInput = {}): Promise<GetPostsResponse> {
  return callMCPTool<GetPostsResponse>('wordpress__get_posts', input);
}








