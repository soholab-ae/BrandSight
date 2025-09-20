import { BillingInterval, BillingReplacementBehavior } from '@shopify/shopify-api';

// Type definitions
export type PlanName = 'Starter' | 'Growth' | 'Scale';

type PlanFeatures = {
  vendorLimit: number;
  dataHistoryDays: number;
  features: string[];
  displayFeatures: string[];
};

type BillingConfig = {
  amount: number;
  currencyCode: string;
  interval: BillingInterval;
  trialDays: number;
  replacementBehavior: BillingReplacementBehavior;
  test: boolean;
  features: PlanFeatures;
};

// Plan features configuration
export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  "Starter": {
    vendorLimit: 10,
    dataHistoryDays: 90,
    features: ['core-analytics', 'email-support', 'csv-export'],
    displayFeatures: [
      'Up to 10 brands/vendors',
      '90-day data history',
      'Core analytics dashboard', 
      'Email support',
      'CSV export'
    ]
  },
  "Growth": {
    vendorLimit: 50,
    dataHistoryDays: 365,
    features: ['advanced-analytics', 'priority-support', 'custom-reports', 'csv-export', 'excel-export'],
    displayFeatures: [
      'Up to 50 brands/vendors',
      '1-year data history',
      'Advanced analytics',
      'Priority support', 
      'Custom reports',
      'Excel export'
    ]
  },
  "Scale": {
    vendorLimit: -1, // Unlimited
    dataHistoryDays: 1825, // 5 years
    features: ['advanced-analytics', 'priority-support', 'custom-reports', 'white-label-reports', 'csv-export', 'excel-export'],
    displayFeatures: [
      'Unlimited brands/vendors',
      '5-year data history',
      'White-label reports',
      'Priority support',
      'Custom reports',
      'Excel export'
    ]
  }
};

// Billing configuration for the Shopify app
export const BILLING_CONFIG: Record<PlanName, BillingConfig> = {
  "Starter": {
    amount: 49.00,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 3,
    replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    test: process.env.NODE_ENV === 'development',
    features: PLAN_FEATURES.Starter
  },
  "Growth": {
    amount: 99.00,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 3,
    replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    test: process.env.NODE_ENV === 'development',
    features: PLAN_FEATURES.Growth
  },
  "Scale": {
    amount: 199.00,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 3,
    replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    test: process.env.NODE_ENV === 'development',
    features: PLAN_FEATURES.Scale
  }
};

// Get available plans
export function getAvailablePlans() {
  return (Object.keys(BILLING_CONFIG) as PlanName[]).map(planName => ({
    name: planName,
    amount: BILLING_CONFIG[planName].amount,
    currencyCode: BILLING_CONFIG[planName].currencyCode,
    trialDays: BILLING_CONFIG[planName].trialDays,
    features: BILLING_CONFIG[planName].features
  }));
}

// Check if a plan has a specific feature
export function planHasFeature(planName: string, feature: string): boolean {
  if (!(planName in BILLING_CONFIG)) {
    return false;
  }
  const plan = BILLING_CONFIG[planName as PlanName];
  if (!plan || !plan.features || !plan.features.features) {
    return false;
  }
  return plan.features.features.includes(feature);
}

// Get plan restrictions
export function getPlanRestrictions(planName: string) {
  if (!(planName in BILLING_CONFIG)) {
    return null;
  }
  const plan = BILLING_CONFIG[planName as PlanName];
  if (!plan) return null;
  
  return {
    vendorLimit: plan.features.vendorLimit,
    dataHistoryDays: plan.features.dataHistoryDays,
    features: plan.features.features
  };
}

// Get plan restrictions for a store (utility function for service layer)
export async function getStorePlanRestrictions(storeId: string) {
  try {
    const useShopifyAuth = process.env.USE_SHOPIFY_AUTH === 'true';
    let userPlan = 'Starter'; // Default plan
    
    if (useShopifyAuth) {
      try {
        // Get store to find the user session
        const { storage } = await import('./storage');
        const store = await storage.getStore(storeId);
        
        if (store && store.accessToken) {
          // Create session-like object for subscription check
          const session = {
            shop: store.domain,
            accessToken: store.accessToken
          };
          
          const subscriptionStatus = await checkActiveSubscription(session);
          if (subscriptionStatus.hasActiveSubscription && subscriptionStatus.subscription) {
            userPlan = subscriptionStatus.subscription.name;
          }
        }
      } catch (error) {
        console.warn('Failed to check subscription status for store plan restrictions:', error);
        // Continue with default plan
      }
    }

    // Get plan features and restrictions
    const planFeatures = (userPlan in PLAN_FEATURES) ? PLAN_FEATURES[userPlan as PlanName] : PLAN_FEATURES.Starter;
    
    return {
      planName: userPlan,
      vendorLimit: planFeatures.vendorLimit,
      dataHistoryDays: planFeatures.dataHistoryDays,
      features: planFeatures.features,
      canAddVendor: (currentCount: number) => {
        return planFeatures.vendorLimit === -1 || currentCount < planFeatures.vendorLimit;
      },
      canAccessData: (date: Date) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - planFeatures.dataHistoryDays);
        return date >= cutoffDate;
      },
      hasFeature: (feature: string) => {
        return planFeatures.features.includes(feature);
      }
    };
  } catch (error) {
    console.error('Error getting store plan restrictions:', error);
    // Return default plan restrictions on error
    const planFeatures = PLAN_FEATURES.Starter;
    return {
      planName: 'Starter',
      vendorLimit: planFeatures.vendorLimit,
      dataHistoryDays: planFeatures.dataHistoryDays,
      features: planFeatures.features,
      canAddVendor: (currentCount: number) => {
        return planFeatures.vendorLimit === -1 || currentCount < planFeatures.vendorLimit;
      },
      canAccessData: (date: Date) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - planFeatures.dataHistoryDays);
        return date >= cutoffDate;
      },
      hasFeature: (feature: string) => {
        return planFeatures.features.includes(feature);
      }
    };
  }
}

// Create plan enforcement middleware
export function createPlanEnforcementMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      // Skip enforcement for demo mode
      if (req.isDemoMode || req.user?.isDemoMode) {
        req.planRestrictions = {
          planName: 'Demo',
          vendorLimit: -1, // Unlimited for demo
          dataHistoryDays: 1825, // 5 years for demo
          features: ['core-analytics', 'advanced-analytics', 'custom-reports', 'csv-export', 'excel-export'],
          canAddVendor: () => true,
          canAccessData: () => true,
          hasFeature: () => true
        };
        return next();
      }

      // Get user's current plan
      const useShopifyAuth = process.env.USE_SHOPIFY_AUTH === 'true';
      let userPlan = 'Starter'; // Default plan
      
      if (useShopifyAuth) {
        try {
          const session = res.locals.shopify?.session || req.shopifySession;
          if (session) {
            const subscriptionStatus = await checkActiveSubscription(session);
            if (subscriptionStatus.hasActiveSubscription && subscriptionStatus.subscription) {
              userPlan = subscriptionStatus.subscription.name;
            }
          }
        } catch (error) {
          console.warn('Failed to check subscription status for plan enforcement:', error);
          // Continue with default plan
        }
      }

      // Get plan features and restrictions
      const planFeatures = (userPlan in PLAN_FEATURES) ? PLAN_FEATURES[userPlan as PlanName] : PLAN_FEATURES.Starter;
      
      // Create plan restrictions object
      req.planRestrictions = {
        planName: userPlan,
        vendorLimit: planFeatures.vendorLimit,
        dataHistoryDays: planFeatures.dataHistoryDays,
        features: planFeatures.features,
        canAddVendor: (currentCount: number) => {
          return planFeatures.vendorLimit === -1 || currentCount < planFeatures.vendorLimit;
        },
        canAccessData: (date: Date) => {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - planFeatures.dataHistoryDays);
          return date >= cutoffDate;
        },
        hasFeature: (feature: string) => {
          return planFeatures.features.includes(feature);
        }
      };

      // Check specific route restrictions
      const url = req.originalUrl || req.url;
      const method = req.method;

      // Restrict Excel exports to Growth/Scale plans only
      if (url.includes('/export/excel') && !planFeatures.features.includes('excel-export')) {
        return res.status(403).json({
          message: 'Excel export is only available on Growth and Scale plans',
          requiredPlan: 'Growth',
          currentPlan: userPlan,
          upgradeUrl: '/billing'
        });
      }

      // Restrict custom reports to Growth/Scale plans only
      if (url.includes('/reports/custom') && !planFeatures.features.includes('custom-reports')) {
        return res.status(403).json({
          message: 'Custom reports are only available on Growth and Scale plans',
          requiredPlan: 'Growth', 
          currentPlan: userPlan,
          upgradeUrl: '/billing'
        });
      }

      // Check vendor limits for POST/PUT operations
      if ((method === 'POST' || method === 'PUT') && url.includes('/vendors')) {
        try {
          // Get current vendor count for this store
          const { storage } = await import('./storage');
          const storeId = req.params.storeId || req.body.storeId || res.locals.currentStoreId;
          
          if (storeId) {
            const currentVendors = await storage.getStoreVendors(storeId);
            
            // For POST operations, check if we can add a new vendor
            const canAddVendor = planFeatures.vendorLimit === -1 || currentVendors.length < planFeatures.vendorLimit;
            if (method === 'POST' && !canAddVendor) {
              return res.status(403).json({
                message: `Vendor limit exceeded. Your ${userPlan} plan allows up to ${planFeatures.vendorLimit} vendors.`,
                currentCount: currentVendors.length,
                limit: planFeatures.vendorLimit,
                currentPlan: userPlan,
                upgradeUrl: '/billing'
              });
            }
          }
        } catch (error) {
          console.warn('Failed to check vendor limits in middleware:', error);
          // Continue without blocking on error
        }
      }

      next();
    } catch (error) {
      console.error('Plan enforcement middleware error:', error);
      // On error, continue with minimal restrictions to avoid breaking the app
      req.planRestrictions = {
        planName: 'Starter',
        vendorLimit: 10,
        dataHistoryDays: 90,
        features: ['core-analytics', 'csv-export'],
        canAddVendor: () => true,
        canAccessData: () => true,
        hasFeature: (feature: string) => ['core-analytics', 'csv-export'].includes(feature)
      };
      next();
    }
  };
}

// Function to create a billing subscription
export async function createBillingSubscription(
  session: any, 
  planName: string = "Starter"
) {
  try {
    if (!(planName in BILLING_CONFIG)) {
      throw new Error(`Billing plan ${planName} not found`);
    }
    const plan = BILLING_CONFIG[planName as PlanName];

    // Use Shopify's billing API to create subscription
    const client = new (await import('@shopify/shopify-api')).GraphqlClient({
      session,
    });

    const mutation = `
      mutation appSubscriptionCreate(
        $name: String!
        $returnUrl: URL!
        $trialDays: Int
        $test: Boolean
        $lineItems: [AppSubscriptionLineItemInput!]!
      ) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          trialDays: $trialDays
          test: $test
          lineItems: $lineItems
        ) {
          appSubscription {
            id
            status
            name
            test
            trialDays
            currentPeriodEnd
            createdAt
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      name: planName,
      returnUrl: `${process.env.HOST}/api/billing/callback`,
      trialDays: plan.trialDays,
      test: plan.test,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.amount,
                currencyCode: plan.currencyCode
              },
              interval: plan.interval
            }
          }
        }
      ]
    };

    const response = await client.request(mutation, { variables });
    
    if (response.data.appSubscriptionCreate.userErrors.length > 0) {
      console.error('Billing subscription errors:', response.data.appSubscriptionCreate.userErrors);
      throw new Error(response.data.appSubscriptionCreate.userErrors[0].message);
    }

    return {
      subscription: response.data.appSubscriptionCreate.appSubscription,
      confirmationUrl: response.data.appSubscriptionCreate.confirmationUrl
    };
  } catch (error) {
    console.error('Error creating billing subscription:', error);
    throw error;
  }
}

// Function to check if a store has an active subscription
export async function checkActiveSubscription(session: any) {
  try {
    const client = new (await import('@shopify/shopify-api')).GraphqlClient({
      session,
    });

    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            test
            trialDays
            currentPeriodEnd
            createdAt
            lineItems {
              id
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await client.request(query);
    const subscriptions = response.data?.currentAppInstallation?.activeSubscriptions || [];
    
    // Check if there's an active subscription for any of our plans
    const validPlanNames = Object.keys(BILLING_CONFIG);
    const activeSubscription = subscriptions.find((sub: any) => 
      sub.status === 'ACTIVE' && validPlanNames.includes(sub.name)
    );

    return {
      hasActiveSubscription: !!activeSubscription,
      subscription: activeSubscription,
      isInTrial: activeSubscription?.trialDays > 0 && 
                 new Date(activeSubscription.currentPeriodEnd) > new Date()
    };
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      hasActiveSubscription: false,
      subscription: null,
      isInTrial: false
    };
  }
}

// Function to cancel a subscription
export async function cancelSubscription(session: any, subscriptionId: string) {
  try {
    const client = new (await import('@shopify/shopify-api')).GraphqlClient({
      session,
    });

    const mutation = `
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
            cancelledAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await client.request(mutation, {
      variables: { id: subscriptionId }
    });

    if (response.data.appSubscriptionCancel.userErrors.length > 0) {
      throw new Error(response.data.appSubscriptionCancel.userErrors[0].message);
    }

    return response.data.appSubscriptionCancel.appSubscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}