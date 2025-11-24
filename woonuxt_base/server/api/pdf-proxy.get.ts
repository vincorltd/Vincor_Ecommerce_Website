/**
 * PDF Proxy Endpoint
 * 
 * Proxies PDF requests to avoid CORS issues.
 * Usage: /api/pdf-proxy?url=https://satchart.com/pdf/PRODUCT-SKU.pdf
 */

// In-memory cache for PDFs (server-side)
const pdfCache = new Map<string, { buffer: ArrayBuffer; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const pdfUrl = query.url as string;

  // Validate URL
  if (!pdfUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'PDF URL is required',
    });
  }

  // Only allow PDFs from satchart.com (security measure)
  const allowedDomain = 'satchart.com';
  try {
    const url = new URL(pdfUrl);
    if (!url.hostname.includes(allowedDomain)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'PDF URL must be from satchart.com',
      });
    }
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid PDF URL',
    });
  }

  try {
    // Check if PDF is in server-side cache
    const cached = pdfCache.get(pdfUrl);
    const now = Date.now();
    
    let pdfBuffer: ArrayBuffer;
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Serve from server-side cache
      console.log('[PDF Proxy] ⚡ Serving from server cache:', pdfUrl);
      pdfBuffer = cached.buffer;
    } else {
      // Fetch fresh from satchart.com
      console.log('[PDF Proxy] 🔄 Fetching PDF from source:', pdfUrl);

      const response = await fetch(pdfUrl);

      if (!response.ok) {
        console.error('[PDF Proxy] ❌ Failed to fetch PDF:', response.status, response.statusText);
        throw createError({
          statusCode: response.status,
          statusMessage: `Failed to fetch PDF: ${response.statusText}`,
        });
      }

      // Get the PDF data as buffer
      pdfBuffer = await response.arrayBuffer();
      
      // Store in server-side cache
      pdfCache.set(pdfUrl, { buffer: pdfBuffer, timestamp: now });

      console.log('[PDF Proxy] ✅ PDF fetched and cached, size:', pdfBuffer.byteLength, 'bytes');
    }

    // CRITICAL: Set headers to prevent Netlify CDN from caching PDFs incorrectly
    // PDFs must be cached by their actual URL, not by the proxy URL
    // Include product-specific headers to ensure correct PDF is served
    const urlObj = new URL(pdfUrl);
    const pdfFilename = urlObj.pathname.split('/').pop() || 'unknown';
    
    setHeaders(event, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.byteLength.toString(),
      // CRITICAL: Don't cache at CDN level - let browser cache, but not Netlify
      // This prevents Netlify from serving wrong PDF when switching products
      'Cache-Control': 'private, max-age=3600, must-revalidate',
      'Pragma': 'no-cache',
      'X-PDF-URL': pdfUrl,
      'X-PDF-Filename': pdfFilename,
      'Vary': 'Accept-Encoding, X-PDF-URL',
      'Access-Control-Allow-Origin': '*', // Allow CORS
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    // Return the PDF buffer
    return new Uint8Array(pdfBuffer);
  } catch (error: any) {
    console.error('[PDF Proxy] Error:', error);
    
    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    // Otherwise, wrap it in a generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to proxy PDF',
    });
  }
});


