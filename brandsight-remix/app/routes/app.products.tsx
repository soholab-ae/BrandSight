import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  BlockStack,
  Select,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { calculateProductPerformance } from "../services/analytics.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const vendorId = url.searchParams.get("vendor") || undefined;

  const store = await prisma.store.findFirst({
    where: { domain: session.shop },
  });

  if (!store) {
    return json({
      products: [],
      vendors: [],
      selectedVendor: null,
      store: null,
    });
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const products = await calculateProductPerformance(store.id, vendorId, {
    startDate,
    endDate,
  });

  const vendors = await prisma.vendor.findMany({
    where: { storeId: store.id },
    orderBy: { name: "asc" },
  });

  return json({
    products,
    vendors: vendors.map((v) => ({ id: v.id, name: v.name })),
    selectedVendor: vendorId || null,
    store: {
      id: store.id,
      name: store.name,
    },
  });
};

export default function ProductsPage() {
  const { products, vendors, selectedVendor, store } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleVendorChange = (value: string) => {
    if (value === "all") {
      searchParams.delete("vendor");
    } else {
      searchParams.set("vendor", value);
    }
    setSearchParams(searchParams);
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

  const vendorOptions = [
    { label: "All Vendors", value: "all" },
    ...vendors.map((v) => ({ label: v.name, value: v.id })),
  ];

  const rowMarkup = products.map((product, index) => (
    <IndexTable.Row id={product.productId} key={product.productId} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {product.productTitle}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {product.vendor}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatCurrency(product.revenue)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatNumber(product.unitsSold)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatNumber(product.ordersCount)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {formatCurrency(product.avgPrice)}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page title="Product Performance">
      <BlockStack gap="500">
        <Card>
          <InlineStack align="space-between">
            <div style={{ width: "250px" }}>
              <Select
                label="Filter by vendor"
                options={vendorOptions}
                value={selectedVendor || "all"}
                onChange={handleVendorChange}
              />
            </div>
            <Badge tone="info">Last 30 days</Badge>
          </InlineStack>
        </Card>

        <Card padding="0">
          <IndexTable
            resourceName={{
              singular: "product",
              plural: "products",
            }}
            itemCount={products.length}
            headings={[
              { title: "Product" },
              { title: "Vendor" },
              { title: "Revenue" },
              { title: "Units Sold" },
              { title: "Orders" },
              { title: "Avg Price" },
            ]}
            selectable={false}
          >
            {rowMarkup}
          </IndexTable>
        </Card>

        {products.length === 0 && (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                No product data yet
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                {selectedVendor
                  ? "No products found for this vendor in the last 30 days."
                  : "Sync your data to see product performance analytics."}
              </Text>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
