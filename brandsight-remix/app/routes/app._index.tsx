import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineGrid,
  Button,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const store = await prisma.store.findFirst({
    where: { domain: session.shop },
  });

  const vendorCount = store
    ? await prisma.vendor.count({ where: { storeId: store.id } })
    : 0;

  const productCount = store
    ? await prisma.product.count({ where: { storeId: store.id } })
    : 0;

  const orderCount = store
    ? await prisma.order.count({ where: { storeId: store.id } })
    : 0;

  return json({
    shop: session.shop,
    hasData: vendorCount > 0 || productCount > 0 || orderCount > 0,
    needsSync: !store?.lastSyncAt,
    stats: {
      vendors: vendorCount,
      products: productCount,
      orders: orderCount,
    },
  });
};

export default function DashboardPage() {
  const { shop, hasData, needsSync, stats } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {needsSync && (
              <Banner
                title="Welcome to BrandSight!"
                tone="info"
                action={{ content: "Sync Now", url: "/app/sync" }}
              >
                <p>
                  Sync your Shopify data to unlock brand-specific analytics,
                  customer loyalty insights, and smart alerts for your store.
                </p>
              </Banner>
            )}

            <Card>
              <BlockStack gap="400">
                <Text variant="headingLg" as="h2">
                  Brand Analytics for {shop}
                </Text>

                {hasData && (
                  <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <Text variant="heading2xl" as="h3">
                          {stats.vendors}
                        </Text>
                        <Text variant="bodyMd" as="p" tone="subdued">
                          Brands Tracked
                        </Text>
                      </BlockStack>
                    </Card>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <Text variant="heading2xl" as="h3">
                          {stats.products}
                        </Text>
                        <Text variant="bodyMd" as="p" tone="subdued">
                          Products Synced
                        </Text>
                      </BlockStack>
                    </Card>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <Text variant="heading2xl" as="h3">
                          {stats.orders}
                        </Text>
                        <Text variant="bodyMd" as="p" tone="subdued">
                          Total Orders
                        </Text>
                      </BlockStack>
                    </Card>
                  </InlineGrid>
                )}

                {!hasData && (
                  <BlockStack gap="300">
                    <Text variant="bodyMd" as="p">
                      BrandSight provides deep brand-specific insights that
                      standard Shopify analytics don't offer:
                    </Text>
                    <ul style={{ paddingLeft: "20px" }}>
                      <li>
                        <Text variant="bodyMd" as="span">
                          📊 Vendor performance comparisons
                        </Text>
                      </li>
                      <li>
                        <Text variant="bodyMd" as="span">
                          📈 Sales analytics by brand
                        </Text>
                      </li>
                      <li>
                        <Text variant="bodyMd" as="span">
                          🏆 Product performance tracking
                        </Text>
                      </li>
                      <li>
                        <Text variant="bodyMd" as="span">
                          ❤️ Customer brand loyalty insights
                        </Text>
                      </li>
                      <li>
                        <Text variant="bodyMd" as="span">
                          🔔 Smart alerts for brand metrics
                        </Text>
                      </li>
                    </ul>
                  </BlockStack>
                )}

                <InlineStack gap="300">
                  <Link to="/app/vendors">
                    <Button variant="primary">View Vendor Analytics</Button>
                  </Link>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Analytics Features
              </Text>
              <BlockStack gap="300">
                <Link to="/app/vendors" style={{ textDecoration: "none" }}>
                  <Button fullWidth textAlign="left" variant="plain">
                    <InlineStack gap="200" blockAlign="center">
                      <span>📊</span>
                      <BlockStack gap="100">
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          Vendor Analytics
                        </Text>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Revenue, orders, and performance by brand
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </Button>
                </Link>

                <Button fullWidth textAlign="left" variant="plain" disabled>
                  <InlineStack gap="200" blockAlign="center">
                    <span>📈</span>
                    <BlockStack gap="100">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Sales Analytics
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Trending data and insights (Coming soon)
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Button>

                <Button fullWidth textAlign="left" variant="plain" disabled>
                  <InlineStack gap="200" blockAlign="center">
                    <span>🏆</span>
                    <BlockStack gap="100">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Product Performance
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Top products by brand (Coming soon)
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Button>

                <Button fullWidth textAlign="left" variant="plain" disabled>
                  <InlineStack gap="200" blockAlign="center">
                    <span>❤️</span>
                    <BlockStack gap="100">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Customer Loyalty
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Brand affinity and repeat purchases (Coming soon)
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Button>

                <Button fullWidth textAlign="left" variant="plain" disabled>
                  <InlineStack gap="200" blockAlign="center">
                    <span>🔔</span>
                    <BlockStack gap="100">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Smart Alerts
                      </Text>
                      <Text variant="bodySm" as="p" tone="subdued">
                        Performance notifications (Coming soon)
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Button>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
