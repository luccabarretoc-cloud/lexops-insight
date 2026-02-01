import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async (req) => {
  const token = req.queryStringParameters?.token;

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ valid: false })
    };
  }

  const { data, error } = await supabase
    .from("access_tokens")
    .select("*")
    .eq("token", token)
    .eq("subscription_status", "active")
    .single();

  if (error || !data) {
    return {
      statusCode: 403,
      body: JSON.stringify({ valid: false })
    };
  }

  const now = new Date();
  const expiresAt = new Date(data.expires_at);

  if (expiresAt < now) {
    return {
      statusCode: 403,
      body: JSON.stringify({ valid: false })
    };
  }

  // atualiza último acesso
  await supabase
    .from("access_tokens")
    .update({ last_access: new Date().toISOString() })
    .eq("id", data.id);

  return {
    statusCode: 200,
    body: JSON.stringify({ valid: true })
  };
};
