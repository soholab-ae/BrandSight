import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import prisma from "../db.server";
import type { Prisma } from "@prisma/client";

const PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          vendor
          productType
          status
          createdAt
          updatedAt
          variants(first: 1) {
            edges {
              node {
                id
                price
                compareAtPrice
                inventoryQuantity
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const ORDERS_QUERY = `
  query getOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      edges {
        node {
          id
          name
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
            }
          }
          totalTaxSet {
            shopMoney {
              amount
            }
          }
          financialStatus
          fulfillmentStatus
          customer {
            id
            email
          }
          customerJourneySummary {
            firstVisit {
              landingPage
              referrerUrl
            }
          }
          processedAt
          createdAt
          lineItems(first: 100) {
            edges {
              node {
                id
                title
                vendor
                quantity
                originalUnitPriceSet {
                  shopMoney {
                    amount
                  }
                }
                totalDiscountSet {
                  shopMoney {
                    amount
                  }
                }
                product {
                  id
                }
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export interface SyncResult {
  success: boolean;
  productsImported?: number;
  ordersImported?: number;
  vendorsCreated?: number;
  error?: string;
}

function extractShopifyId(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getOrCreateVendor(
  storeId: string,
  vendorName: string
): Promise<string> {
  if (!vendorName || vendorName.trim() === "") {
    vendorName = "Unknown";
  }

  const slug = slugify(vendorName);

  let vendor = await prisma.vendor.findFirst({
    where: {
      storeId,
      slug,
    },
  });

  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        storeId,
        name: vendorName,
        slug,
      },
    });
  }

  return vendor.id;
}

export async function syncProducts(
  admin: AdminApiContext,
  storeId: string,
  batchSize: number = 50
): Promise<SyncResult> {
  try {
    let hasNextPage = true;
    let after: string | null = null;
    let productsImported = 0;
    const vendorsSet = new Set<string>();

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return { success: false, error: "Store not found" };
    }

    after = store.productSyncCursor;

    while (hasNextPage) {
      const response = await admin.graphql(PRODUCTS_QUERY, {
        variables: {
          first: batchSize,
          after,
        },
      });

      const json = await response.json();
      const products = json.data?.products;

      if (!products) {
        break;
      }

      for (const edge of products.edges) {
        const product = edge.node;
        const productId = extractShopifyId(product.id);
        const vendor = product.vendor || "Unknown";

        const vendorId = await getOrCreateVendor(storeId, vendor);
        vendorsSet.add(vendorId);

        const variant = product.variants.edges[0]?.node;
        const price = variant?.price
          ? parseFloat(variant.price)
          : null;
        const compareAtPrice = variant?.compareAtPrice
          ? parseFloat(variant.compareAtPrice)
          : null;

        await prisma.product.upsert({
          where: { id: productId },
          update: {
            title: product.title,
            handle: product.handle,
            vendor,
            vendorId,
            productType: product.productType,
            price: price ? new Prisma.Decimal(price) : null,
            compareAtPrice: compareAtPrice ? new Prisma.Decimal(compareAtPrice) : null,
            status: product.status,
            updatedAt: new Date(product.updatedAt),
          },
          create: {
            id: productId,
            storeId,
            vendorId,
            title: product.title,
            handle: product.handle,
            vendor,
            productType: product.productType,
            price: price ? new Prisma.Decimal(price) : null,
            compareAtPrice: compareAtPrice ? new Prisma.Decimal(compareAtPrice) : null,
            status: product.status,
            createdAt: new Date(product.createdAt),
            updatedAt: new Date(product.updatedAt),
          },
        });

        if (variant) {
          await prisma.inventory.upsert({
            where: { productId },
            update: {
              quantity: variant.inventoryQuantity || 0,
              availableQuantity: variant.inventoryQuantity || 0,
              syncedAt: new Date(),
            },
            create: {
              productId,
              storeId,
              vendorId,
              quantity: variant.inventoryQuantity || 0,
              availableQuantity: variant.inventoryQuantity || 0,
              syncedAt: new Date(),
            },
          });
        }

        productsImported++;
      }

      hasNextPage = products.pageInfo.hasNextPage;
      after = products.pageInfo.endCursor;

      await prisma.store.update({
        where: { id: storeId },
        data: {
          productSyncCursor: after,
          lastProductSyncAt: new Date(),
        },
      });
    }

    await prisma.store.update({
      where: { id: storeId },
      data: {
        lastSyncAt: new Date(),
      },
    });

    return {
      success: true,
      productsImported,
      vendorsCreated: vendorsSet.size,
    };
  } catch (error) {
    console.error("Product sync error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function syncOrders(
  admin: AdminApiContext,
  storeId: string,
  batchSize: number = 50
): Promise<SyncResult> {
  try {
    let hasNextPage = true;
    let after: string | null = null;
    let ordersImported = 0;

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return { success: false, error: "Store not found" };
    }

    after = store.orderSyncCursor;

    while (hasNextPage) {
      const response = await admin.graphql(ORDERS_QUERY, {
        variables: {
          first: batchSize,
          after,
        },
      });

      const json = await response.json();
      const orders = json.data?.orders;

      if (!orders) {
        break;
      }

      for (const edge of orders.edges) {
        const order = edge.node;
        const orderId = extractShopifyId(order.id);

        const totalPrice = order.totalPriceSet?.shopMoney?.amount
          ? parseFloat(order.totalPriceSet.shopMoney.amount)
          : null;
        const subtotalPrice = order.subtotalPriceSet?.shopMoney?.amount
          ? parseFloat(order.subtotalPriceSet.shopMoney.amount)
          : null;
        const totalTax = order.totalTaxSet?.shopMoney?.amount
          ? parseFloat(order.totalTaxSet.shopMoney.amount)
          : null;

        await prisma.order.upsert({
          where: { id: orderId },
          update: {
            orderNumber: order.name,
            totalPrice: totalPrice ? new Prisma.Decimal(totalPrice) : null,
            subtotalPrice: subtotalPrice ? new Prisma.Decimal(subtotalPrice) : null,
            totalTax: totalTax ? new Prisma.Decimal(totalTax) : null,
            currency: order.totalPriceSet?.shopMoney?.currencyCode,
            financialStatus: order.financialStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            customerEmail: order.customer?.email,
            customerId: order.customer?.id ? extractShopifyId(order.customer.id) : null,
            landingPage: order.customerJourneySummary?.firstVisit?.landingPage,
            referringSite: order.customerJourneySummary?.firstVisit?.referrerUrl,
            processedAt: order.processedAt ? new Date(order.processedAt) : null,
          },
          create: {
            id: orderId,
            storeId,
            orderNumber: order.name,
            totalPrice: totalPrice ? new Prisma.Decimal(totalPrice) : null,
            subtotalPrice: subtotalPrice ? new Prisma.Decimal(subtotalPrice) : null,
            totalTax: totalTax ? new Prisma.Decimal(totalTax) : null,
            currency: order.totalPriceSet?.shopMoney?.currencyCode,
            financialStatus: order.financialStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            customerEmail: order.customer?.email,
            customerId: order.customer?.id ? extractShopifyId(order.customer.id) : null,
            landingPage: order.customerJourneySummary?.firstVisit?.landingPage,
            referringSite: order.customerJourneySummary?.firstVisit?.referrerUrl,
            processedAt: order.processedAt ? new Date(order.processedAt) : null,
            createdAt: new Date(order.createdAt),
          },
        });

        for (const lineItemEdge of order.lineItems.edges) {
          const lineItem = lineItemEdge.node;
          const lineItemId = extractShopifyId(lineItem.id);
          const productId = lineItem.product?.id
            ? extractShopifyId(lineItem.product.id)
            : null;

          let vendorId: string | null = null;
          if (lineItem.vendor) {
            vendorId = await getOrCreateVendor(storeId, lineItem.vendor);
          }

          const price = lineItem.originalUnitPriceSet?.shopMoney?.amount
            ? parseFloat(lineItem.originalUnitPriceSet.shopMoney.amount)
            : null;
          const totalDiscount = lineItem.totalDiscountSet?.shopMoney?.amount
            ? parseFloat(lineItem.totalDiscountSet.shopMoney.amount)
            : null;

          await prisma.orderLineItem.upsert({
            where: { id: lineItemId },
            update: {
              title: lineItem.title,
              vendor: lineItem.vendor,
              vendorId,
              quantity: lineItem.quantity,
              price: price ? new Prisma.Decimal(price) : null,
              totalDiscount: totalDiscount ? new Prisma.Decimal(totalDiscount) : null,
            },
            create: {
              id: lineItemId,
              orderId,
              productId,
              vendorId,
              title: lineItem.title,
              vendor: lineItem.vendor,
              quantity: lineItem.quantity,
              price: price ? new Prisma.Decimal(price) : null,
              totalDiscount: totalDiscount ? new Prisma.Decimal(totalDiscount) : null,
            },
          });
        }

        ordersImported++;
      }

      hasNextPage = orders.pageInfo.hasNextPage;
      after = orders.pageInfo.endCursor;

      await prisma.store.update({
        where: { id: storeId },
        data: {
          orderSyncCursor: after,
          lastOrderSyncAt: new Date(),
        },
      });
    }

    await prisma.store.update({
      where: { id: storeId },
      data: {
        lastSyncAt: new Date(),
      },
    });

    return {
      success: true,
      ordersImported,
    };
  } catch (error) {
    console.error("Order sync error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fullSync(
  admin: AdminApiContext,
  storeId: string
): Promise<SyncResult> {
  const productResult = await syncProducts(admin, storeId);
  if (!productResult.success) {
    return productResult;
  }

  const orderResult = await syncOrders(admin, storeId);
  if (!orderResult.success) {
    return orderResult;
  }

  return {
    success: true,
    productsImported: productResult.productsImported,
    ordersImported: orderResult.ordersImported,
    vendorsCreated: productResult.vendorsCreated,
  };
}
