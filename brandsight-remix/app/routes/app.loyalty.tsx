import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const store = await prisma.store.findFirst({
    where: { domain: session.shop },
  });

  if (!store) {
    return json({
      loyaltyData: [],
      store: null,
    });
  }

  const loyaltyData = await prisma.customerBrandAffinity.findMany({
    where: { storeId: store.id },
    include: {
      vendor: true,
    },
    orderBy: {
      affinityScore: "desc",
    },
    take: 100,
  });

  const topCustomers = await prisma.$queryRaw<
    Array<{
      customerId: string;
      totalBrands: bigint;
      totalSpent: number;
      totalOrders: bigint;
    }>
  >`
    SELECT 
      customer_id as "customerId",
      COUNT(DISTINCT vendor_id) as "totalBrands",
      SUM(total_spent) as "totalSpent",
      SUM(total_orders) as "totalOrders"
    FROM customer_brand_affinity
    WHERE store_id = ${store.id}
    GROUP BY customer_id
    ORDER BY SUM(total_spent) DESC
    LIMIT 50
  `;

  return json({
    loyaltyData: loyaltyData.map((l) => ({
      id: l.id,
      customerId: l.customerId.substring(0, 10) + "...",
      vendorName: l.vendor.name,
      affinityScore: Number(l.affinityScore),
      totalOrders: l.totalOrders,
      totalSpent: Number(l.totalSpent),
      firstPurchase: l.firstPurchase?.toISOString(),
      lastPurchase: l.lastPurchase?.toISOString(),
    })),
    topCustomers: topCustomers.map((c) => ({
      customerId: c.customerId.substring(0, 10) + "...",
      totalBrands: Number(c.totalBrands),
      totalSpent: Number(c.totalSpent),
      totalOrders: Number(c.totalOrders),
    })),
    store: {
      id: store.id,
      name: store.name,
    },
  });
};

export default function LoyaltyPage() {
  const { loyaltyData, topCustomers, store } =
    useLoaderData<typeof loader>();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAffinityLevel = (score: number): { tone: "success" | "attention" | "info"; label: string } => {
    if (score >= 80) return { tone: "success", label: "High" };
    if (score >= 50) return { tone: "attention", label: "Medium" };
    return { tone: "info", label: "Low" };
  };

  const loyaltyRowMarkup = loyaltyData.map((item, index) => {
    const affinityLevel = getAffinityLevel(item.affinityScore);
    
    return (
      <IndexTable.Row id={item.id} key={item.id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span" fontWeight="medium">
            {item.customerId}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {item.vendorName}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center">
              <div style={{ width: "60px" }}>
                <Text variant="bodySm" as="span">
                  {Math.round(item.affinityScore)}%
                </Text>
              </div>
              <Badge tone={affinityLevel.tone}>{affinityLevel.label}</Badge>
            </InlineStack>
            <div style={{ width: "150px" }}>
              <ProgressBar
                progress={item.affinityScore}
                size="small"
                tone={affinityLevel.tone}
              />
            </div>
          </BlockStack>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {formatNumber(item.totalOrders)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {formatCurrency(item.totalSpent)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <BlockStack gap="100">
            <Text variant="bodySm" as="span">
              First: {formatDate(item.firstPurchase)}
            </Text>
            <Text variant="bodySm" as="span">
              Last: {formatDate(item.lastPurchase)}
            </Text>
          </BlockStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  const customerRowMarkup = topCustomers.map((customer, index) => (
    <IndexTable.Row
      id={customer.customerId}
      key={customer.customerId}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span" fontWeight="medium">
          {customer.customerId}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatNumber(customer.totalBrands)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatCurrency(customer.totalSpent)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatNumber(customer.totalOrders)}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page title="Customer Brand Loyalty">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">
              Top Multi-Brand Customers
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              Customers who purchase from multiple vendors, sorted by total spend
            </Text>
          </BlockStack>
        </Card>

        {topCustomers.length > 0 && (
          <Card padding="0">
            <IndexTable
              resourceName={{
                singular: "customer",
                plural: "customers",
              }}
              itemCount={topCustomers.length}
              headings={[
                { title: "Customer ID" },
                { title: "Brands Purchased" },
                { title: "Total Spent" },
                { title: "Total Orders" },
              ]}
              selectable={false}
            >
              {customerRowMarkup}
            </IndexTable>
          </Card>
        )}

        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">
              Brand Affinity Details
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              Customer loyalty scores for specific brands
            </Text>
          </BlockStack>
        </Card>

        {loyaltyData.length > 0 && (
          <Card padding="0">
            <IndexTable
              resourceName={{
                singular: "loyalty record",
                plural: "loyalty records",
              }}
              itemCount={loyaltyData.length}
              headings={[
                { title: "Customer ID" },
                { title: "Brand" },
                { title: "Affinity Score" },
                { title: "Orders" },
                { title: "Total Spent" },
                { title: "Purchase Timeline" },
              ]}
              selectable={false}
            >
              {loyaltyRowMarkup}
            </IndexTable>
          </Card>
        )}

        {loyaltyData.length === 0 && topCustomers.length === 0 && (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                No loyalty data yet
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Customer loyalty data is calculated after syncing orders. Make
                sure you have orders with customer information to see brand
                affinity insights.
              </Text>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
