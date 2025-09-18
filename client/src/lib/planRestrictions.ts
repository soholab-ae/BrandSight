import { PLAN_NAMES, type PlanName } from "@shared/schema";

// Plan feature definitions
export const PLAN_FEATURES = {
  [PLAN_NAMES.STARTER]: {
    vendorLimit: 10,
    dataHistoryDays: 90,
    features: ['core-analytics', 'email-support', 'csv-export']
  },
  [PLAN_NAMES.GROWTH]: {
    vendorLimit: 50,
    dataHistoryDays: 365,
    features: ['advanced-analytics', 'priority-support', 'custom-reports', 'csv-export']
  },
  [PLAN_NAMES.SCALE]: {
    vendorLimit: -1, // Unlimited
    dataHistoryDays: 1825, // 5 years
    features: ['advanced-analytics', 'priority-support', 'custom-reports', 'white-label-reports', 'csv-export']
  }
};

// Plan restriction checker
export class PlanRestrictions {
  constructor(private planName: PlanName | null) {}

  // Check if user can add more vendors
  canAddVendor(currentCount: number): boolean {
    if (!this.planName) return false; // No plan = no access
    
    const limit = PLAN_FEATURES[this.planName].vendorLimit;
    return limit === -1 || currentCount < limit; // -1 means unlimited
  }

  // Check if user can access data from a specific date
  canAccessData(date: Date): boolean {
    if (!this.planName) return false; // No plan = no access
    
    const historyDays = PLAN_FEATURES[this.planName].dataHistoryDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - historyDays);
    
    return date >= cutoffDate;
  }

  // Check if user has a specific feature
  hasFeature(feature: string): boolean {
    if (!this.planName) return false; // No plan = no features
    
    return PLAN_FEATURES[this.planName].features.includes(feature);
  }

  // Get vendor limit for current plan
  getVendorLimit(): number {
    if (!this.planName) return 0;
    return PLAN_FEATURES[this.planName].vendorLimit;
  }

  // Get data history days for current plan  
  getDataHistoryDays(): number {
    if (!this.planName) return 0;
    return PLAN_FEATURES[this.planName].dataHistoryDays;
  }

  // Get all features for current plan
  getFeatures(): string[] {
    if (!this.planName) return [];
    return PLAN_FEATURES[this.planName].features;
  }

  // Check if current plan is at least the specified level
  isAtLeast(requiredPlan: PlanName): boolean {
    if (!this.planName) return false;
    
    const planHierarchy = [PLAN_NAMES.STARTER, PLAN_NAMES.GROWTH, PLAN_NAMES.SCALE];
    const currentLevel = planHierarchy.indexOf(this.planName);
    const requiredLevel = planHierarchy.indexOf(requiredPlan);
    
    return currentLevel >= requiredLevel;
  }

  // Get plan upgrade suggestions
  getUpgradeSuggestion(): string | null {
    if (!this.planName) return 'Subscribe to get started with vendor analytics';
    
    if (this.planName === PLAN_NAMES.STARTER) {
      return 'Upgrade to Growth for 50 vendors and 1-year data history';
    }
    
    if (this.planName === PLAN_NAMES.GROWTH) {
      return 'Upgrade to Scale for unlimited vendors and 5-year data history';
    }
    
    return null; // Scale plan - no upgrades available
  }
}

// Utility function to create plan restrictions from plan name
export function createPlanRestrictions(planName: PlanName | null): PlanRestrictions {
  return new PlanRestrictions(planName);
}

// React hook for plan restrictions
export function usePlanRestrictions(planName: PlanName | null) {
  return createPlanRestrictions(planName);
}