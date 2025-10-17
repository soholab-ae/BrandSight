import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineGrid,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return json({
    shop: session.shop,
    message: "Welcome to BrandSight - Brand Analytics for Shopify",
  });
};

export default function DashboardPage() {
  const { shop, message } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="4">
              <Text variant="headingLg" as="h2">
                {message}
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Connected to: {shop}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 3 }} gap="4">
            <Card>
              <BlockStack gap="2">
                <Text variant="headingMd" as="h3">
                  Total Revenue
                </Text>
                <Text variant="heading2xl" as="p">
                  $0.00
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Across all brands
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="2">
                <Text variant="headingMd" as="h3">
                  Total Orders
                </Text>
                <Text variant="heading2xl" as="p">
                  0
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  All time
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="2">
                <Text variant="headingMd" as="h3">
                  Brands Tracked
                </Text>
                <Text variant="heading2xl" as="p">
                  0
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Active vendors
                </Text>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd" as="h3">
                Getting Started
              </Text>
              <Text variant="bodyMd" as="p">
                BrandSight will automatically sync your products and orders to provide detailed brand-specific analytics.
              </Text>
              <Text variant="bodyMd" as="p">
                Data synchronization will begin shortly. Check back in a few minutes to see your analytics.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}