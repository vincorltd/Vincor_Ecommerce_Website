import { defineEventHandler, getHeaders, parseCookies } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const headers = getHeaders(event);
  const cookies = parseCookies(event);
  
  // Get domain information
  const host = headers.host || 'unknown';
  const origin = headers.origin || 'unknown';
  const referer = headers.referer || 'unknown';
  
  // Check for specific headers and cookies
  const hasWooSession = !!cookies['woocommerce-session'];
  const hasWpNonce = !!headers['x-wp-nonce'];
  
  return {
    environment: process.env.NODE_ENV,
    graphqlEndpoint: config.public.graphqlEndpoint,
    gqlHost: process.env.GQL_HOST,
    netlifyUrl: process.env.NETLIFY_URL,
    domain: {
      host,
      origin,
      referer
    },
    headers: {
      ...headers,
      'user-agent': headers['user-agent'] || 'unknown',
      'accept': headers.accept || 'unknown',
      'accept-language': headers['accept-language'] || 'unknown'
    },
    cookies,
    auth: {
      hasWooSession,
      hasWpNonce,
      wooSessionValue: hasWooSession ? `Session ${cookies['woocommerce-session'].substring(0, 10)}...` : null
    }
  };
});
