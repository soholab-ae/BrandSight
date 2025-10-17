import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { syncProducts, syncOrders } from "../services/shopify-sync.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);

    const store = await prisma.store.findFirst({
      where: { domain: session.shop },
    });

    if (!store) {
      const newStore = await prisma.store.create({
        data: {
          userId: session.shop,
          name: session.shop,
          domain: session.shop,
          accessToken: session.accessToken,
        },
      });

      const productsResult = await syncProducts(admin, newStore.id);
      if (!productsResult.success) {
        return json(
          {
            success: false,
            error: productsResult.error || "Failed to sync products",
          },
          { status: 500 }
        );
      }

      const ordersResult = await syncOrders(admin, newStore.id);
      if (!ordersResult.success) {
        return json(
          {
            success: false,
            error: ordersResult.error || "Failed to sync orders",
          },
          { status: 500 }
        );
      }

      return json({
        success: true,
        productsImported: productsResult.productsImported || 0,
        ordersImported: ordersResult.ordersImported || 0,
        vendorsCreated: productsResult.vendorsCreated || 0,
      });
    }

    const productsResult = await syncProducts(admin, store.id);
    if (!productsResult.success) {
      return json(
        {
          success: false,
          error: productsResult.error || "Failed to sync products",
        },
        { status: 500 }
      );
    }

    const ordersResult = await syncOrders(admin, store.id);
    if (!ordersResult.success) {
      return json(
        {
          success: false,
          error: ordersResult.error || "Failed to sync orders",
        },
        { status: 500 }
      );
    }

    return json({
      success: true,
      productsImported: productsResult.productsImported || 0,
      ordersImported: ordersResult.ordersImported || 0,
      vendorsCreated: productsResult.vendorsCreated || 0,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};
