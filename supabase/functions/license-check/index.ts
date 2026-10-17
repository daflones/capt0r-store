// POST /license-check
//   { action:'check',    product_slug?, hwid? }  -> injector login/validate
//   { action:'download', product_slug? }        -> signed URL for the loader zip
// Auth: user JWT. Grants nothing; only reads licenses created by payments.
import { caller, fail, json, service } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  try {
    const me = await caller(req);
    if (!me) return fail("Login invalido.", 401);

    const body = await req.json().catch(() => ({}));
    const c = service();
    const now = new Date();

    // Load licenses joined with products
    const { data: lics, error: licenseError } = await c
      .from("licenses")
      .select(
        "id, status, expires_at, activated_at, hwid, product_id, variant_label, products(slug, name, dll_path, pkg_path)",
      )
      .eq("user_id", me.userId);

    if (licenseError) throw licenseError;
    const list = (lics || []).map((l: any) => {
      const expired = l.expires_at && new Date(l.expires_at) <= now;
      return {
        license_id: l.id,
        product: l.products?.name || "",
        slug: l.products?.slug || "",
        dll_path: l.products?.dll_path || "",
        pkg_path: l.products?.pkg_path || l.products?.dll_path || "",
        status:
          l.status === "revoked" ? "revoked" : expired ? "expired" : l.status,
        expires_at: l.expires_at,
        activated_at: l.activated_at,
        variant_label: l.variant_label || "",
      };
    });

    if (body.action === "check") {
      const lic = body.product_slug
        ? list.find(
            (l: any) => l.slug === body.product_slug && l.status === "active",
          )
        : list.find((l: any) => l.status === "active");
      if (!lic) return json({ ok: true, licensed: false, licenses: list });

      // Bind HWID on first use + mark activation
      if (body.hwid) {
        const { data: row } = await c
          .from("licenses")
          .select("hwid, activated_at")
          .eq("id", lic.license_id)
          .single();
        if (row?.hwid && row.hwid !== body.hwid)
          return json({
            ok: true,
            licensed: false,
            error: "Licenca vinculada a outro computador.",
            licenses: list,
          });
        if (!row?.hwid || !row?.activated_at) {
          await c
            .from("licenses")
            .update({
              hwid: row?.hwid || body.hwid,
              activated_at: row?.activated_at || now.toISOString(),
            })
            .eq("id", lic.license_id);
        }
      }

      // Signed download URL for this product's package
      let url = null;
      try {
        const { data } = await c.storage
          .from("downloads")
          .createSignedUrl(lic.dll_path, 300);
        url = data?.signedUrl || null;
      } catch {}
      return json({
        ok: true,
        licensed: true,
        license: lic,
        download_url: url,
        licenses: list,
      });
    }

    if (body.action === "download") {
      const lic = body.product_slug
        ? list.find(
            (l: any) => l.slug === body.product_slug && l.status === "active",
          )
        : list.find((l: any) => l.status === "active");
      if (!lic)
        return fail("Voce nao tem licenca ativa para este produto.", 403);
      const { data, error } = await c.storage
        .from("downloads")
        .createSignedUrl(lic.pkg_path, 300);
      if (error || !data?.signedUrl) return fail("Arquivo indisponivel.", 404);
      return json({
        ok: true,
        download_url: data.signedUrl,
        product: lic.product,
      });
    }

    return fail("Acao desconhecida.");
  } catch (e) {
    return fail((e as Error).message, 500);
  }
});
