import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let event;
  try {
    event = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = event.meta?.event_name;
  const data = event.data;

  if (!eventType || !data) {
    return new Response("Invalid payload", { status: 400 });
  }

  const email = data.attributes?.user_email;
  const status = data.attributes?.status;
  const subscriptionId = data.id;

  if (!email || !status) {
    return new Response("Missing data", { status: 400 });
  }

  // 🔐 gera token único
  const token = crypto.randomUUID() + crypto.randomUUID();

  // 📅 define validade
  let accessExpiresAt = new Date();

  // ajuste conforme seus produtos no Lemon
  const productName = data.attributes?.product_name?.toLowerCase() || "";

  if (productName.includes("anual")) {
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 365);
  } else {
    // mensal (default)
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 30);
  }

  // cancelamento → mantém +30 dias
  if (status === "cancelled") {
    accessExpiresAt = new Date();
    accessExpiresAt.setDate(accessExpiresAt.getDate() + 30);
  }

  const { error } = await supabase
    .from("access_tokens")
    .upsert({
      email,
      token,
      plan: productName.includes("anual") ? "anual" : "mensal",
      status: status === "active" ? "active" : "cancelled",
      expires_at: accessExpiresAt.toISOString(),
      lemon_subscription_id: subscriptionId,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "lemon_subscription_id"
    });

  if (error) {
    console.error(error);
    return new Response("Database error", { status: 500 });
  }

  return new Response("OK", { status: 200 });

  await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "LexOps Insight <acesso@lexopsinsight.com.br>",
    to: [email],
    subject: "Seu acesso ao LexOps Insight",
    html: `
      <p>Seu acesso foi liberado.</p>
      <p>
        <a href="${process.env.APP_URL}?token=${token}">
          👉 Acessar LexOps Insight
        </a>
      </p>
      <p>Este link é pessoal e expira automaticamente conforme sua assinatura.</p>
    `
  })
});
};
