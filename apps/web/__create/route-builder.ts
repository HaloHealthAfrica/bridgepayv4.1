import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import type { Handler } from 'hono/types';

const API_BASENAME = '/api';
const api = new Hono();

// Get the API directory path
const __dirname = join(fileURLToPath(new URL('.', import.meta.url)), '../src/app/api');

console.log('🔧 Route Builder: Starting API route registration...');
console.log('📁 API Directory:', __dirname);

// Recursively find all route.js files
async function findRouteFiles(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir);
    let routes: string[] = [];

    for (const file of files) {
      try {
        const filePath = join(dir, file);
        const statResult = await stat(filePath);

        if (statResult.isDirectory()) {
          // Recursively search subdirectories
          const subRoutes = await findRouteFiles(filePath);
          routes = routes.concat(subRoutes);
        } else if (file === 'route.js') {
          routes.push(filePath);
          console.log('📄 Found route file:', filePath.replace(__dirname, ''));
        }
      } catch (error) {
        console.warn(`⚠️  Error reading file ${file}:`, error.message);
      }
    }

    return routes;
  } catch (error) {
    console.error('❌ Error scanning directory:', dir, error.message);
    return [];
  }
}

// Convert file path to Hono route pattern
function filePathToRoutePattern(routeFile: string): string {
  // Get relative path from API directory
  const relativePath = routeFile.replace(__dirname, '').replace(/\\/g, '/');
  
  // Remove leading slash and trailing /route.js
  const cleanPath = relativePath.replace(/^\//, '').replace(/\/route\.js$/, '');
  
  // Handle root route
  if (!cleanPath) {
    return '/';
  }
  
  // Convert Next.js dynamic segments to Hono patterns
  const segments = cleanPath.split('/');
  const honoSegments = segments.map(segment => {
    // Handle catch-all routes: [...param] -> :param{.+}
    if (segment.startsWith('[...') && segment.endsWith(']')) {
      const param = segment.slice(4, -1);
      return `:${param}{.+}`;
    }
    // Handle dynamic routes: [param] -> :param
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const param = segment.slice(1, -1);
      return `:${param}`;
    }
    // Static segment
    return segment;
  });
  
  return '/' + honoSegments.join('/');
}

// Register all API routes
async function registerRoutes() {
  console.log('🔄 Registering API routes...');
  
  try {
    const routeFiles = await findRouteFiles(__dirname);
    
    if (routeFiles.length === 0) {
      console.warn('⚠️  No route files found in API directory');
      return;
    }
    
    // Sort routes by specificity (more specific routes first)
    routeFiles.sort((a, b) => {
      const aDepth = a.split('/').length;
      const bDepth = b.split('/').length;
      return bDepth - aDepth;
    });
    
    let registeredCount = 0;
    
    for (const routeFile of routeFiles) {
      try {
        // Convert to file:// URL for proper import resolution
        const fileUrl = `file:///${routeFile.replace(/\\/g, '/')}`;
        const cacheParam = import.meta.env?.DEV ? `?t=${Date.now()}` : '';
        const routeModule = await import(`${fileUrl}${cacheParam}`);
        
        const routePattern = filePathToRoutePattern(routeFile);
        const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
        
        for (const method of httpMethods) {
          if (typeof routeModule[method] === 'function') {
            const handler: Handler = async (c) => {
              try {
                // Extract route parameters
                const params = c.req.param();
                
                // In development, always use fresh import for hot reload
                if (import.meta.env?.DEV) {
                  const freshFileUrl = `file:///${routeFile.replace(/\\/g, '/')}`;
                  const freshModule = await import(`${freshFileUrl}?t=${Date.now()}`);
                  return await freshModule[method](c.req.raw, { params });
                }
                
                // Production: use cached module
                return await routeModule[method](c.req.raw, { params });
              } catch (error) {
                console.error(`❌ Error executing ${method} ${routePattern}:`, error);
                return new Response(JSON.stringify({
                  success: false,
                  error: { message: 'Internal server error' }
                }), {
                  status: 500,
                  headers: { 'Content-Type': 'application/json' }
                });
              }
            };
            
            // Register the route with Hono
            switch (method.toLowerCase()) {
              case 'get':
                api.get(routePattern, handler);
                break;
              case 'post':
                api.post(routePattern, handler);
                break;
              case 'put':
                api.put(routePattern, handler);
                break;
              case 'delete':
                api.delete(routePattern, handler);
                break;
              case 'patch':
                api.patch(routePattern, handler);
                break;
              case 'options':
                api.options(routePattern, handler);
                break;
            }
            
            console.log(`✅ Registered: ${method} ${routePattern}`);
            registeredCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Error importing route file ${routeFile}:`, error);
      }
    }
    
    console.log(`🎉 Route registration complete! Registered ${registeredCount} route handlers`);
    
    // Add catch-all handler AFTER all specific routes are registered
    api.all('*', (c) => {
      const method = c.req.method;
      const path = c.req.path;
      
      console.log(`🔍 Unmatched API route: ${method} ${path}`);
      console.log(`🗂️  Available routes: ${api.routes.length} registered`);
      
      return new Response(JSON.stringify({
        success: false,
        error: { 
          message: `API route not found: ${method} ${path}`,
          registeredRoutes: api.routes.length,
          availableRoutes: 'Check server logs for registered routes'
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
  } catch (error) {
    console.error('❌ Fatal error during route registration:', error);
  }
}

// Initial route registration
await registerRoutes();

// Hot reload in development
if (import.meta.env?.DEV && import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('🔥 Hot reload triggered - re-registering routes...');
    registerRoutes().catch(err => {
      console.error('❌ Error during hot reload:', err);
    });
  });
}

export { api, API_BASENAME };
