"use client";

import { useEffect } from "react";

const FIELD_RULES = [
  { label: "Listing title", message: "Please enter a listing title." },
  { label: "Property type", message: "Please enter the property type." },
  { label: "City", message: "Please enter the city." },
  { label: "Locality / Sector", message: "Please enter the locality or sector." },
] as const;

function findField(form: HTMLFormElement, labelText: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  const labels = Array.from(form.querySelectorAll("label"));
  const label = labels.find((item) => item.textContent?.trim() === labelText);
  const control = label?.nextElementSibling;
  return control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement
    ? control
    : null;
}

function getPriceField(form: HTMLFormElement) {
  const label = Array.from(form.querySelectorAll("label")).find((item) => {
    const text = item.textContent?.trim() || "";
    return text === "Sale price (₹)" || text === "Monthly rent (₹)";
  });
  const control = label?.nextElementSibling;
  return {
    field: control instanceof HTMLInputElement ? control : null,
    message: label?.textContent?.trim() === "Monthly rent (₹)" ? "Please enter the monthly rent." : "Please enter the sale price.",
  };
}

function showError(field: HTMLElement, message: string) {
  field.classList.add("!border-[#dc6b6b]", "!ring-2", "!ring-[#dc6b6b]/10");
  field.setAttribute("aria-invalid", "true");
  let error = field.parentElement?.querySelector<HTMLElement>("[data-field-error]");
  if (!error) {
    error = document.createElement("p");
    error.dataset.fieldError = "true";
    error.className = "mt-2 text-xs font-semibold text-[#b34f4f]";
    field.parentElement?.appendChild(error);
  }
  error.textContent = message;
}

function clearError(field: HTMLElement) {
  field.classList.remove("!border-[#dc6b6b]", "!ring-2", "!ring-[#dc6b6b]/10");
  field.removeAttribute("aria-invalid");
  field.parentElement?.querySelector("[data-field-error]")?.remove();
}

export default function PostPropertyValidation() {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>('form.mt-8.space-y-6');
    if (!form) return;

    const requiredFields = FIELD_RULES.map((rule) => ({ ...rule, field: findField(form, rule.label) })).filter(
      (item): item is typeof item & { field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement } => Boolean(item.field),
    );
    const priceRule = getPriceField(form);

    const validate = () => {
      let firstInvalid: HTMLElement | null = null;
      let valid = true;

      for (const item of requiredFields) {
        if (!item.field.value.trim()) {
          showError(item.field, item.message);
          if (!firstInvalid) firstInvalid = item.field;
          valid = false;
        } else {
          clearError(item.field);
        }
      }

      if (priceRule.field) {
        if (!priceRule.field.value.trim()) {
          showError(priceRule.field, priceRule.message);
          if (!firstInvalid) firstInvalid = priceRule.field;
          valid = false;
        } else {
          clearError(priceRule.field);
        }
      }

      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => firstInvalid?.focus({ preventScroll: true }), 250);
      }

      return valid;
    };

    const handleSubmit = (event: Event) => {
      if (!validate()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleFieldChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      if (target.getAttribute("aria-invalid") === "true" && target.value.trim()) clearError(target);
    };

    form.addEventListener("submit", handleSubmit, true);
    form.addEventListener("input", handleFieldChange);
    form.addEventListener("change", handleFieldChange);

    return () => {
      form.removeEventListener("submit", handleSubmit, true);
      form.removeEventListener("input", handleFieldChange);
      form.removeEventListener("change", handleFieldChange);
    };
  }, []);

  return null;
}
