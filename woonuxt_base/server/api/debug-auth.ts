import { defineEventHandler, getHeaders, parseCookies } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const headers = getHeaders(event);
  
  return {
    environment: process.env.NODE_ENV,
    graphqlEndpoint: config.public.graphqlEndpoint,
    headers: headers,
    cookies: parseCookies(event),
    origin: headers.origin || 'unknown'
  };
});
