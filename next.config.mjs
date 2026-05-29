/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.2'],
  // Exclude auth routes from prerendering
  trailingSlash: false,
  // Ensure dynamic routes are handled properly
  generateEtags: false,
  // Skip static generation for auth routes
  output: 'standalone',
  // Handle dynamic routes properly
  skipTrailingSlashRedirect: true,
  // Force dynamic rendering for auth routes
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: '/auth/:path*'
      }
    ];
  }
};

export default nextConfig;
