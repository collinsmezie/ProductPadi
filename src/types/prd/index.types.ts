import { DefaultTemplate } from "./defaultPrd.types";

export enum PrdTemplate {
  DEFAULT = "DEFAULT",
}
export interface PRD {
  id: string;
  prdType: "DEFAULT";
  title: string;
  chosenLanguage: string;
  defaultTemplate: DefaultTemplate | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
