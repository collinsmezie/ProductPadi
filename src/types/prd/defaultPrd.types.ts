import {
  DefaultTemplateFunctionalRequirement,
  DefaultTemplateNonFunctionalRequirement,
  DefaultTemplateDependency,
  DefaultTemplateConditionCriteria,
  DefaultTemplatePrdPersonalDetails,
  DefaultTemplatePriorityEffort,
  DefaultTemplateRiskAnalysis,
  DefaultTemplateVersionHistory,
  DefaultTemplateStakeHolders,
  DefaultTemplateProductObjective,
  DefaultTemplateAssumptionsConstraints,
} from "@prisma/client";

export interface AIResponse {
  Overview: string;
  ProductObjectives: string[];
  FunctionalRequirements: string[];
  NonFunctionalRequirements: string[];
  AssumptionsAndConstraints: {
    assumption: string;
    constraint: string;
  }[];
  Dependencies: string[];
  ConditionAndCriteria: {
    condition: string;
    criteria: string;
  }[];
  RiskAnalysis: {
    risk: string;
    mitigation: string;
  }[];
  PriorityAndEffort: {
    requirement: string;
    priority: "High" | "Medium" | "Low";
    estimatedEffort: string;
  }[];
  VersionHistoryAndChangeLog: {
    version: string;
    changes: string[];
  }[];
}

export interface DefaultTemplate {
  id: string;
  overview: string;
  gptFileId?: string | null;
  fileId?: string | null;
  prdPersonalDetails: DefaultTemplatePrdPersonalDetails | null;
  objectives: DefaultTemplateProductObjective[];
  functionalRequirements: DefaultTemplateFunctionalRequirement[];
  nonFunctionalRequirements: DefaultTemplateNonFunctionalRequirement[];
  assumptionsAndConstraints: DefaultTemplateAssumptionsConstraints[]
  dependencies: DefaultTemplateDependency[];
  conditionCriteria: DefaultTemplateConditionCriteria[];
  riskAnalysis: DefaultTemplateRiskAnalysis[];
  priorityEffort: DefaultTemplatePriorityEffort[];
  versionHistory: DefaultTemplateVersionHistory[];
  stakeholders: DefaultTemplateStakeHolders[];
  prdId: string;
  lastOpenedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
