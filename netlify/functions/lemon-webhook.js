import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event) {
  try {
    const payload = JSON.parse(event.body);
    const attrs = payload.data.attributes;

    const email = attrs.user_email;
    const status = attrs.status;
    const plan = attrs.variant_name;

    const token = crypto.randomBytes(32).toString("hex");

    if (status === "active") {
      await supabase.from("access_tokens").insert({
        email,
        token,
        plan,
        status: "active",
        expires_at: null
      });
    }

    if (status === "cancelled" || status === "expired") {
      await supabase
        .from("access_tokens")
        .update({ status })
        .eq("email", email);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
