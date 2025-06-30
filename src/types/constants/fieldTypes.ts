export const fieldTypes = [
    "stakeholder",
    "objective",
    "functionalRequirement",
    "nonFunctionalRequirement",
    "assumptionConstraint",
    "dependency",
    "conditionCriteria",
    "riskAnalysis",
    "priorityEffort",
    "versionHistory",
    "prdPersonalDetails",
  ] as const;
  
  export type FieldType = (typeof fieldTypes)[number];
  