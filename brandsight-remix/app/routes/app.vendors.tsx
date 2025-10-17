import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Button,
  InlineStack,
  Badge,
  BlockStack,
  Banner,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { calculateVendorMetrics } from "../services/analytics.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const store = await prisma.store.findFirst({
    where: { domain: session.shop },
  });

  if (!store) {
    return json({
      metrics: [],
      store: null,
      needsSync: true,
    });
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const metrics = await calculateVendorMetrics(store.id, {
    startDate,
    endDate,
  });

  return json({
    metrics,
    store: {
      id: store.id,
      name: store.name,
      lastSyncAt: store.lastSyncAt?.toISOString(),
    },
    needsSync: !store.lastSyncAt,
  });
};

export default function VendorsPage() {
  const { metrics, store, needsSync } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/app/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error("Sync failed:", result.error);
        alert(`Sync failed: ${result.error}`);
      }
      
      window.location.reload();
    } catch (error) {
      console.error("Sync error:", error);
      alert("Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const rowMarkup = metrics.map((metric, index) => (
    <IndexTable.Row id={metric.vendorId} key={metric.vendorId} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {metric.vendorName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatCurrency(metric.revenue)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatNumber(metric.orders)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatCurrency(metric.avgOrderValue)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatNumber(metric.products)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {metric.topProduct ? (
          <BlockStack gap="100">
            <Text variant="bodySm" as="p">
              {metric.topProduct.title}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              {formatCurrency(metric.topProduct.revenue)}
            </Text>
          </BlockStack>
        ) : (
          <Text variant="bodySm" as="span" tone="subdued">
            No products
          </Text>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Vendor Analytics"
      primaryAction={{
        content: isSyncing ? "Syncing..." : "Sync Data",
        onAction: handleSync,
        loading: isSyncing,
        disabled: isSyncing,
      }}
    >
      <BlockStack gap="500">
        {needsSync && (
          <Banner
            title="Data sync required"
            tone="warning"
            action={{
              content: "Sync now",
              onAction: handleSync,
            }}
          >
            <p>
              Click "Sync Data" to import your products and orders from Shopify
              and see your brand analytics.
            </p>
          </Banner>
        )}

        {store?.lastSyncAt && (
          <Card>
            <InlineStack align="space-between">
              <Text variant="bodyMd" as="p">
                Last synced:{" "}
                {new Date(store.lastSyncAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </Text>
              <Badge tone="info">Last 30 days</Badge>
            </InlineStack>
          </Card>
        )}

        <Card padding="0">
          <IndexTable
            resourceName={{
              singular: "vendor",
              plural: "vendors",
            }}
            itemCount={metrics.length}
            headings={[
              { title: "Vendor" },
              { title: "Revenue" },
              { title: "Orders" },
              { title: "Avg Order Value" },
              { title: "Products" },
              { title: "Top Product" },
            ]}
            selectable={false}
          >
            {rowMarkup}
          </IndexTable>
        </Card>

        {metrics.length === 0 && !needsSync && (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                No vendor data yet
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Sync your data to see vendor analytics, or make some sales with
                products from different vendors.
              </Text>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
