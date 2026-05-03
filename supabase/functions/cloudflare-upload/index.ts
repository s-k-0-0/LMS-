import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, tus-resumable, upload-length, upload-metadata',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    const CF_ACCOUNT_ID = Deno.env.get('CF_ACCOUNT_ID');
    const CF_STREAM_TOKEN = Deno.env.get('CF_STREAM_TOKEN');

    if (!CF_ACCOUNT_ID || !CF_STREAM_TOKEN) {
      throw new Error('Missing Cloudflare configuration in Edge Function environment variables');
    }

    const { uploadLength, uploadMetadata } = await req.json();

    if (!uploadLength) {
      throw new Error('Missing uploadLength');
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_STREAM_TOKEN}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': uploadLength.toString(),
          'Upload-Metadata': uploadMetadata || '',
        },
      }
    );

    const uploadUrl = response.headers.get('Location');

    if (!uploadUrl || !response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({ error: `Cloudflare API error: ${response.statusText}`, details: text }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ uploadUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
