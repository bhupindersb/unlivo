export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function renderUnlivoEmail(input: {
  preheader?: string;
  heading: string;
  intro?: string;
  details?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  const preheader = escapeHtml(input.preheader || input.heading);
  const heading = escapeHtml(input.heading);
  const intro = input.intro || "";
  const details = input.details || "";
  const cta = input.ctaLabel && input.ctaUrl
    ? '<tr><td align="center" style="padding:8px 0 28px"><a href="' + escapeHtml(input.ctaUrl) + '" style="display:inline-block;background:#0bb89b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 24px;border-radius:10px">' + escapeHtml(input.ctaLabel) + '</a></td></tr>'
    : "";
  const footer = escapeHtml(input.footer || "You are receiving this email because of activity related to your UNLIVO account.");
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>' + heading + '</title></head><body style="margin:0;padding:0;background:#f2f6f8;font-family:Arial,Helvetica,sans-serif;color:#102638"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + preheader + '</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f6f8;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fff;border:1px solid #e1e9ed;border-radius:18px;overflow:hidden"><tr><td style="background:#071d2d;padding:24px 32px"><a href="https://www.unlivo.com" style="text-decoration:none"><img src="https://www.unlivo.com/unlivo-logo.svg" width="142" alt="UNLIVO" style="display:block;width:142px;height:auto;border:0;outline:none;text-decoration:none;filter:brightness(0) invert(1)"></a></td></tr><tr><td style="padding:34px 32px 10px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#102638">' + heading + '</h1><div style="font-size:15px;line-height:1.75;color:#526575">' + intro + '</div>' + (details ? '<div style="margin:22px 0;background:#f4f8fa;border:1px solid #e6eef1;border-radius:12px;padding:18px;font-size:14px;line-height:1.7;color:#31495a">' + details + '</div>' : '') + '</td></tr>' + cta + '<tr><td style="padding:0 32px 28px"><div style="border-top:1px solid #e8eef1;padding-top:18px;font-size:12px;line-height:1.7;color:#84929c">' + footer + '<br><a href="https://www.unlivo.com" style="color:#087f73;text-decoration:none">www.unlivo.com</a></div></td></tr></table><div style="padding:18px 12px;font-size:11px;color:#9aa6ae">© ' + new Date().getFullYear() + ' UNLIVO. All rights reserved.</div></td></tr></table></body></html>';
}
