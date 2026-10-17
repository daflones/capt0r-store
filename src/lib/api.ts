import { supabase } from "./supabase";
export async function callFunction(name: string, body: unknown) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Entre na sua conta para continuar.");
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    },
  );
  const data = await res.json();
  if (!res.ok || !data.ok)
    throw new Error(
      data.error || "Não foi possível concluir. Tente novamente.",
    );
  return data;
}
export async function fetchCatalog() {
  const result = await supabase
    .from("products")
    .select("*, product_variants!product_variants_product_id_fkey(*)")
    .eq("active", true)
    .order("sort_order");
  if (result.error)
    throw new Error(
      "Catálogo indisponível. Verifique a conexão e a instalação da atualização da loja.",
    );
  return result.data;
}
