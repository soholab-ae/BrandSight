import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  BlockStack,
  Badge,
  Button,
  InlineStack,
  Banner,
  Modal,
  TextField,
  Select,
  Form,
  FormLayout,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const store = await prisma.store.findFirst({
    where: { domain: session.shop },
  });

  if (!store) {
    return json({
      alerts: [],
      alertRules: [],
      vendors: [],
      store: null,
    });
  }

  const user = await prisma.user.findFirst({
    where: { email: session.shop },
  });

  const alerts = await prisma.alert.findMany({
    where: {
      storeId: store.id,
    },
    include: {
      vendor: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const alertRules = await prisma.alertRule.findMany({
    where: {
      storeId: store.id,
    },
    include: {
      vendor: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const vendors = await prisma.vendor.findMany({
    where: { storeId: store.id },
    orderBy: { name: "asc" },
  });

  return json({
    alerts: alerts.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      message: a.message,
      severity: a.severity,
      vendorName: a.vendor?.name || "All Vendors",
      createdAt: a.createdAt.toISOString(),
      isRead: a.isRead,
      thresholdValue: a.thresholdValue ? Number(a.thresholdValue) : null,
      currentValue: a.currentValue ? Number(a.currentValue) : null,
    })),
    alertRules: alertRules.map((r) => ({
      id: r.id,
      alertType: r.alertType,
      vendorName: r.vendor?.name || "All Vendors",
      thresholdType: r.thresholdType,
      thresholdValue: Number(r.thresholdValue),
      enabled: r.enabled,
    })),
    vendors: vendors.map((v) => ({ id: v.id, name: v.name })),
    store: {
      id: store.id,
      name: store.name,
    },
    userId: user?.id || null,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");

  const store = await prisma.store.findFirst({
    where: { domain: session.shop },
  });

  if (!store) {
    return json({ success: false, error: "Store not found" }, { status: 400 });
  }

  if (action === "markAsRead") {
    const alertId = formData.get("alertId") as string;
    await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
    return json({ success: true });
  }

  if (action === "deleteRule") {
    const ruleId = formData.get("ruleId") as string;
    await prisma.alertRule.delete({
      where: { id: ruleId },
    });
    return json({ success: true });
  }

  if (action === "toggleRule") {
    const ruleId = formData.get("ruleId") as string;
    const enabled = formData.get("enabled") === "true";
    await prisma.alertRule.update({
      where: { id: ruleId },
      data: { enabled },
    });
    return json({ success: true });
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
};

export default function AlertsPage() {
  const { alerts, alertRules, vendors, store, userId } =
    useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [showRuleModal, setShowRuleModal] = useState(false);

  const handleMarkAsRead = (alertId: string) => {
    const formData = new FormData();
    formData.append("action", "markAsRead");
    formData.append("alertId", alertId);
    submit(formData, { method: "post" });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm("Are you sure you want to delete this alert rule?")) {
      const formData = new FormData();
      formData.append("action", "deleteRule");
      formData.append("ruleId", ruleId);
      submit(formData, { method: "post" });
    }
  };

  const handleToggleRule = (ruleId: string, currentEnabled: boolean) => {
    const formData = new FormData();
    formData.append("action", "toggleRule");
    formData.append("ruleId", ruleId);
    formData.append("enabled", (!currentEnabled).toString());
    submit(formData, { method: "post" });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getSeverityTone = (
    severity: string
  ): "critical" | "warning" | "info" => {
    if (severity === "high") return "critical";
    if (severity === "medium") return "warning";
    return "info";
  };

  const alertTypeLabels: Record<string, string> = {
    performance_drop: "Performance Drop",
    performance_spike: "Performance Spike",
    inventory_low: "Low Inventory",
    sales_trend: "Sales Trend",
  };

  const alertsRowMarkup = alerts.map((alert, index) => (
    <IndexTable.Row id={alert.id} key={alert.id} position={index}>
      <IndexTable.Cell>
        <Badge tone={getSeverityTone(alert.severity)}>
          {alert.severity.toUpperCase()}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {alertTypeLabels[alert.alertType] || alert.alertType}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {alert.vendorName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <BlockStack gap="100">
          <Text variant="bodyMd" as="p">
            {alert.message}
          </Text>
          {alert.thresholdValue && alert.currentValue && (
            <Text variant="bodySm" as="p" tone="subdued">
              Threshold: {alert.thresholdValue} | Current: {alert.currentValue}
            </Text>
          )}
        </BlockStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodySm" as="span" tone="subdued">
          {formatDate(alert.createdAt)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {!alert.isRead && (
          <Button size="slim" onClick={() => handleMarkAsRead(alert.id)}>
            Mark as Read
          </Button>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const rulesRowMarkup = alertRules.map((rule, index) => (
    <IndexTable.Row id={rule.id} key={rule.id} position={index}>
      <IndexTable.Cell>
        <Badge tone={rule.enabled ? "success" : "info"}>
          {rule.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {alertTypeLabels[rule.alertType] || rule.alertType}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {rule.vendorName}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" as="span">
          {rule.thresholdType === "percentage" ? `${rule.thresholdValue}%` : rule.thresholdValue}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="200">
          <Button
            size="slim"
            onClick={() => handleToggleRule(rule.id, rule.enabled)}
          >
            {rule.enabled ? "Disable" : "Enable"}
          </Button>
          <Button
            size="slim"
            tone="critical"
            onClick={() => handleDeleteRule(rule.id)}
          >
            Delete
          </Button>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <Page
      title="Smart Alerts"
      subtitle={
        unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : undefined
      }
    >
      <BlockStack gap="500">
        {unreadCount > 0 && (
          <Banner tone="warning" title={`You have ${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}`}>
            <p>Review your alerts below to stay on top of brand performance changes.</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h2">
              Recent Alerts
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              Automatically generated alerts based on your configured rules
            </Text>
          </BlockStack>
        </Card>

        {alerts.length > 0 ? (
          <Card padding="0">
            <IndexTable
              resourceName={{
                singular: "alert",
                plural: "alerts",
              }}
              itemCount={alerts.length}
              headings={[
                { title: "Severity" },
                { title: "Type" },
                { title: "Vendor" },
                { title: "Message" },
                { title: "Time" },
                { title: "Actions" },
              ]}
              selectable={false}
            >
              {alertsRowMarkup}
            </IndexTable>
          </Card>
        ) : (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                No alerts yet
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Alerts will appear here when performance thresholds are met.
                Configure alert rules below to get started.
              </Text>
            </BlockStack>
          </Card>
        )}

        <Card>
          <InlineStack align="space-between">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                Alert Rules
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Configure thresholds for automatic alerts
              </Text>
            </BlockStack>
            <Button variant="primary" disabled>
              Add Rule (Coming Soon)
            </Button>
          </InlineStack>
        </Card>

        {alertRules.length > 0 ? (
          <Card padding="0">
            <IndexTable
              resourceName={{
                singular: "rule",
                plural: "rules",
              }}
              itemCount={alertRules.length}
              headings={[
                { title: "Status" },
                { title: "Alert Type" },
                { title: "Vendor" },
                { title: "Threshold" },
                { title: "Actions" },
              ]}
              selectable={false}
            >
              {rulesRowMarkup}
            </IndexTable>
          </Card>
        ) : (
          <Card>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                No alert rules configured
              </Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                Alert rules will be generated automatically based on your vendor performance patterns.
                Check back after you have some sales data synced.
              </Text>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
