/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.2', 'localhost', '127.0.0.1'],
  // Exclude auth routes from prerendering
  trailingSlash: false,
  // Ensure dynamic routes are handled properly
  generateEtags: false,
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
