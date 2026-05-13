import Handlebars from "handlebars";
import Mustache from "mustache";

export type TemplateEngine = "handlebars" | "mustache";

export interface ReportTemplateVars {
  user_name: string;
  from_date: string;
  to_date: string;
  total_revenue: string;
  total_price: string; // profit
  total_expense: string;
  total_fuel: string;
}

/**
 * Renders a report template string using the specified engine.
 * Defaults to Handlebars.
 *
 * Example template (Handlebars / Mustache — same syntax for simple vars):
 *   Hello {{user_name}},
 *   Your monthly profit report for the period {{from_date}} to {{to_date}} is ready.
 *   Total Revenue: ₹{{total_revenue}}
 *   Total Profit: ₹{{total_price}}
 *   Please find the report attached.
 */
export const renderTemplate = (
  template: string,
  vars: ReportTemplateVars,
  engine: TemplateEngine = "handlebars"
): string => {
  if (engine === "mustache") {
    return Mustache.render(template, vars);
  }
  return Handlebars.compile(template)(vars);
};

/** Default WA template body — mirrors the approved Meta template */
export const DEFAULT_WA_TEMPLATE =
  `Hello {{user_name}},\n\n` +
  `Your monthly profit report for the period {{from_date}} to {{to_date}} is ready.\n\n` +
  `Total Revenue: ₹{{total_revenue}}\n` +
  `Total Profit: ₹{{total_price}}\n\n` +
  `Please find the report attached.`;
