'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const revalidate = 0;

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPKCEError, setIsPKCEError] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const type = searchParams.get('type'); // 'signup' for email verification, 'recovery' for password reset

      if (error) {
        setError(errorDescription || error);
        setLoading(false);
        return;
      }

      if (!code) {
        setError('No authorization code provided.');
        setLoading(false);
        return;
      }

      try {
        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          // Check if it's a PKCE error
          if (exchangeError.message?.includes('PKCE code verifier not found')) {
            setIsPKCEError(true);
            setError('The verification link was opened in a different browser context. This can happen in incognito mode or when switching between browsers.');
          } else {
            throw exchangeError;
          }
          setLoading(false);
          return;
        }

        if (data.session) {
          // Check if this is a first-time user or password reset
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_first_login, is_email_verified, email')
            .eq('id', data.session.user.id)
            .single();

          // If this is email verification and email is not yet set, update it
          if (type === 'signup' && profile && !profile.email) {
            const email = data.session.user.email;
            if (email) {
              await supabase
                .from('profiles')
                .update({ 
                  email,
                  is_email_verified: true 
                })
                .eq('id', data.session.user.id);
            }
          }

          if (profile?.is_first_login) {
            router.push('/set-password');
          } else {
            router.push('/feed');
          }
        } else {
          throw new Error('No session created');
        }
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        
        // Check for PKCE related errors
        if (errorMessage.includes('PKCE') || errorMessage.includes('code verifier')) {
          setIsPKCEError(true);
          setError('The verification link was opened in a different browser context. This can happen in incognito mode or when switching between browsers.');
        } else {
          setError(errorMessage);
        }
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [searchParams, router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-[#141414] border border-gray-800 rounded-2xl p-6 sm:p-7 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366f1] mx-auto mb-4"></div>
          <h2 className="text-white text-lg font-medium mb-2">Completing authentication...</h2>
          <p className="text-gray-400 text-sm">Please wait while we verify your credentials.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-[#141414] border border-gray-800 rounded-2xl p-6 sm:p-7 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-white text-lg font-medium mb-2">
            {isPKCEError ? 'Browser Context Issue' : 'Authentication Failed'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          
          {isPKCEError && (
            <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-4 mb-6 text-left">
              <h3 className="text-yellow-400 text-sm font-medium mb-2">💡 Solution:</h3>
              <ul className="text-yellow-300 text-xs space-y-1">
                <li>• Open the verification link in the same browser/tab where you started</li>
                <li>• If using incognito mode, complete the entire process in that window</li>
                <li>• Copy the verification link and paste it in the correct browser</li>
                <li>• Try the verification process again from the beginning</li>
              </ul>
            </div>
          )}
          
          <div className="space-y-2">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Back to Login
            </button>
            {!isPKCEError && (
              <button
                onClick={() => router.push('/forgot-password')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Forgot Password?
              </button>
            )}
            {isPKCEError && (
              <button
                onClick={() => window.close()}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              >
                Close This Window
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#141414] border border-gray-800 rounded-2xl p-6 sm:p-7 text-center">
        <div className="text-green-500 text-4xl mb-4">✅</div>
        <h2 className="text-white text-lg font-medium mb-2">Authentication Successful</h2>
        <p className="text-gray-400 text-sm">Redirecting you to your dashboard...</p>
      </div>
    </div>
  );
}
