import { BillingInterval, BillingReplacementBehavior } from '@shopify/shopify-api';

// Billing configuration for the Shopify app
export const BILLING_CONFIG = {
  // Standard plan: $49/month with 3-day free trial
  "BrandSight Premium": {
    amount: 49.00,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 3,
    replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    test: process.env.NODE_ENV === 'development', // Use test mode in development
  }
};

// Function to create a billing subscription
export async function createBillingSubscription(
  session: any, 
  planName: string = "BrandSight Premium"
) {
  try {
    const plan = BILLING_CONFIG[planName];
    if (!plan) {
      throw new Error(`Billing plan ${planName} not found`);
    }

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
    
    // Check if there's an active subscription
    const activeSubscription = subscriptions.find((sub: any) => 
      sub.status === 'ACTIVE' && sub.name === 'BrandSight Premium'
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