// Demo data for easy-access preview
import type { 
  Store, 
  Vendor, 
  Product, 
  Order,
  OrderLineItem,
  VendorAnalytics 
} from "@shared/schema";

// Demo store
export const demoStore: Store = {
  id: "demo_store_1",
  userId: "demo_user",
  name: "Demo Store",
  domain: "demo-store.myshopify.com",
  accessToken: "demo_token",
  isActive: true,
  lastSyncAt: new Date(),
  createdAt: new Date('2024-01-01')
};

// Demo vendors with realistic brand names
export const demoVendors: Vendor[] = [
  {
    id: "vendor_1",
    storeId: "demo_store_1",
    name: "Nike",
    slug: "nike",
    createdAt: new Date('2024-01-01')
  },
  {
    id: "vendor_2",
    storeId: "demo_store_1",
    name: "Adidas",
    slug: "adidas",
    createdAt: new Date('2024-01-01')
  },
  {
    id: "vendor_3",
    storeId: "demo_store_1",
    name: "Under Armour",
    slug: "under-armour",
    createdAt: new Date('2024-01-01')
  },
  {
    id: "vendor_4",
    storeId: "demo_store_1",
    name: "Puma",
    slug: "puma",
    createdAt: new Date('2024-01-01')
  },
  {
    id: "vendor_5",
    storeId: "demo_store_1",
    name: "New Balance",
    slug: "new-balance",
    createdAt: new Date('2024-01-01')
  }
];

// Demo products with vendor references
export const demoProducts: Product[] = [
  // Nike products
  {
    id: "prod_nike_1",
    storeId: "demo_store_1",
    vendorId: "vendor_1",
    title: "Nike Air Max 270",
    handle: "nike-air-max-270",
    vendor: "Nike",
    productType: "Sneakers",
    price: "119.99",
    compareAtPrice: "149.99",
    status: "active",
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-01')
  },
  {
    id: "prod_nike_2",
    storeId: "demo_store_1",
    vendorId: "vendor_1",
    title: "Nike Dri-FIT Training Shirt",
    handle: "nike-dri-fit-training-shirt",
    vendor: "Nike",
    productType: "Apparel",
    price: "34.99",
    compareAtPrice: "44.99",
    status: "active",
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-01')
  },
  {
    id: "prod_nike_3",
    storeId: "demo_store_1",
    vendorId: "vendor_1",
    title: "Nike Pro Leggings",
    handle: "nike-pro-leggings",
    vendor: "Nike",
    productType: "Apparel",
    price: "54.99",
    compareAtPrice: null,
    status: "active",
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-01')
  },
  // Adidas products
  {
    id: "prod_adidas_1",
    storeId: "demo_store_1",
    vendorId: "vendor_2",
    title: "Adidas Ultraboost 22",
    handle: "adidas-ultraboost-22",
    vendor: "Adidas",
    productType: "Sneakers",
    price: "179.99",
    compareAtPrice: "189.99",
    status: "active",
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-12-01')
  },
  {
    id: "prod_adidas_2",
    storeId: "demo_store_1",
    vendorId: "vendor_2",
    title: "Adidas 3-Stripes Track Jacket",
    handle: "adidas-3-stripes-track-jacket",
    vendor: "Adidas",
    productType: "Apparel",
    price: "69.99",
    compareAtPrice: "89.99",
    status: "active",
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-12-01')
  },
  // Under Armour products
  {
    id: "prod_ua_1",
    storeId: "demo_store_1",
    vendorId: "vendor_3",
    title: "Under Armour HOVR Phantom",
    handle: "under-armour-hovr-phantom",
    vendor: "Under Armour",
    productType: "Sneakers",
    price: "149.99",
    compareAtPrice: "159.99",
    status: "active",
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-01')
  },
  {
    id: "prod_ua_2",
    storeId: "demo_store_1",
    vendorId: "vendor_3",
    title: "Under Armour HeatGear Compression Shirt",
    handle: "under-armour-heatgear-compression",
    vendor: "Under Armour",
    productType: "Apparel",
    price: "39.99",
    compareAtPrice: null,
    status: "active",
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-12-01')
  },
  // Puma products
  {
    id: "prod_puma_1",
    storeId: "demo_store_1",
    vendorId: "vendor_4",
    title: "Puma RS-X³",
    handle: "puma-rs-x3",
    vendor: "Puma",
    productType: "Sneakers",
    price: "109.99",
    compareAtPrice: "129.99",
    status: "active",
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-12-01')
  },
  // New Balance products
  {
    id: "prod_nb_1",
    storeId: "demo_store_1",
    vendorId: "vendor_5",
    title: "New Balance 990v5",
    handle: "new-balance-990v5",
    vendor: "New Balance",
    productType: "Sneakers",
    price: "174.99",
    compareAtPrice: "184.99",
    status: "active",
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-12-01')
  },
  {
    id: "prod_nb_2",
    storeId: "demo_store_1",
    vendorId: "vendor_5",
    title: "New Balance Fresh Foam 1080",
    handle: "new-balance-fresh-foam-1080",
    vendor: "New Balance",
    productType: "Sneakers",
    price: "159.99",
    compareAtPrice: null,
    status: "active",
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-12-01')
  }
];

// Generate demo orders with realistic data
function generateDemoOrders(): Order[] {
  const orders: Order[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date();
  
  // Generate orders over the past year
  for (let i = 0; i < 250; i++) {
    const orderDate = new Date(
      startDate.getTime() + 
      Math.random() * (endDate.getTime() - startDate.getTime())
    );
    
    // Random vendor selection weighted by popularity
    const vendorWeights = [
      { vendor: "Nike", weight: 0.35 },
      { vendor: "Adidas", weight: 0.25 },
      { vendor: "Under Armour", weight: 0.20 },
      { vendor: "Puma", weight: 0.12 },
      { vendor: "New Balance", weight: 0.08 }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    let selectedVendor = "Nike";
    
    for (const { vendor, weight } of vendorWeights) {
      cumulative += weight;
      if (random < cumulative) {
        selectedVendor = vendor;
        break;
      }
    }
    
    // Generate order total based on vendor AOV with some variance
    const vendorAOV: Record<string, number> = {
      "Nike": 89.99,
      "Adidas": 75.50,
      "Under Armour": 95.25,
      "Puma": 68.40,
      "New Balance": 82.10
    };
    
    const baseAOV = vendorAOV[selectedVendor];
    const variance = (Math.random() - 0.5) * baseAOV * 0.6; // ±30% variance
    const totalPrice = Math.max(25, baseAOV + variance); // Minimum $25 order
    const subtotalPrice = totalPrice * 0.9; // Assume 10% tax
    const totalTax = totalPrice * 0.1;
    
    orders.push({
      id: `order_${i + 1}`,
      storeId: "demo_store_1",
      orderNumber: `#${1000 + i}`,
      totalPrice: totalPrice.toFixed(2),
      subtotalPrice: subtotalPrice.toFixed(2),
      totalTax: totalTax.toFixed(2),
      currency: "USD",
      financialStatus: "paid",
      fulfillmentStatus: "fulfilled",
      customerEmail: `customer${i + 1}@example.com`,
      customerId: `customer_${i + 1}`,
      landingPage: i % 3 === 0 ? "/products" : i % 3 === 1 ? "/collections" : null,
      referringSite: i % 4 === 0 ? "google.com" : i % 4 === 1 ? "facebook.com" : null,
      processedAt: orderDate,
      createdAt: orderDate
    });
  }
  
  return orders.sort((a, b) => (b.processedAt?.getTime() || 0) - (a.processedAt?.getTime() || 0));
}

export const demoOrders = generateDemoOrders();

// Generate demo order line items
export function getDemoOrderLineItems(orderId: string): OrderLineItem[] {
  const order = demoOrders.find(o => o.id === orderId);
  if (!order) return [];
  
  // Determine vendor from order characteristics
  const orderTotal = parseFloat(order.totalPrice || "0");
  let vendorName = "Nike";
  let vendorId = "vendor_1";
  
  if (orderTotal < 60) {
    vendorName = "Puma";
    vendorId = "vendor_4";
  } else if (orderTotal < 70) {
    vendorName = "Adidas";
    vendorId = "vendor_2";
  } else if (orderTotal < 85) {
    vendorName = "New Balance";
    vendorId = "vendor_5";
  } else if (orderTotal < 100) {
    vendorName = "Nike";
    vendorId = "vendor_1";
  } else {
    vendorName = "Under Armour";
    vendorId = "vendor_3";
  }
  
  const vendorProducts = demoProducts.filter(p => p.vendor === vendorName);
  if (vendorProducts.length === 0) return [];
  
  // Generate 1-3 line items
  const itemCount = Math.min(vendorProducts.length, 1 + Math.floor(Math.random() * 3));
  const lineItems: OrderLineItem[] = [];
  const selectedProducts = [...vendorProducts].sort(() => Math.random() - 0.5).slice(0, itemCount);
  
  let remainingTotal = parseFloat(order.totalPrice || "0");
  
  for (let i = 0; i < selectedProducts.length; i++) {
    const product = selectedProducts[i];
    const isLast = i === selectedProducts.length - 1;
    
    const price = isLast 
      ? remainingTotal 
      : remainingTotal * (0.3 + Math.random() * 0.4); // 30-70% of remaining
    
    const quantity = 1 + Math.floor(Math.random() * 2); // 1-2 items
    const unitPrice = price / quantity;
    
    lineItems.push({
      id: `${orderId}_item_${i + 1}`,
      orderId: orderId,
      productId: product.id,
      vendorId: vendorId,
      title: product.title,
      vendor: product.vendor,
      quantity,
      price: unitPrice.toFixed(2),
      totalDiscount: "0.00"
    });
    
    remainingTotal -= price;
  }
  
  return lineItems;
}

// Generate daily vendor analytics from orders
export function generateVendorAnalytics(): VendorAnalytics[] {
  const analytics: VendorAnalytics[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date();
  
  // For each vendor
  demoVendors.forEach(vendor => {
    // Group orders by day
    const dailyOrders = new Map<string, Order[]>();
    
    demoOrders.forEach(order => {
      const lineItems = getDemoOrderLineItems(order.id);
      const hasVendorItem = lineItems.some(item => item.vendorId === vendor.id);
      
      if (hasVendorItem && order.processedAt) {
        const dateKey = order.processedAt.toISOString().split('T')[0];
        const existing = dailyOrders.get(dateKey) || [];
        existing.push(order);
        dailyOrders.set(dateKey, existing);
      }
    });
    
    // Create analytics for each day with orders
    dailyOrders.forEach((orders, dateStr) => {
      const date = new Date(dateStr);
      let totalRevenue = 0;
      
      orders.forEach(order => {
        const lineItems = getDemoOrderLineItems(order.id);
        lineItems.forEach(item => {
          if (item.vendorId === vendor.id) {
            totalRevenue += parseFloat(item.price || "0") * (item.quantity || 1);
          }
        });
      });
      
      const orderCount = orders.length;
      const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
      
      // Simulate visitor metrics
      const conversionRate = 0.025 + Math.random() * 0.02; // 2.5-4.5%
      const visitors = Math.floor(orderCount / conversionRate);
      const conversions = orderCount;
      
      analytics.push({
        id: `analytics_${vendor.id}_${dateStr}`,
        storeId: vendor.storeId,
        vendorId: vendor.id,
        date: date,
        revenue: totalRevenue.toFixed(2),
        orders: orderCount,
        visitors: visitors,
        conversions: conversions,
        aov: aov.toFixed(2),
        conversionRate: conversionRate.toFixed(4),
        createdAt: new Date()
      });
    });
  });
  
  return analytics.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export const demoVendorAnalytics = generateVendorAnalytics();

// Helper to check if we're in demo mode
export function isDemoMode(userId?: string): boolean {
  return !userId || userId === 'demo_user' || userId.startsWith('demo_') || userId.startsWith('shopify_');
}