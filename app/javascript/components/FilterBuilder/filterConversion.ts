import { type FilterConfig as APIFilterConfig } from "$app/data/segments";

import {
  type FilterConfig as UIFilterConfig,
  type FilterType,
} from "$app/components/server-components/EmailsPage/FilterRow";

export const convertUIFilterToAPI = (
  uiFilter: UIFilterConfig,
): { filter_type: FilterType; config: APIFilterConfig } => {
  const { amount, min_amount, max_amount, days, ...otherValues } = uiFilter.value;

  const operatorMap: Record<string, string> = {
    is_more_than: "is_more_than",
    is_less_than: "is_less_than",
    is_equal_to: "is",
    is_not: "is_not",
    has_bought: "has_bought",
    has_not_yet_bought: "has_not_bought",
    joining: "is_after",
    affiliation: "is_after",
    following: "is_after",
    purchase: "is_after",
    has_opened_in_last: "in_last",
    has_not_opened_in_last: "not_in_last",
    is_affiliated_to: "is",
    is_member_of: "is",
  };

  const apiOperator = operatorMap[uiFilter.operator] || uiFilter.operator || "is";

  const config: APIFilterConfig = {
    ...otherValues,
    ...(amount && { amount: parseFloat(amount) }),
    ...(min_amount && { min_amount_cents: Math.round(parseFloat(min_amount) * 100) }),
    ...(max_amount && { max_amount_cents: Math.round(parseFloat(max_amount) * 100) }),
    ...(days && { days: parseInt(days, 10) }),
  };

  if (apiOperator && apiOperator !== "undefined") {
    config.operator = apiOperator;
  }

  return {
    filter_type: uiFilter.filter_type,
    config,
  };
};

export const convertAPIFilterToUI = (
  apiFilter: { filter_type: FilterType; config: APIFilterConfig },
  filterIndex: number,
): UIFilterConfig => {
  const { operator, amount, amount_cents, min_amount_cents, max_amount_cents, days, ...rest } = apiFilter.config;

  const reverseOperatorMap: Record<string, string> = {
    is_more_than: "is_more_than",
    is_less_than: "is_less_than",
    is: "is_equal_to",
    is_not: "is_not",
    has_bought: "has_bought",
    has_not_bought: "has_not_yet_bought",
    is_after: "joining",
    in_last: "has_opened_in_last",
    not_in_last: "has_not_opened_in_last",
  };

  const uiOperator = reverseOperatorMap[operator || "is"] || operator || "is_equal_to";

  const isValidOperator = (op: string): op is UIFilterConfig["operator"] => {
    const validOperators = [
      "is_more_than",
      "is_less_than",
      "is_equal_to",
      "is_not",
      "has_bought",
      "has_not_yet_bought",
      "joining",
      "has_opened_in_last",
      "has_not_opened_in_last",
    ];
    return validOperators.includes(op);
  };

  return {
    filter_type: apiFilter.filter_type,
    operator: isValidOperator(uiOperator) ? uiOperator : "is_equal_to",
    value: {
      ...rest,
      ...(amount && { amount: amount.toString() }),
      ...(amount_cents && { amount: (amount_cents / 100).toString() }),
      ...(min_amount_cents && { min_amount: (min_amount_cents / 100).toString() }),
      ...(max_amount_cents && { max_amount: (max_amount_cents / 100).toString() }),
      ...(days && { days: days.toString() }),
    },
    connector: filterIndex === 0 ? null : "and",
  };
};
