/**
 * WordPress: Get Post
 * 
 * Retrieve a single WordPress post by ID
 */

import { callMCPTool } from '../../../server/mcp/client.js';

interface GetPostInput {
  id: number;
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

/**
 * Get a single WordPress post by ID
 * 
 * @param input - Post ID
 * @returns Post details
 */
export async function getPost(input: GetPostInput): Promise<Post> {
  if (!input.id) {
    throw new Error('Post ID is required');
  }
  
  return callMCPTool<Post>('wordpress__get_post', input);
}





