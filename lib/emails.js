// Email templates (ack to registrant, alert to team). Layout follows the Brand Manual "email concept" (p.30):
// beige canvas, white card, ivory header band with Ribbon W + wordmark, ember eyebrow, ink headline, ink footer band.
// Pure functions: used by functions/api/register.js and by scripts/preview-emails.mjs.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FONT = "Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const HEAD = "Manrope,Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

function shell({ base, preheader, eyebrow, title, body, footerNote }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F1EDE7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F1EDE7;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EDE7;"><tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#FFFFFF;border-radius:18px;overflow:hidden;">
    <tr><td style="background:#FFF8F0;padding:22px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;"><img src="${base}/img/email-logo.png" width="52" height="25" alt="" style="display:block;border:0;"></td>
        <td style="vertical-align:middle;padding-left:10px;font-family:${HEAD};font-weight:800;font-size:20px;letter-spacing:-0.02em;color:#202736;">WarmTempo</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 28px 8px 28px;font-family:${FONT};color:#202736;">
      <div style="font-size:11px;line-height:1.3;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#B14C34;">${esc(eyebrow)}</div>
      <h1 style="margin:10px 0 18px 0;font-family:${HEAD};font-weight:800;font-size:26px;line-height:1.2;letter-spacing:-0.02em;color:#202736;">${esc(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="background:#202736;padding:18px 28px;font-family:${FONT};font-size:13px;color:#FFFFFF;">Keep stories moving. &nbsp;&middot;&nbsp; <a href="https://warmtempo.com" style="color:#FFFFFF;text-decoration:none;">warmtempo.com</a></td></tr>
  </table>
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;"><tr><td style="padding:16px 8px;font-family:${FONT};font-size:12px;line-height:1.5;color:#596073;text-align:center;">${footerNote}</td></tr></table>
</td></tr></table></body></html>`;
}

const P = (t) => `<p style="margin:0 0 14px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:#202736;">${t}</p>`;

export function ackEmail(v, { base = 'https://warmtempo.com' } = {}) {
  const name = v.firstName || 'there';
  const subject = 'Thanks for reaching out to WarmTempo';
  const html = shell({
    base, preheader: 'We’ve received your interest and will be in touch if your project fits the next phase.',
    eyebrow: 'Managed production enquiry', title: 'Thanks for sharing your idea.',
    body:
      P(`Hello ${esc(name)},`) +
      P('Thanks for your interest in WarmTempo. We’re reviewing the details of your video project and will get back to you with the next steps for discussing your requirements and a suitable production plan.') +
      P('Before production begins, we’ll confirm the agreed scope, deliverables, pricing and revision terms. Registering interest is not a purchase, and no payment or commitment is required.') +
      P('Questions? Just reply to this email.') +
      `<p style="margin:22px 0 24px 0;font-family:${FONT};font-size:15px;line-height:1.6;color:#202736;">Warm regards,<br><strong>The WarmTempo Team</strong></p>`,
    footerNote: 'You received this because someone registered interest at warmtempo.com using this email address. If that wasn’t you, you can ignore this message or write to <a href="mailto:hello@warmtempo.com" style="color:#596073;">hello@warmtempo.com</a>.<br>WarmTempo is operated by Lucalvry LLC, 30 N Gould St, Ste R, Sheridan, WY 82801, United States.',
  });
  const text = `Hello ${name},\n\nThanks for your interest in WarmTempo. We're reviewing the details of your video project and will get back to you with the next steps for discussing your requirements and a suitable production plan.\n\nBefore production begins, we'll confirm the agreed scope, deliverables, pricing and revision terms. Registering interest is not a purchase, and no payment or commitment is required.\n\nQuestions? Just reply to this email.\n\nWarm regards,\nThe WarmTempo Team\n\nKeep stories moving.\nhttps://warmtempo.com\n\n--\nYou received this because someone registered interest at warmtempo.com using this email address. If that wasn't you, you can ignore this message or write to hello@warmtempo.com.\nWarmTempo is operated by Lucalvry LLC, 30 N Gould St, Ste R, Sheridan, WY 82801, United States.`;
  return { subject, html, text };
}

export function notifyEmail(v, { id, now, marketing, base = 'https://warmtempo.com' } = {}) {
  const who = `${v.firstName} ${v.lastName}`.trim();
  const rows = [['Name', who], ['Email', v.email], ['Phone', v.phone], ['WhatsApp', v.whatsapp], ['Country', v.country], ['Interested in', v.interest], ['Platform', v.platform], ['Content type', v.type], ['Starting with', v.starting], ['Marketing updates', marketing ? 'Yes, opted in' : 'No'], ['Brief', v.brief]];
  const subject = `New WarmTempo registration: ${who || v.email}`;
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows.map(([k, x]) =>
    `<tr><td style="padding:9px 14px 9px 0;border-top:1px solid #E7E2DA;font-family:${FONT};font-size:13px;color:#596073;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:9px 0;border-top:1px solid #E7E2DA;font-family:${FONT};font-size:15px;line-height:1.5;color:#202736;white-space:pre-wrap;word-break:break-word;">${x ? esc(x) : '<span style="color:#9aa0ad;">–</span>'}</td></tr>`).join('')}</table>`;
  const html = shell({
    base, preheader: `${who || v.email} registered interest${v.interest ? ': ' + v.interest : ''}.`,
    eyebrow: 'New registration', title: who || v.email,
    body: table + `<p style="margin:20px 0 24px 0;font-family:${FONT};font-size:14px;line-height:1.6;color:#3B4355;">Reply to this email to answer ${esc(v.firstName || 'them')} directly; your reply goes to ${esc(v.email)}.</p>`,
    footerNote: `Lead #${esc(id)} &middot; ${esc(now)} &middot; stored in the warmtempo-leads database.`,
  });
  const text = rows.map(([k, x]) => `${k}: ${x || '-'}`).join('\n') + `\n\nReply to this email to answer them directly.\nLead #${id} · ${now}`;
  return { subject, html, text };
}
