import { service } from "./common.ts";
// Caller must verify payment with the provider before invoking this service-only RPC.
export async function grantLicense(
  orderId: string,
  deliveryId?: string,
  eventType?: string,
) {
  const { data, error } = await service().rpc("complete_store_order", {
    p_order_id: orderId,
    p_delivery_id: deliveryId || null,
    p_event_type: eventType || null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
