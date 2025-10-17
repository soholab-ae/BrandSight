import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(
    request,
  );

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }
      break;
    case "PRODUCTS_CREATE":
    case "PRODUCTS_UPDATE":
      console.log("Product webhook:", payload);
      break;
    case "ORDERS_CREATE":
    case "ORDERS_UPDATED":
      console.log("Order webhook:", payload);
      break;
    case "CUSTOMERS_CREATE":
      console.log("Customer webhook:", payload);
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
      console.log("GDPR webhook:", topic);
      break;
  }

  return new Response();
};