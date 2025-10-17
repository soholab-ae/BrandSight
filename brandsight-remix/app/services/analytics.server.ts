import prisma from "../db.server";
import type { Prisma } from "@prisma/client";

export interface VendorMetrics {
  vendorId: string;
  vendorName: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  products: number;
  topProduct?: {
    id: string;
    title: string;
    revenue: number;
  };
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export async function calculateVendorMetrics(
  storeId: string,
  dateRange?: DateRange
): Promise<VendorMetrics[]> {
  const whereClause: Prisma.OrderWhereInput = {
    storeId,
    financialStatus: { in: ["paid", "PAID", "Paid"] },
  };

  if (dateRange) {
    whereClause.processedAt = {
      gte: dateRange.startDate,
      lte: dateRange.endDate,
    };
  }

  const vendors = await prisma.vendor.findMany({
    where: { storeId },
    include: {
      orderLineItems: {
        where: {
          order: whereClause,
        },
        include: {
          order: true,
          product: true,
        },
      },
      products: {
        where: {
          status: "ACTIVE",
        },
      },
    },
  });

  const metrics: VendorMetrics[] = [];

  for (const vendor of vendors) {
    const orderIds = new Set<string>();
    let totalRevenue = 0;
    const productRevenue = new Map<string, { title: string; revenue: number }>();

    for (const lineItem of vendor.orderLineItems) {
      orderIds.add(lineItem.orderId);
      
      const itemRevenue =
        lineItem.price && lineItem.quantity
          ? Number(lineItem.price) * lineItem.quantity
          : 0;
      
      totalRevenue += itemRevenue;

      if (lineItem.productId && lineItem.product) {
        const current = productRevenue.get(lineItem.productId) || {
          title: lineItem.product.title,
          revenue: 0,
        };
        current.revenue += itemRevenue;
        productRevenue.set(lineItem.productId, current);
      }
    }

    const topProductEntry = Array.from(productRevenue.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)[0];

    const topProduct = topProductEntry
      ? {
          id: topProductEntry[0],
          title: topProductEntry[1].title,
          revenue: topProductEntry[1].revenue,
        }
      : undefined;

    metrics.push({
      vendorId: vendor.id,
      vendorName: vendor.name,
      revenue: totalRevenue,
      orders: orderIds.size,
      avgOrderValue: orderIds.size > 0 ? totalRevenue / orderIds.size : 0,
      products: vendor.products.length,
      topProduct,
    });
  }

  return metrics.sort((a, b) => b.revenue - a.revenue);
}

export async function calculateCustomerBrandLoyalty(
  storeId: string
): Promise<void> {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      financialStatus: { in: ["paid", "PAID", "Paid"] },
    },
    include: {
      lineItems: {
        include: {
          vendorRel: true,
        },
      },
    },
    orderBy: {
      processedAt: "asc",
    },
  });

  const customerVendorData = new Map<
    string,
    Map<
      string,
      {
        orders: number;
        totalSpent: number;
        firstPurchase: Date | null;
        lastPurchase: Date | null;
      }
    >
  >();

  for (const order of orders) {
    if (!order.customerId) continue;

    if (!customerVendorData.has(order.customerId)) {
      customerVendorData.set(order.customerId, new Map());
    }

    const customerData = customerVendorData.get(order.customerId)!;

    for (const lineItem of order.lineItems) {
      if (!lineItem.vendorId) continue;

      if (!customerData.has(lineItem.vendorId)) {
        customerData.set(lineItem.vendorId, {
          orders: 0,
          totalSpent: 0,
          firstPurchase: null,
          lastPurchase: null,
        });
      }

      const vendorData = customerData.get(lineItem.vendorId)!;
      
      const itemTotal =
        lineItem.price && lineItem.quantity
          ? Number(lineItem.price) * lineItem.quantity
          : 0;

      vendorData.totalSpent += itemTotal;
      vendorData.orders += 1;

      if (order.processedAt) {
        if (!vendorData.firstPurchase) {
          vendorData.firstPurchase = order.processedAt;
        }
        vendorData.lastPurchase = order.processedAt;
      }
    }
  }

  for (const [customerId, vendors] of customerVendorData) {
    for (const [vendorId, data] of vendors) {
      const affinityScore = Math.min(100, data.orders * 10 + (data.totalSpent / 100));

      await prisma.customerBrandAffinity.upsert({
        where: {
          customer_brand_affinity_unique_composite: {
            storeId,
            customerId,
            vendorId,
          },
        },
        update: {
          affinityScore: new Prisma.Decimal(affinityScore),
          totalOrders: data.orders,
          totalSpent: new Prisma.Decimal(data.totalSpent),
          firstPurchase: data.firstPurchase,
          lastPurchase: data.lastPurchase,
          updatedAt: new Date(),
        },
        create: {
          storeId,
          customerId,
          vendorId,
          affinityScore: new Prisma.Decimal(affinityScore),
          totalOrders: data.orders,
          totalSpent: new Prisma.Decimal(data.totalSpent),
          firstPurchase: data.firstPurchase,
          lastPurchase: data.lastPurchase,
        },
      });
    }
  }
}

export interface ProductPerformance {
  productId: string;
  productTitle: string;
  vendor: string;
  revenue: number;
  unitsSold: number;
  ordersCount: number;
  avgPrice: number;
}

export async function calculateProductPerformance(
  storeId: string,
  vendorId?: string,
  dateRange?: DateRange
): Promise<ProductPerformance[]> {
  const whereClause: Prisma.OrderLineItemWhereInput = {
    order: {
      storeId,
      financialStatus: { in: ["paid", "PAID", "Paid"] },
    },
  };

  if (vendorId) {
    whereClause.vendorId = vendorId;
  }

  if (dateRange) {
    whereClause.order = {
      ...whereClause.order,
      processedAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };
  }

  const lineItems = await prisma.orderLineItem.findMany({
    where: whereClause,
    include: {
      product: true,
      order: true,
    },
  });

  const productMap = new Map<
    string,
    {
      title: string;
      vendor: string;
      revenue: number;
      units: number;
      orders: Set<string>;
      prices: number[];
    }
  >();

  for (const item of lineItems) {
    if (!item.productId || !item.product) continue;

    if (!productMap.has(item.productId)) {
      productMap.set(item.productId, {
        title: item.product.title,
        vendor: item.vendor || "Unknown",
        revenue: 0,
        units: 0,
        orders: new Set(),
        prices: [],
      });
    }

    const data = productMap.get(item.productId)!;
    
    const itemRevenue =
      item.price && item.quantity
        ? Number(item.price) * item.quantity
        : 0;

    data.revenue += itemRevenue;
    data.units += item.quantity || 0;
    data.orders.add(item.orderId);
    
    if (item.price) {
      data.prices.push(Number(item.price));
    }
  }

  const performance: ProductPerformance[] = [];

  for (const [productId, data] of productMap) {
    const avgPrice =
      data.prices.length > 0
        ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length
        : 0;

    performance.push({
      productId,
      productTitle: data.title,
      vendor: data.vendor,
      revenue: data.revenue,
      unitsSold: data.units,
      ordersCount: data.orders.size,
      avgPrice,
    });
  }

  return performance.sort((a, b) => b.revenue - a.revenue);
}
